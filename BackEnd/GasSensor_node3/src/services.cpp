#include <Arduino.h>
#include <WiFi.h>
#include <time.h>
#include <Firebase_ESP_Client.h>
#include "secrets.h"
#include "config.h"
#include "services.h"

#define WIFI_CONNECT_TIMEOUT_MS 15000
#define NTP_SYNC_TIMEOUT_MS 15000

namespace
{
  FirebaseData fbdo;
  FirebaseAuth auth;
  FirebaseConfig config;

  // Các biến đếm sự kiện ngắt/kết nối WiFi bất đồng bộ
  volatile uint32_t wifiDisconnectEventCount = 0;
  volatile uint32_t wifiGotIpEventCount = 0;
  bool wifiEventsRegistered = false;

  // Callback xử lý sự kiện mạng WiFi
  void handleWiFiEvent(WiFiEvent_t event)
  {
    if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED)
    {
      wifiDisconnectEventCount++;
    }
    else if (event == ARDUINO_EVENT_WIFI_STA_GOT_IP)
    {
      wifiGotIpEventCount++;
    }
  }

  // Đăng ký sự kiện WiFi
  void ensureWiFiEvents()
  {
    if (wifiEventsRegistered)
      return;

    WiFi.onEvent(handleWiFiEvent);
    wifiEventsRegistered = true;
  }
}

// Khởi tạo WiFi
bool initWiFi()
{
  Serial.println("=== WiFi Init ===");

  ensureWiFiEvents();
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true, true); // Xóa thông tin AP cũ
  delay(1000);

  WiFi.begin(SSID, PASSWORD);

  Serial.print("Connecting WiFi");

  unsigned long start = millis();

  while (WiFi.status() != WL_CONNECTED)
  {
    if (millis() - start >= WIFI_CONNECT_TIMEOUT_MS)
    {
      Serial.println("\n[FAIL] WiFi timeout");
      return false;
    }

    Serial.print(".");
    delay(500);
  }

  Serial.println();
  Serial.print("[OK] WiFi connected, IP: ");
  Serial.println(WiFi.localIP());

  // Chờ đường truyền mạng ổn định trước khi dùng NTP/Firebase
  delay(2000);

  return true;
}

// Kiểm tra trạng thái kết nối WiFi
bool isWiFiConnected()
{
  return WiFi.status() == WL_CONNECTED;
}

// Lấy số lần ngắt kết nối WiFi
uint32_t getWiFiDisconnectEventCount()
{
  return wifiDisconnectEventCount;
}

// Lấy số lần nhận IP thành công
uint32_t getWiFiGotIpEventCount()
{
  return wifiGotIpEventCount;
}

// Đồng bộ thời gian qua máy chủ NTP
bool initTime()
{
  Serial.println("=== NTP Init ===");

  // Cấu hình múi giờ GMT+7
  configTime(
      7 * 3600,
      0,
      "pool.ntp.org",
      "time.nist.gov",
      "time.google.com");

  struct tm timeinfo;
  Serial.print("Syncing NTP");

  unsigned long start = millis();

  while (true)
  {
    if (getLocalTime(&timeinfo))
    {
      if (timeinfo.tm_year >= (2024 - 1900))
      {
        Serial.println("\n[OK] NTP synced");

        Serial.printf(
            "Time: %02d:%02d:%02d %02d/%02d/%04d\n",
            timeinfo.tm_hour,
            timeinfo.tm_min,
            timeinfo.tm_sec,
            timeinfo.tm_mday,
            timeinfo.tm_mon + 1,
            timeinfo.tm_year + 1900);

        return true;
      }
    }

    if (millis() - start >= NTP_SYNC_TIMEOUT_MS)
    {
      Serial.println("\n[FAIL] NTP timeout");
      return false;
    }

    Serial.print(".");
    delay(500);
  }
}

// Khởi tạo kết nối tới Firebase Realtime Database
void initFirebase()
{
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.signer.tokens.legacy_token = DATABASE_SECRET;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("Firebase Ready");
}

// Tải dữ liệu cảm biến Node 2 lên Firebase
bool uploadData(float temperature,
                float humidity,
                int gas,
                float deltaGas,
                float gasRelative,
                int state,
                const tm &info)
{
  if (!isWiFiConnected() || !Firebase.ready())
    return false;

  // Định dạng ngày: YYYY-MM-DD
  char dateString[16];
  strftime(dateString, sizeof(dateString), "%Y-%m-%d", &info);

  // Định dạng thời gian cho key: HH-MM-SS
  char timeKey[16];
  strftime(timeKey, sizeof(timeKey), "%H-%M-%S", &info);

  // Định dạng chuỗi thời gian hiển thị: HH:MM:SS DD/MM/YYYY
  char timeString[24];
  strftime(timeString, sizeof(timeString), "%H:%M:%S %d/%m/%Y", &info);

  // Đường dẫn lưu lịch sử: /devices/<DEVICE_ID>/<YYYY-MM-DD>/<HH-MM-SS>
  char path[120];
  snprintf(path, sizeof(path), "/devices/%s/%s/%s", DEVICE_ID, dateString, timeKey);

  // Đường dẫn lưu trạng thái mới nhất: /latest_<DEVICE_ID>
  char latestPath[40];
  snprintf(latestPath, sizeof(latestPath), "/latest_%s", DEVICE_ID);

  // 1. Tạo JSON dữ liệu Lịch sử (History)
  FirebaseJson json;
  json.set("temperature", temperature);
  json.set("humidity", humidity);
  json.set("gas", gas);
  json.set("delta_gas", deltaGas);
  json.set("gas_relative", gasRelative);
  json.set("label", state);

  // 2. Tạo JSON dữ liệu Mới nhất (Latest)
  FirebaseJson latestJson;
  latestJson.set("temperature", temperature);
  latestJson.set("humidity", humidity);
  latestJson.set("gas", gas);
  latestJson.set("delta_gas", deltaGas);
  latestJson.set("gas_relative", gasRelative);
  latestJson.set("label", state);
  latestJson.set("time", timeString);

  bool uploadSuccess = true;

  // Ghi đè vào mục /latest_<DEVICE_ID>
  if (!Firebase.RTDB.setJSON(&fbdo, latestPath, &latestJson))
  {
    Serial.println("Latest update failed");
    Serial.println(fbdo.errorReason());
    uploadSuccess = false;
  }

  // Ghi dữ liệu vào mục Lịch sử
  if (Firebase.RTDB.setJSON(&fbdo, path, &json))
  {
    Serial.printf("Upload OK [%s_%s]\n", DEVICE_ID, dateString);
    Serial.print("Time: ");
    Serial.println(timeKey);
    Serial.println("----------------------------------------------");
  }
  else
  {
    Serial.println("Upload Failed");
    Serial.println(fbdo.errorReason());
    uploadSuccess = false;
  }

  return uploadSuccess;
}