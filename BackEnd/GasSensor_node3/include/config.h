#pragma once

// Cấu hình chân Cảm biến & Đèn LED báo hiệu
#define MQ7_PIN 34
#define LED_DHT20 33
#define LED_WIFI 25
#define WARNING_LED 26

// Cấu hình Còi & Nút bấm Mute
#define BUZZER 27
#define BUZZER_BUTTON_PIN 14

// Cấu hình Bus I2C
#define SDA_PIN 21
#define SCL_PIN 22

// Định danh thiết bị
#define DEVICE_ID "room_3"

// Hằng số Thời gian & Chu kỳ
constexpr unsigned long SENSOR_WARMUP_MS = 60000UL;
constexpr unsigned long LOOP_INTERVAL_MS = 1000UL;

constexpr unsigned long WIFI_CONNECT_TIMEOUT_MS = 15000UL;
constexpr unsigned long NTP_SYNC_TIMEOUT_MS = 10000UL;

constexpr unsigned long BUZZER_MUTE_MS = 10000UL; // 5 phút Mute còi
constexpr unsigned long BUTTON_DEBOUNCE_MS = 50UL;
constexpr unsigned long ONLINE_SERVICE_RETRY_MS = 30000UL;
constexpr unsigned long WIFI_LOSS_CONFIRM_MS = 5000UL;

// Ngưỡng cảnh báo Cảm biến Khí Gas
constexpr int GAS_SAFE_THRESHOLD = 650;
constexpr int GAS_WARNING_THRESHOLD = 800;
constexpr int GAS_DANGER_THRESHOLD = 1000;