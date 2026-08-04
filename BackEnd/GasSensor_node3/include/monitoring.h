#pragma once

// Khởi tạo và cập nhật nút bấm Mute còi
void initBuzzerButton();
void updateBuzzerButton();

// Thu thập và xử lý dữ liệu cảm biến Gas
int sampleGasSensor();
int detectGasState(float temperature, float humidity, int gas, float deltaGas, float gasRelative);

// Điều khiển Còi báo động và LED nhấp nháy
void alertControl(int state);