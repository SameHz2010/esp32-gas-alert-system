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

bool dht_ready = false;
bool wifi_ready = false;
bool time_ready = false;
bool firebase_ready = false;
bool sim_ready = false;

ST7789 lcd(ST7789_CS_PIN, ST7789_DC_PIN, ST7789_RST_PIN, ST7789_BLK_PIN);
 
namespace
{
  bool firebase_initialized = false;
  bool wifi_loss_sms_sent = false;
  bool wifi_loss_pending = false;
  unsigned long last_online_service_attempt = 0;
  unsigned long wifi_loss_detected_at = 0;
  uint32_t seen_wifi_disconnect_events = 0;
  uint32_t seen_wifi_got_ip_events = 0;

  void setWifiLed(bool connected)
  {
    digitalWrite(LED_WIFI, connected ? HIGH : LOW);
  }

  // ngăn sms liên tục khi mất wifi, chỉ gửi 1 lần sms cảnh báo
  void sendWifiLostSmsOnce()
  {
    if (!sim_ready || wifi_loss_sms_sent)
      return;

    wifi_loss_sms_sent = true;
    // đưa vào hàng đợi
    queueSystemSms("CANH BAO: node_1 da mat WiFi, chuyen sang SMS du phong");
  }

  // sms khi init thành công
  void queueStartupSms()
  {
    if (!sim_ready)
      return;

    char startupMsg[128];
    snprintf(startupMsg,
             sizeof(startupMsg),
             "%s: module SIM da khoi dong thanh cong",
             DEVICE_ID);
    queueSystemSms(startupMsg);
  }

  // đồng bộ số lượng sự kiện wifi connect/disconnect
  void syncWiFiEventCounters()
  {
    seen_wifi_disconnect_events = getWiFiDisconnectEventCount();
    seen_wifi_got_ip_events = getWiFiGotIpEventCount();
  }

  // xác nhận mất wifi nếu đã mất trong khoảng thời gian xác nhận
  void beginWifiLossConfirmation(const char *reason)
  {
    if (!wifi_ready)
      return;

    if (!wifi_loss_pending)
    {
      wifi_loss_pending = true;
      wifi_loss_detected_at = millis();
      Serial.print("WiFi loss detected: ");
      Serial.print(reason);
      Serial.println(", confirming...");
    }
  }

  // xác nhận mất wifi nếu đã mất trong khoảng thời gian xác nhận WIFI_LOSS_CONFIRM_MS
  void confirmWifiLossIfDue()
  {
    if (!wifi_loss_pending || !wifi_ready)
      return;

    if (millis() - wifi_loss_detected_at < WIFI_LOSS_CONFIRM_MS)
      return;

    wifi_loss_pending = false;
    wifi_ready = false;
    setWifiLed(false);
    Serial.println("WiFi lost");
    firebase_ready = false;
    sendWifiLostSmsOnce();
  }

  // upload firebase thành công, hủy xác nhận mất wifi nếu đang xác nhận
  void noteOnlineSuccess()
  {
    if (wifi_loss_pending)
      Serial.println("WiFi loss check cancelled: Firebase upload OK");

    wifi_loss_pending = false;
  }

  // upload firebase thất bại, bắt đầu xác nhận mất wifi
  void noteOnlineFailure(const char *reason)
  {
    beginWifiLossConfirmation(reason);
    confirmWifiLossIfDue();
  }

  // đồng bộ trạng thái wifi và các dịch vụ online
  void syncOnlineServices(bool force)
  {
    if (!wifi_ready)
      return;

    unsigned long now = millis();
    if (!force && now - last_online_service_attempt < ONLINE_SERVICE_RETRY_MS)
      return;

    last_online_service_attempt = now;

    if (!firebase_initialized)
    {
      initFirebase();
      firebase_initialized = true;
    }

    if (!time_ready)
      time_ready = initTime();

    firebase_ready = firebase_initialized && wifi_ready;
  }

  void updateWifiState()
  {
    uint32_t disconnectEvents = getWiFiDisconnectEventCount();
    uint32_t gotIpEvents = getWiFiGotIpEventCount();

    // nếu có sự kiện wifi connect, đồng bộ lại trạng thái wifi
    if (gotIpEvents != seen_wifi_got_ip_events)
    {
      seen_wifi_got_ip_events = gotIpEvents;
      wifi_loss_pending = false;

      if (!wifi_ready)
      {
        wifi_ready = true;
        setWifiLed(true);
        Serial.println("WiFi restored");
        wifi_loss_sms_sent = false;
        syncOnlineServices(true);
        return;
      }
    }

    // nếu có sự kiện wifi disconnect, bắt đầu xác nhận mất wifi
    if (disconnectEvents != seen_wifi_disconnect_events)
    {
      seen_wifi_disconnect_events = disconnectEvents;
      beginWifiLossConfirmation("STA_DISCONNECTED event");
    }

    bool connected = isWiFiConnected();

    // nếu wifi đang kết nối, hủy xác nhận mất wifi nếu đang xác nhận
    if (connected)
    {
      if (!wifi_ready)
      {
        wifi_ready = true;
        setWifiLed(true);
        Serial.println("WiFi restored");
        wifi_loss_sms_sent = false;
        syncOnlineServices(true);
        return;
      }

      syncOnlineServices(false);
      return;
    }

    if (!wifi_ready)
    {
      return;
    }

    beginWifiLossConfirmation("WiFi.status disconnected");
    confirmWifiLossIfDue();
  }
}

void setup()
{
  Serial.begin(115200);
  initWaveformDisplay(lcd);

  pinMode(LED_DHT20, OUTPUT);
  pinMode(LED_WIFI, OUTPUT);
  pinMode(LED_SIM, OUTPUT);
  pinMode(WARNING_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  digitalWrite(BUZZER, LOW);
  // Khi nhấn nút, interrupt gọi: handleBuzzerButtonInterrupt()
  initBuzzerButton();
  Serial.println(digitalRead(BUZZER_BUTTON_PIN));

  Wire.begin(SDA_PIN, SCL_PIN);

  dht_ready = dht20_init();

  if (!dht_ready)
  {
    Serial.println("DHT20 Fail");
  }

  digitalWrite(LED_DHT20, dht_ready ? HIGH : LOW);

  Serial.println("Connecting to WiFi once...");
  wifi_ready = initWiFi();
  syncWiFiEventCounters();
  setWifiLed(wifi_ready);

  // khi wifi connect, khởi tạo các dịch vụ online
  if (wifi_ready)
  {
    Serial.println("WiFi connected");
    syncOnlineServices(true);
  }
  else
  {
    Serial.println("WiFi unavailable. System continues with SMS fallback.");
    firebase_ready = false;
  }

  // khởi tạo module SIM và bắt đầu task gửi sms
  sim_ready = initAlertModule();
  if (sim_ready)
  {
    startSmsAlertTask();
    queueStartupSms();
    digitalWrite(LED_SIM, HIGH);
    if (!wifi_ready)
      sendWifiLostSmsOnce();
  }
  else
  {
    Serial.println("SIM module is not ready. SMS fallback disabled.");
  }

  printf("Setup complete\n");
}

void loop()
{
  updateBuzzerButton();

  if (millis() - last_loop_time < LOOP_INTERVAL_MS)
    return;

  last_loop_time = millis();
  updateWifiState();
  fetchRemoteNodes(wifi_ready && firebase_ready);

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
  uint16_t themeCol = (state >= 3) ? COLOR_RED : COLOR_YELLOW;
  uint16_t textCol = (state >= 3) ? COLOR_WHITE : COLOR_BLACK;

  if (state != last_state)
  {
    lcd.fillRect(0, 0, 240, 40, themeCol);
    last_state = state;
  }

  char buf[32];
  sprintf(buf, "GAS: %-4d (S%d)", gas, state);
  lcd.drawString(10, 12, buf, textCol, themeCol);

  sprintf(buf, "%.2fC|%.2f%%", display_temp, display_hum);
  lcd.drawString(125, 12, buf, textCol, themeCol);

  updateWaveform(lcd, gas, state, time_ok ? &timeinfo : nullptr);

  processAllRoomSmsAlerts(gas,
                          state,
                          display_temp,
                          display_hum,
                          time_ok ? &timeinfo : nullptr);

  Serial.println("THONG TIN CAM BIEN");
  Serial.printf("Temp         : %.2f C\n", display_temp);
  Serial.printf("Humidity     : %.2f %%\n", display_hum);
  Serial.printf("Gas          : %d\n", gas);
  Serial.printf("Delta Gas    : %.2f\n", delta_gas);
  Serial.printf("Gas Relative : %.2f\n", gas_relative);
  Serial.printf("State        : %d\n", state);
  if (!dht_ok)
    Serial.println("DHT20        : read failed, using display fallback");
  Serial.println();

  if (!dht_ok || !time_ok || !wifi_ready || !firebase_ready)
    return;

  if (uploadData(temp, hum, gas, delta_gas, gas_relative, state, timeinfo))
    noteOnlineSuccess();
  else
    noteOnlineFailure("Firebase upload failed");
}
