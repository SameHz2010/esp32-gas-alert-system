#pragma once

#include <time.h>
#include <Arduino.h>

// Quản lý kết nối WiFi & Đếm sự kiện ngắt kết nối
bool initWiFi();
bool isWiFiConnected();
uint32_t getWiFiDisconnectEventCount();
uint32_t getWiFiGotIpEventCount();

// Khởi tạo Thời gian (NTP) & Firebase Realtime Database
bool initTime();
void initFirebase();

// Đẩy dữ liệu cảm biến Node 2 lên Firebase
bool uploadData(float temperature,
                float humidity,
                int gas,
                float deltaGas,
                float gasRelative,
                int state,
                const tm &info);