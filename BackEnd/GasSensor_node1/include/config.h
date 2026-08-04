#pragma once

#define MQ7_PIN 34

#define ST7789_CS_PIN 5
#define ST7789_DC_PIN 2
#define ST7789_RST_PIN 4
#define ST7789_BLK_PIN 15

#define LED_DHT20 25
#define LED_WIFI 33
#define LED_SIM 32
#define WARNING_LED 26

#define BUZZER 27
#define BUZZER_BUTTON_PIN 14

#define SDA_PIN 21
#define SCL_PIN 22

#define SIM_RX_PIN 16
#define SIM_TX_PIN 17

#define DEVICE_ID "room_1"
#define REMOTE_NODE_1_ID "room_2"
#define REMOTE_NODE_2_ID "room_3"

constexpr unsigned long SENSOR_WARMUP_MS = 60000UL;
constexpr unsigned long SMS_COOLDOWN = 300000UL;
constexpr unsigned long CALL_COOLDOWN = 600000UL;
constexpr unsigned long LOOP_INTERVAL_MS = 1000UL;
constexpr unsigned long REMOTE_FETCH_INTERVAL_MS = 1000UL;

constexpr unsigned long WIFI_CONNECT_TIMEOUT_MS = 15000UL;
constexpr unsigned long NTP_SYNC_TIMEOUT_MS = 10000UL;

constexpr unsigned long SIM_BOOT_WAIT_MS = 15000UL;
constexpr unsigned long SIM_CALL_RING_MS = 10000UL;
constexpr unsigned long BUZZER_MUTE_MS = 10000UL;
constexpr unsigned long BUTTON_DEBOUNCE_MS = 50UL;
constexpr unsigned long ONLINE_SERVICE_RETRY_MS = 30000UL;
constexpr unsigned long WIFI_LOSS_CONFIRM_MS = 5000UL;

constexpr uint32_t SIM_BAUD_RATE = 9600;

constexpr int GAS_SAFE_THRESHOLD = 650;
constexpr int GAS_WARNING_THRESHOLD = 800;
constexpr int GAS_DANGER_THRESHOLD = 1000;

constexpr bool SEND_TEST_SMS_ON_BOOT = true;
constexpr bool ENABLE_SIM_CALL_ON_DANGER = false;
