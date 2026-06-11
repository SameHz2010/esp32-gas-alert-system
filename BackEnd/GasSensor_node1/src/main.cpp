#include <time.h>
#include "config.h"
#include "dht20.h"
#include "services.h"
#include "monitoring.h"
#include "ST7789.h"
#include "waveform.h"
#include "remote_alerts.h"

float gas_prev = 0, gas_avg = 0;
unsigned long last_call_time = 0;
unsigned long last_loop_time = 0;
bool wifi_ready = false;
bool time_ready = false;
bool firebase_ready = false;
bool sim_ready = false;

ST7789 lcd(ST7789_CS_PIN, ST7789_DC_PIN, ST7789_RST_PIN, ST7789_BLK_PIN);

// MAIN SETUP VA LOOP
void setup()
{
  Serial.begin(115200);
  pinMode(RED_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  Wire.begin(SDA_PIN, SCL_PIN);

  if (!dht20_init())
  {
    Serial.println("DHT20 Fail");
  }

  digitalWrite(RED_LED, HIGH);
  delay(500);

  while (!wifi_ready)
  {
    Serial.println("Connecting to WiFi...");

    wifi_ready = initWiFi();

    if (!wifi_ready)
    {
      Serial.println("WiFi connection failed.");
      Serial.println("SSID not found or password may be incorrect.");
      Serial.println("Retrying in 3 seconds...");
      delay(3000);
    }
  }

  digitalWrite(YELLOW_LED, HIGH);
  delay(500);

  Serial.println("WiFi connected");

  while (!time_ready)
  {
    Serial.println("Syncing time...");

    time_ready = initTime();

    if (!time_ready)
    {
      Serial.println("Time sync failed.");
      Serial.println("Retrying in 3 seconds...");
      delay(3000);
    }
  }

  digitalWrite(GREEN_LED, HIGH);
  delay(500);

  initFirebase();
  firebase_ready = true;

  // sim_ready = initAlertModule();

  // if (SEND_TEST_SMS_ON_BOOT)
  //   sendStartupTestSms();

  initWaveformDisplay(lcd);

  printf("Setup complete\n");
}

void loop()
{
  if (millis() - last_loop_time < LOOP_INTERVAL_MS)
    return;

  last_loop_time = millis();
  fetchRemoteNodes(firebase_ready);
  pollAlertModule();

  float temp, hum;
  int gas = sampleGasSensor();
  struct tm timeinfo;
  bool dht_ok = dht20_read(&temp, &hum);
  bool time_ok = getLocalTime(&timeinfo);
  float display_temp = dht_ok ? temp : 25.0f;
  float display_hum = dht_ok ? hum : 50.0f;

  float delta_gas = gas - gas_prev;
  gas_avg = (gas_avg * 0.9f) + (gas * 0.1f);
  float gas_relative = (gas_avg > 0) ? ((float)gas / gas_avg) : 1.0f;
  gas_prev = (float)gas;

  int state = detectGasState(display_temp, display_hum, gas, delta_gas, gas_relative);
  alertControl(state);

  static int last_state = -1;
  // Bình thường Vàng (Chữ Đen), Cảnh báo Đỏ (Chữ Trắng)
  uint16_t themeCol = (state >= 3) ? COLOR_RED : COLOR_YELLOW;
  uint16_t textCol = (state >= 3) ? COLOR_WHITE : COLOR_BLACK;

  if (state != last_state)
  {
    lcd.fillRect(0, 0, 240, 40, themeCol); // Chỉ xóa nền khi đổi trạng thái
    last_state = state;
  }

  char buf[32];
  // Cập nhật số liệu Gas và State
  sprintf(buf, "GAS: %-4d (S%d)", gas, state);
  lcd.drawString(10, 12, buf, textCol, themeCol);

  // --- THAY ĐỔI TẠI ĐÂY: Hiện 2 chữ số thập phân ---
  // %6.2f giúp cố định độ rộng để số không bị nhảy vị trí khi thay đổi
  sprintf(buf, "%.2fC|%.2f%%", display_temp, display_hum);

  // Có thể cần lùi tọa độ X sang trái một chút (từ 135 hoặc 145 về 125)
  // để đủ chỗ hiện thêm các chữ số thập phân
  lcd.drawString(125, 12, buf, textCol, themeCol);

  // --- Vẽ dạng sóng 60 giây ---
  updateWaveform(lcd, gas, state, &timeinfo);

  if (sim_ready)
    processAllRoomSmsAlerts(gas, state);

  // if (sim_ready && ENABLE_SIM_CALL_ON_DANGER && state == 3)
  //   placeAlertCall(last_call_time);

  if (dht_ok && time_ok)
  {
    Serial.println("THONG TIN CAM BIEN");

    Serial.printf("Temp         : %.2f C\n", temp);
    Serial.printf("Humidity     : %.2f %%\n", hum);
    Serial.printf("Gas          : %d\n", gas);
    Serial.printf("Delta Gas    : %.2f\n", delta_gas);
    Serial.printf("Gas Relative : %.2f\n", gas_relative);
    Serial.printf("State        : %d\n", state);
    Serial.println();

    uploadData(temp, hum, gas, delta_gas, gas_relative, state, timeinfo);
  }
}
