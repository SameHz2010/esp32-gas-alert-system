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

  bool getRequiredFloat(FirebaseJson &json, const char *key, float &value)
  {
    FirebaseJsonData result;
    json.get(result, key);
    if (!result.success)
      return false;

    if (result.type == "int")
      value = (float)result.to<int>();
    else if (result.type == "double")
      value = (float)result.to<double>();
    else
      value = result.to<float>();

    return true;
  }

  bool getRequiredInt(FirebaseJson &json, const char *key, int &value)
  {
    FirebaseJsonData result;
    json.get(result, key);
    if (!result.success)
      return false;

    value = result.to<int>();
    return true;
  }

  bool getOptionalString(FirebaseJson &json, const char *key, String &value)
  {
    FirebaseJsonData result;
    json.get(result, key);
    if (!result.success)
      return false;

    value = result.to<String>();
    return true;
  }

  bool getOptionalULong(FirebaseJson &json, const char *key, unsigned long &value)
  {
    FirebaseJsonData result;
    json.get(result, key);
    if (!result.success)
      return false;

    value = result.to<unsigned long>();
    return true;
  }
}

bool initWiFi()
{
  Serial.println("=== WiFi Init ===");

  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true, true);
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

  // Let the network settle before Firebase/NTP use.
  delay(2000);

  return true;
}

bool initTime()
{
  Serial.println("=== NTP Init ===");

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

  // Keep date folders sortable.
  char dateString[16];
  strftime(
      dateString,
      sizeof(dateString),
      "%Y-%m-%d",
      &info);

  // Time is the child key inside each date folder.
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

  FirebaseJson json;

  json.set("temperature", temperature);
  json.set("humidity", humidity);
  json.set("gas", gas);
  json.set("delta_gas", deltaGas);
  json.set("gas_relative", gasRelative);
  json.set("label", state);

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

bool readRemoteSnapshot(const char *deviceId, RemoteSnapshot &snapshot)
{
  snapshot.deviceId = deviceId;
  snapshot.timeText = "";
  snapshot.epoch = 0;
  snapshot.temperature = 0.0f;
  snapshot.humidity = 0.0f;
  snapshot.gas = 0;
  snapshot.deltaGas = 0.0f;
  snapshot.gasRelative = 0.0f;
  snapshot.state = 0;
  snapshot.valid = false;

  if (!Firebase.ready())
    return false;

  char path[64];
  snprintf(
      path,
      sizeof(path),
      "/latest_%s",
      deviceId);

  FirebaseJson json;
  if (!Firebase.RTDB.getJSON(&fbdo, path, &json))
  {
    Serial.printf("Read remote failed [%s]\n", path);
    Serial.println(fbdo.errorReason());
    return false;
  }

  bool ok = true;
  ok &= getRequiredFloat(json, "temperature", snapshot.temperature);
  ok &= getRequiredFloat(json, "humidity", snapshot.humidity);
  ok &= getRequiredInt(json, "gas", snapshot.gas);
  ok &= getRequiredFloat(json, "delta_gas", snapshot.deltaGas);
  ok &= getRequiredFloat(json, "gas_relative", snapshot.gasRelative);

  if (!getRequiredInt(json, "label", snapshot.state))
    ok &= getRequiredInt(json, "state", snapshot.state);

  getOptionalString(json, "timestamp", snapshot.timeText);
  getOptionalString(json, "time", snapshot.timeText);
  getOptionalULong(json, "epoch", snapshot.epoch);

  snapshot.valid = ok;
  if (!ok)
    Serial.printf("Remote data invalid [%s]\n", path);

  return ok;
}
