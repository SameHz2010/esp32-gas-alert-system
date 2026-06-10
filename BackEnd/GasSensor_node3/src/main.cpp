#include <time.h>
#include "config.h"
#include "dht20.h"
#include "services.h"
#include "monitoring.h"

float gas_prev = 0, gas_avg = 0;
bool wifi_ready = false;
bool time_ready = false;
bool firebase_ready = false;

// MAIN SETUP VA LOOP
void setup()
{
  Serial.begin(115200);
  pinMode(RED_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  Wire.begin(SDA_PIN, SCL_PIN);

  if (!dht20_init())
    Serial.println("DHT20 Fail");

  while (!wifi_ready)
  {
    Serial.println("Connecting to WiFi...");

    wifi_ready = initWiFi();

    if (!wifi_ready)
    {
      Serial.println("WiFi connection failed.");
      Serial.println("SSID not found or password may be incorrect.");
      Serial.println("Retrying...");
    }
  }

  Serial.println("WiFi connected");

  time_ready = initTime();

  initFirebase();
  firebase_ready = true;

  Serial.println("System ready");
}

void loop()
{
  float temp, hum;
  int gas = sampleGasSensor();
  struct tm timeinfo;
  bool dht_ok = dht20_read(&temp, &hum);
  bool time_ok = getLocalTime(&timeinfo);

  float delta_gas = gas - gas_prev;
  gas_avg = (gas_avg * 0.9f) + (gas * 0.1f);
  float gas_relative = (gas_avg > 0) ? ((float)gas / gas_avg) : 1.0f;
  gas_prev = (float)gas;

  int state = dht_ok
                  ? detectGasState(temp, hum, gas, delta_gas, gas_relative)
                  : detectGasState(25.0f, 50.0f, gas, delta_gas, gas_relative);
  alertControl(state);

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