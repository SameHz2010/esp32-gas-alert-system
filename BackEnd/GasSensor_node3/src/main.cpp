#include <time.h>
#include "config.h"
#include "dht20.h"
#include "services.h"
#include "monitoring.h"

float gas_prev = 0, gas_avg = 0;
unsigned long last_loop_time = 0;

bool dht_ready = false;
bool wifi_ready = false;
bool time_ready = false;
bool firebase_ready = false;

namespace
{
  bool firebase_initialized = false;
  bool wifi_loss_pending = false;
  unsigned long last_online_service_attempt = 0;
  unsigned long wifi_loss_detected_at = 0;
  uint32_t seen_wifi_disconnect_events = 0;
  uint32_t seen_wifi_got_ip_events = 0;

  void setWifiLed(bool connected)
  {
    digitalWrite(LED_WIFI, connected ? HIGH : LOW);
  }

  // Đồng bộ số lượng sự kiện wifi connect/disconnect
  void syncWiFiEventCounters()
  {
    seen_wifi_disconnect_events = getWiFiDisconnectEventCount();
    seen_wifi_got_ip_events = getWiFiGotIpEventCount();
  }

  // Xác nhận mất wifi nếu đã mất trong khoảng thời gian xác nhận
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

  // Xác nhận mất wifi nếu vượt quá WIFI_LOSS_CONFIRM_MS
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
  }

  // Upload firebase thành công -> Hủy trạng thái chờ mất WiFi
  void noteOnlineSuccess()
  {
    if (wifi_loss_pending)
      Serial.println("WiFi loss check cancelled: Firebase upload OK");

    wifi_loss_pending = false;
  }

  // Upload firebase thất bại -> Kích hoạt đếm ngược mất WiFi
  void noteOnlineFailure(const char *reason)
  {
    beginWifiLossConfirmation(reason);
    confirmWifiLossIfDue();
  }

  // Đồng bộ trạng thái wifi và các dịch vụ online
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

    // Sự kiện kết nối WiFi lại thành công
    if (gotIpEvents != seen_wifi_got_ip_events)
    {
      seen_wifi_got_ip_events = gotIpEvents;
      wifi_loss_pending = false;

      if (!wifi_ready)
      {
        wifi_ready = true;
        setWifiLed(true);
        Serial.println("WiFi restored");
        syncOnlineServices(true);
        return;
      }
    }

    // Sự kiện ngắt kết nối WiFi
    if (disconnectEvents != seen_wifi_disconnect_events)
    {
      seen_wifi_disconnect_events = disconnectEvents;
      beginWifiLossConfirmation("STA_DISCONNECTED event");
    }

    bool connected = isWiFiConnected();

    if (connected)
    {
      if (!wifi_ready)
      {
        wifi_ready = true;
        setWifiLed(true);
        Serial.println("WiFi restored");
        syncOnlineServices(true);
        return;
      }

      syncOnlineServices(false);
      return;
    }

    if (!wifi_ready)
      return;

    beginWifiLossConfirmation("WiFi.status disconnected");
    confirmWifiLossIfDue();
  }
}

void setup()
{
  Serial.begin(115200);

  // Khởi tạo các chân GPIO Output
  pinMode(LED_DHT20, OUTPUT);
  pinMode(LED_WIFI, OUTPUT);
  pinMode(WARNING_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  digitalWrite(BUZZER, LOW);

  // Khởi tạo ngắt nút bấm Mute Còi
  initBuzzerButton();

  Wire.begin(SDA_PIN, SCL_PIN);

  // Khởi tạo cảm biến DHT20
  dht_ready = dht20_init();
  if (!dht_ready)
  {
    Serial.println("DHT20 Fail");
  }
  digitalWrite(LED_DHT20, dht_ready ? HIGH : LOW);

  // Kết nối WiFi
  Serial.println("Connecting to WiFi once...");
  wifi_ready = initWiFi();
  syncWiFiEventCounters();
  setWifiLed(wifi_ready);

  if (wifi_ready)
  {
    Serial.println("WiFi connected");
    syncOnlineServices(true);
  }
  else
  {
    Serial.println("WiFi unavailable. Node running in offline sensing mode.");
    firebase_ready = false;
  }

  Serial.println("Setup complete for Node 2");
}

void loop()
{
  // Cập nhật trạng thái nút bấm Mute Còi (Ngắt không chặn)
  updateBuzzerButton();

  // Điều phối chu kỳ Loop bằng millis()
  if (millis() - last_loop_time < LOOP_INTERVAL_MS)
    return;

  last_loop_time = millis();

  // Cập nhật trạng thái WiFi
  updateWifiState();

  // Đọc cảm biến
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

  // Đánh giá nguy cơ và Bật/Tắt Còi/LED
  int state = detectGasState(display_temp, display_hum, gas, delta_gas, gas_relative);
  alertControl(state);

  // In thông tin ra Serial
  Serial.println("--- THONG TIN CAM BIEN (NODE 2) ---");
  Serial.printf("Temp         : %.2f C\n", display_temp);
  Serial.printf("Humidity     : %.2f %%\n", display_hum);
  Serial.printf("Gas          : %d\n", gas);
  Serial.printf("Delta Gas    : %.2f\n", delta_gas);
  Serial.printf("Gas Relative : %.2f\n", gas_relative);
  Serial.printf("State        : %d\n", state);
  if (!dht_ok)
    Serial.println("DHT20        : Read failed, using fallback");
  Serial.println();

  // Kiểm tra điều kiện trước khi đẩy Firebase
  if (!dht_ok || !time_ok || !wifi_ready || !firebase_ready)
    return;

  // Upload dữ liệu cảm biến Node 2 lên Firebase
  if (uploadData(temp, hum, gas, delta_gas, gas_relative, state, timeinfo))
    noteOnlineSuccess();
  else
    noteOnlineFailure("Firebase upload failed");
}