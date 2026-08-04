#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
#include "secrets.h"
#include "config.h"
#include "monitoring.h"

namespace
{
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

  // Mute buzzer trong vòng 5 phút (BUZZER_MUTE_MS)
  void muteBuzzerForCooldown()
  {
    buzzerMuteActive = true;
    buzzerMutedAt = millis();
    digitalWrite(BUZZER, LOW);

    Serial.println("Buzzer muted for 5 minutes");
  }

  // ISR xử lý ngắt khi bấm nút mute còi
  void IRAM_ATTR handleBuzzerButtonInterrupt()
  {
    buzzerMuteRequest = true;
    digitalWrite(BUZZER, LOW);
  }
}

// Khởi tạo nút bấm Mute còi
void initBuzzerButton()
{
  pinMode(BUZZER_BUTTON_PIN, INPUT_PULLUP);
  attachInterrupt(
      digitalPinToInterrupt(BUZZER_BUTTON_PIN),
      handleBuzzerButtonInterrupt,
      FALLING);

  Serial.printf("Buzzer button ready on GPIO%d\n", BUZZER_BUTTON_PIN);
}

// Cập nhật trạng thái nút nhấn và xử lý Mute còi
void updateBuzzerButton()
{
  static unsigned long lastAcceptedPressAt = 0;
  bool buttonPressed = false;

  // Khóa ngắt tạm thời để tránh race condition
  noInterrupts();
  if (buzzerMuteRequest)
  {
    buzzerMuteRequest = false;
    buttonPressed = true;
  }
  interrupts();

  // Kiểm tra trực tiếp chân nút nhấn phòng trường hợp bỏ lỡ ISR
  if (digitalRead(BUZZER_BUTTON_PIN) == LOW)
    buttonPressed = true;

  // Nếu nút không nhấn hoặc đang trong thời gian Mute thì bỏ qua
  if (!buttonPressed || isBuzzerMuted())
    return;

  // Chống nảy phím (Debounce)
  unsigned long now = millis();
  if (now - lastAcceptedPressAt < BUTTON_DEBOUNCE_MS)
    return;

  lastAcceptedPressAt = now;
  Serial.println("Buzzer button pressed");
  muteBuzzerForCooldown();
}

// Lọc nhiễu lấy mẫu cảm biến khí Gas MQ-7
int sampleGasSensor()
{
  constexpr int sampleCount = 15;
  int samples[sampleCount];

  // Lấy 15 mẫu
  for (int i = 0; i < sampleCount; i++)
  {
    samples[i] = analogRead(MQ7_PIN);
    delay(3);
  }

  // Sắp xếp Bubble sort
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

  // Lọc Trimmed Mean: Bỏ 2 mẫu nhỏ nhất và 2 mẫu lớn nhất
  long total = 0;
  for (int i = 2; i < sampleCount - 2; i++)
  {
    total += samples[i];
  }

  return total / (sampleCount - 4);
}

// Thuật toán phát hiện trạng thái rò rỉ khí Gas
int detectGasState(float temperature, float humidity, int gas, float deltaGas, float gasRelative)
{
  bool harshEnv = (humidity > 90.0f || temperature > 50.0f || temperature < 10.0f);

  // Môi trường khắc nghiệt
  if (harshEnv && gas < GAS_WARNING_THRESHOLD)
    return 4;

  // Nguy hiểm (State 3)
  if (gas >= GAS_DANGER_THRESHOLD && (deltaGas > 60.0f || gasRelative > 1.15f))
    return 3;

  // Cảnh báo mạnh (State 2)
  if (gas >= GAS_WARNING_THRESHOLD && (deltaGas > 35.0f || gasRelative > 1.02f))
    return 2;

  // Cảnh báo nhẹ (State 1)
  if (gas >= GAS_SAFE_THRESHOLD || deltaGas > 20.0f || gasRelative > 1.03f)
    return 1;

  return 0; // Bình thường
}

// Điều khiển Còi báo động và LED nhấp nháy
void alertControl(int state)
{
  static unsigned long lastBlink = 0;
  static bool ledState = false;

  // LED nhấp nháy chu kỳ 500ms
  if (millis() - lastBlink >= 500)
  {
    lastBlink = millis();
    ledState = !ledState;
  }

  // Các State 2, 3, 4 thì nhấp nháy LED cảnh báo
  if (state == 2 || state == 3 || state == 4)
    digitalWrite(WARNING_LED, ledState ? HIGH : LOW);
  else
    digitalWrite(WARNING_LED, LOW);

  // Chỉ kích hoạt còi báo động khi ở State 3 (Danger)
  buzzerDangerActive = (state == 3);

  // Kiểm tra còi có đang bị Mute hay không
  if (buzzerDangerActive && !isBuzzerMuted())
  {
    digitalWrite(BUZZER, HIGH);
  }
  else
  {
    digitalWrite(BUZZER, LOW);
  }

  Serial.printf("state=%d mute=%d active=%d\n",
                state,
                isBuzzerMuted(),
                buzzerDangerActive);
}