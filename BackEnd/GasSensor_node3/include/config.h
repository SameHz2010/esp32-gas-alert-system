#pragma once

#define MQ7_PIN A0
#define SDA_PIN D2 // GPIO4
#define SCL_PIN D1 // GPIO5
#define RED_LED 15
#define BUZZER 27
#define DEVICE_ID "room_3"

constexpr unsigned long LOOP_INTERVAL_MS = 1000UL;
constexpr unsigned long WIFI_CONNECT_TIMEOUT_MS = 15000UL;
constexpr unsigned long NTP_SYNC_TIMEOUT_MS = 10000UL;

constexpr int GAS_SAFE_THRESHOLD = 650;
constexpr int GAS_WARNING_THRESHOLD = 800;
constexpr int GAS_DANGER_THRESHOLD = 1000;
