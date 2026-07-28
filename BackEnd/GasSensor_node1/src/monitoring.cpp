#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
#include "secrets.h"
#include "config.h"
#include "monitoring.h"
#include "ST7789.h"

extern ST7789 lcd;

namespace
{
  HardwareSerial simSerial(2);
  String feedback;
  bool simReady = false;
  SemaphoreHandle_t simMutex = nullptr;
  volatile bool buzzerMuteRequest = false;
  bool buzzerDangerActive = false;
  bool buzzerMuteActive = false;
  unsigned long buzzerMutedAt = 0;

  bool isBuzzerMuted()
  {
    if (!buzzerMuteActive)
      return false;

    if (millis() - buzzerMutedAt < BUZZER_MUTE_MS)
      return true;

    buzzerMuteActive = false;
    return false;
  }

  // mute buzzer for 5 minutes
  void muteBuzzerForCooldown()
  {
    buzzerMuteActive = true;
    buzzerMutedAt = millis();
    digitalWrite(BUZZER, LOW);

    Serial.println("Buzzer muted for 5 minutes");
  }

  // ISR for buzzer button press
  void IRAM_ATTR handleBuzzerButtonInterrupt()
  {
    buzzerMuteRequest = true;
    digitalWrite(BUZZER, LOW);
  }

  bool ensureSimMutex()
  {
    if (simMutex != nullptr)
      return true;

    simMutex = xSemaphoreCreateMutex();
    if (simMutex == nullptr)
    {
      Serial.println("SIM mutex create failed");
      return false;
    }

    return true;
  }

  bool lockSim(TickType_t timeoutTicks)
  {
    if (!ensureSimMutex())
      return false;

    return xSemaphoreTake(simMutex, timeoutTicks) == pdTRUE;
  }

  void unlockSim()
  {
    if (simMutex != nullptr)
      xSemaphoreGive(simMutex);
  }

  void drainSIMInput(unsigned long quietMs = 50)
  {
    unsigned long lastRead = millis();

    while (millis() - lastRead < quietMs)
    {
      while (simSerial.available())
      {
        simSerial.read();
        lastRead = millis();
      }

      delay(5);
    }
  }

  String readSIMFeedback(unsigned long timeoutMs = 1000, bool printIfEmpty = true)
  {
    unsigned long start = millis();
    feedback = "";

    while (millis() - start < timeoutMs)
    {
      while (simSerial.available())
      {
        char c = (char)simSerial.read();
        feedback += c;
      }
      delay(5);
    }

    if (feedback.length() > 0)
    {
      Serial.println(">> SIM Response:");
      Serial.println(feedback);
    }
    else if (printIfEmpty)
    {
      Serial.println(">> No response");
    }

    return feedback;
  }

  String readSIMFeedbackUntil(const char *token, unsigned long timeoutMs = 1000, bool printIfEmpty = true)
  {
    unsigned long start = millis();
    feedback = "";

    while (millis() - start < timeoutMs)
    {
      while (simSerial.available())
      {
        char c = (char)simSerial.read();
        feedback += c;

        if (feedback.indexOf(token) >= 0)
          break;
      }

      if (feedback.indexOf(token) >= 0)
        break;

      delay(5);
    }

    if (feedback.length() > 0)
    {
      Serial.println(">> SIM Response:");
      Serial.println(feedback);
    }
    else if (printIfEmpty)
    {
      Serial.println(">> No response");
    }

    return feedback;
  }

  bool responseHasOk(const String &response)
  {
    return response.indexOf("OK") >= 0;
  }

  bool responseHasError(const String &response)
  {
    return response.indexOf("ERROR") >= 0 || response.indexOf("+CMS ERROR") >= 0 || response.indexOf("+CME ERROR") >= 0;
  }

  bool responseHasSmsSent(const String &response)
  {
    return response.indexOf("+CMGS:") >= 0 || responseHasOk(response);
  }

  String sendATRead(const char *cmd, unsigned long waitMs = 1000, unsigned long readMs = 1000)
  {
    drainSIMInput();

    Serial.print("<< ");
    Serial.println(cmd);
    simSerial.print(cmd);
    simSerial.print("\r\n");
    delay(waitMs);

    String response = readSIMFeedback(readMs);
    return response;
  }

  bool runSimSetup()
  {
    simReady = false;

    String response = "";
    for (int attempt = 0; attempt < 5; attempt++)
    {
      response = sendATRead("AT", 500, 1500);
      if (responseHasOk(response))
        break;

      delay(1000);
    }

    if (!responseHasOk(response))
    {
      Serial.println("SIM setup failed: AT did not return OK");
      return false;
    }

    sendATRead("ATE0", 500, 1500);
    sendATRead("AT+CMEE=2", 500, 1500);
    sendATRead("AT+CPIN?", 500, 2000);
    sendATRead("AT+CSCS=\"GSM\"", 500, 1500);
    sendATRead("AT+CMGF=1", 500, 1500);
    sendATRead("AT+CNMI=2,2,0,0,0", 500, 1500);

    String deleteResponse = sendATRead("AT+CMGD=1,4", 500, 3000);
    if (responseHasError(deleteResponse))
      Serial.println("SMS storage cleanup skipped. This is not fatal.");

    sendATRead("AT+CLIP=1", 500, 1500);
    sendATRead("AT&W", 500, 2000);
    sendATRead("AT+CSQ", 500, 2000);

    simReady = true;
    return true;
  }

  bool sendSmsMessage(const char *message)
  {
    if (!lockSim(pdMS_TO_TICKS(45000)))
    {
      Serial.println("SMS failed: SIM UART is busy");
      return false;
    }

    bool sent = false;

    do
    {
      if (!simReady && !runSimSetup())
      {
        Serial.println("SMS failed: SIM setup is not ready");
        break;
      }

      Serial.println("<< Send SMS");
      drainSIMInput();

      simSerial.print("AT+CMGS=\"");
      simSerial.print(ALERT_PHONE_NUMBER);
      simSerial.print("\"\r");

      String promptResponse = readSIMFeedbackUntil(">", 5000);
      if (promptResponse.indexOf(">") < 0)
      {
        Serial.println("SMS failed: SIM module did not show SMS prompt");
        break;
      }

      simSerial.print(message);
      delay(100);
      simSerial.write(26);

      String response = readSIMFeedback(30000);
      if (!responseHasSmsSent(response) || responseHasError(response))
      {
        Serial.println("SMS failed: SIM module did not confirm message send");
        break;
      }

      sent = true;
    } while (false);

    unlockSim();
    return sent;
  }
}

void initBuzzerButton()
{
  pinMode(BUZZER_BUTTON_PIN, INPUT_PULLUP);
  attachInterrupt(
      digitalPinToInterrupt(BUZZER_BUTTON_PIN),
      handleBuzzerButtonInterrupt,
      FALLING);

  Serial.printf("Buzzer button ready on GPIO%d\n", BUZZER_BUTTON_PIN);
}

// Cập nhật trạng thái nút nhấn và mute buzzer
void updateBuzzerButton()
{
  static unsigned long lastAcceptedPressAt = 0;
  bool buttonPressed = false;

  // khoá ISR để tránh xung đột với việc đọc nút nhấn
  noInterrupts();
  if (buzzerMuteRequest)
  {
    buzzerMuteRequest = false;
    buttonPressed = true;
  }
  interrupts();

  // nếu ISR bị bỏ lỡ, kiểm tra trực tiếp nút nhấn
  if (digitalRead(BUZZER_BUTTON_PIN) == LOW)
    buttonPressed = true;

  // nếu nút không nhấn hoặc đang trong thời gian mute, bỏ qua
  if (!buttonPressed || isBuzzerMuted())
    return;

  // kiểm tra chống rung nút nhấn
  unsigned long now = millis();
  if (now - lastAcceptedPressAt < BUTTON_DEBOUNCE_MS)
    return;

  // ghi nhận lần nhấn nút hợp lệ và mute buzzer
  lastAcceptedPressAt = now;
  Serial.println("Buzzer button pressed");
  muteBuzzerForCooldown(); // mute buzzer for 5 minutes
}

bool initAlertModule()
{
  ensureSimMutex();
  simSerial.begin(SIM_BAUD_RATE, SERIAL_8N1, SIM_RX_PIN, SIM_TX_PIN);
  delay(1000);

  Serial.printf("Waiting for 4G signal on %lus...\n", SIM_BOOT_WAIT_MS / 1000UL);
  delay(SIM_BOOT_WAIT_MS);

  simReady = runSimSetup();
  if (!simReady)
  {
    Serial.println("SIM module is not responding on UART.");
    return false;
  }
  return true;
}

void pollAlertModule()
{
  if (!simSerial.available())
    return;

  if (!lockSim(0))
    return;

  feedback = "";
  while (simSerial.available())
  {
    feedback += (char)simSerial.read();
  }

  if (feedback.length() > 0)
  {
    Serial.println(">> Async SIM:");
    Serial.println(feedback);
  }

  unlockSim();
}

int sampleGasSensor()
{
  constexpr int sampleCount = 15;
  int samples[sampleCount];

  for (int i = 0; i < sampleCount; i++)
  {
    samples[i] = analogRead(MQ7_PIN);
    delay(3);
  }

  for (int i = 0; i < sampleCount - 1; i++)
  {
    for (int j = i + 1; j < sampleCount; j++)
    {
      if (samples[i] > samples[j])
      {
        int temp = samples[i];
        samples[i] = samples[j];
        samples[j] = temp;
      }
    }
  }

  // Drop the two lowest and two highest samples.
  long total = 0;
  for (int i = 2; i < sampleCount - 2; i++)
  {
    total += samples[i];
  }

  return total / (sampleCount - 4);
}

int detectGasState(float temperature, float humidity, int gas, float deltaGas, float gasRelative)
{
  bool harshEnv = (humidity > 90.0f || temperature > 50.0f || temperature < 0.0f);

  if (harshEnv && gas < GAS_WARNING_THRESHOLD)
    return 4;

  if (gas >= GAS_DANGER_THRESHOLD && (deltaGas > 60.0f || gasRelative > 1.15f))
    return 3;

  if (gas >= GAS_WARNING_THRESHOLD && (deltaGas > 35.0f || gasRelative > 1.07f))
    return 2;

  if (gas >= GAS_SAFE_THRESHOLD || deltaGas > 20.0f || gasRelative > 1.03f)
    return 1;

  return 0;
}

void alertControl(int state)
{
  static unsigned long lastBlink = 0;
  static bool ledState = false;

  if (millis() - lastBlink >= 500)
  {
    lastBlink = millis();
    ledState = !ledState;
  }

  if (state == 2 || state == 3 || state == 4)
    digitalWrite(WARNING_LED, ledState ? HIGH : LOW);
  else
    digitalWrite(WARNING_LED, LOW);

  buzzerDangerActive = (state == 3);

  Serial.printf("Muted=%d\n", isBuzzerMuted());

  if (buzzerDangerActive && !isBuzzerMuted())
  {
    Serial.println("BUZZER HIGH");
    digitalWrite(BUZZER, HIGH);
  }
  else
  {
    Serial.println("BUZZER LOW");
    digitalWrite(BUZZER, LOW);
  }

  Serial.printf("state=%d mute=%d active=%d\n",
                state,
                isBuzzerMuted(),
                buzzerDangerActive);
}

void sendStartupTestSms()
{
  char startupMsg[128];
  snprintf(startupMsg, sizeof(startupMsg), "%s: module SIM da khoi dong thanh cong", DEVICE_ID);
  sendSystemSms(startupMsg);
}

bool sendSystemSms(const char *message)
{
  if (message == nullptr || message[0] == '\0')
    return false;

  return sendSmsMessage(message);
}

bool sendAlertSms(const char *sourceDevice,
                  int gasValue,
                  float temperature,
                  float humidity,
                  const char *timeText,
                  unsigned long &lastSmsTime,
                  int state)
{
  if (lastSmsTime != 0 && millis() - lastSmsTime < SMS_COOLDOWN)
    return false;

  char alertMsg[180];
  snprintf(alertMsg,
           sizeof(alertMsg),
           "CANH BAO GAS! %s S=%d Gas=%d T=%.1fC H=%.1f%% Time=%s",
           sourceDevice,
           state,
           gasValue,
           temperature,
           humidity,
           (timeText != nullptr && timeText[0] != '\0') ? timeText : "-");

  if (!sendSmsMessage(alertMsg))
    return false;

  lastSmsTime = millis();
  return true;
}

bool sendAlertSms(const char *sourceDevice, int gasValue, unsigned long &lastSmsTime, int state)
{
  return sendAlertSms(sourceDevice, gasValue, 0.0f, 0.0f, "-", lastSmsTime, state);
}

bool sendAlertSms(int gasValue, unsigned long &lastSmsTime, int state)
{
  return sendAlertSms(DEVICE_ID, gasValue, lastSmsTime, state);
}

void placeAlertCall(unsigned long &lastCallTime)
{
  if (millis() - lastCallTime < CALL_COOLDOWN)
    return;

  if (!lockSim(pdMS_TO_TICKS(15000)))
  {
    Serial.println("SIM call skipped: SIM UART is busy");
    return;
  }

  if (!simReady && !runSimSetup())
  {
    Serial.println("SIM call skipped: SIM module is not ready");
    unlockSim();
    return;
  }

  Serial.println("<< Call alert");
  simSerial.print("ATD");
  simSerial.print(ALERT_PHONE_NUMBER);
  simSerial.println(";");
  delay(500);
  readSIMFeedback(2000, false);

  delay(SIM_CALL_RING_MS);

  simSerial.println("AT+CHUP");
  delay(500);
  readSIMFeedback(2000, false);

  lastCallTime = millis();
  unlockSim();
}
