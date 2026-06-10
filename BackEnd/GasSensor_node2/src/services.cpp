#include <Arduino.h>
#include <WiFi.h>
#include <time.h>
#include <Firebase_ESP_Client.h>
#include "secrets.h"
#include "config.h"
#include "services.h"

namespace
{
  FirebaseData fbdo;
  FirebaseAuth auth;
  FirebaseConfig config;
}

bool initWiFi()
{
  Serial.println("=== WiFi Init ===");

  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true, true); // clear old state
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

  // cực quan trọng: đợi network ổn định
  delay(2000);

  return true;
}

bool initTime()
{
  Serial.println("=== NTP Init ===");

  // GMT+7
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

void initFirebase()
{
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.signer.tokens.legacy_token = DATABASE_SECRET;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("Firebase Ready");
}

void uploadData(float temperature,
                float humidity,
                int gas,
                float deltaGas,
                float gasRelative,
                int state,
                const tm &info)
{
  if (!Firebase.ready())
    return;

  // Use YYYY-MM-DD so Firebase string sorting matches chronological order
  char dateString[16];
  strftime(
      dateString,
      sizeof(dateString),
      "%Y-%m-%d",
      &info);

  // Use HH-MM-SS as child folder name
  char timeKey[16];
  strftime(
      timeKey,
      sizeof(timeKey),
      "%H-%M-%S",
      &info);

  char path[120];
  snprintf(
      path,
      sizeof(path),
      "/devices/%s/%s/%s",
      DEVICE_ID,
      dateString,
      timeKey);

  char latestPath[40];
  snprintf(
      latestPath,
      sizeof(latestPath),
      "/latest_%s",
      DEVICE_ID);

  FirebaseJson json;

  json.set("temperature", temperature);
  json.set("humidity", humidity);
  json.set("gas", gas);
  json.set("delta_gas", deltaGas);
  json.set("gas_relative", gasRelative);
  json.set("label", state);

  // ghi latest, mỗi lần sẽ ghi đè nên chỉ có 1 JSON
  if (Firebase.RTDB.setJSON(&fbdo, latestPath, &json))
  {
    Serial.println("Latest room2 updated");
  }
  else
  {
    Serial.println("Latest room2 update failed");
    Serial.println(fbdo.errorReason());
  }

  // ghi history như cũ
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
  }
}
