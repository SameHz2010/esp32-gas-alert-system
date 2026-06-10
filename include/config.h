#pragma once

#define MQ2A_PIN 34

#define ST7789_CS_PIN 5
#define ST7789_DC_PIN 2
#define ST7789_RST_PIN 4
#define ST7789_BLK_PIN 15

#define RED_LED 32
#define GREEN_LED 25
#define YELLOW_LED 33

#define BUZZER 27

#define SIM_RX_PIN 16
#define SIM_TX_PIN 17

#define DEVICE_ID "room_1"
#define REMOTE_NODE_1_ID "room_2"
#define REMOTE_NODE_2_ID "room_3"

constexpr unsigned long SENSOR_WARMUP_MS = 60000UL;
constexpr unsigned long SMS_COOLDOWN = 300000UL;
constexpr unsigned long CALL_COOLDOWN = 600000UL;
constexpr unsigned long LOOP_INTERVAL_MS = 1000UL;
constexpr unsigned long REMOTE_FETCH_INTERVAL_MS = 5000UL;
constexpr unsigned long WIFI_CONNECT_TIMEOUT_MS = 15000UL;
constexpr unsigned long NTP_SYNC_TIMEOUT_MS = 10000UL;
constexpr unsigned long SIM_BOOT_WAIT_MS = 15000UL;
constexpr unsigned long SIM_CALL_RING_MS = 10000UL;

constexpr uint32_t SIM_BAUD_RATE = 9600;

constexpr int GAS_SAFE_THRESHOLD = 650;
constexpr int GAS_WARNING_THRESHOLD = 800;
constexpr int GAS_DANGER_THRESHOLD = 1000;

constexpr bool SEND_TEST_SMS_ON_BOOT = true;
constexpr bool ENABLE_SIM_CALL_ON_DANGER = false;
