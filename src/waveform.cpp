#include "waveform.h"

#define MAX_POINTS 60
#define STEP_X 4
#define WAVE_X 0
#define WAVE_Y 42
#define WAVE_W 240
#define WAVE_H 160

static int gas_history[MAX_POINTS];
static int head = 0;
static int p_count = 0;

static void drawWaveformGrid(ST7789 &lcd)
{
    lcd.drawRect(WAVE_X, WAVE_Y - 2, WAVE_W, WAVE_H + 4, COLOR_WHITE);
    lcd.drawLine(0, 212, 240, 212, COLOR_WHITE);
    lcd.drawString(2, 220, "-60s", 0x7BEF, COLOR_BLACK);
    lcd.drawString(105, 220, "-30s", 0x7BEF, COLOR_BLACK);
}

void initWaveformDisplay(ST7789 &lcd)
{
    lcd.begin();
    lcd.fillScreen(COLOR_BLACK);
    drawWaveformGrid(lcd);

    for (int i = 0; i < MAX_POINTS; i++)
        gas_history[i] = 0;
}

void updateWaveform(ST7789 &lcd, int new_gas_val, int state, struct tm *timeinfo)
{
    // 1. Cập nhật dữ liệu vào bộ đệm vòng
    gas_history[head] = new_gas_val;
    head = (head + 1) % MAX_POINTS;
    if (p_count < MAX_POINTS)
        p_count++;

    // 2. Tìm Min-Max để Auto-Scale (Zoom biên độ)
    int min_val = 4095, max_val = 0;
    for (int i = 0; i < p_count; i++)
    {
        if (gas_history[i] < min_val)
            min_val = gas_history[i];
        if (gas_history[i] > max_val)
            max_val = gas_history[i];
    }

    // Zoom cực đại: Nếu gas ổn định, ép range tối thiểu 20 đơn vị để thấy rõ nhiễu sóng
    int range = (max_val - min_val < 20) ? 20 : (max_val - min_val);

    // 3. CHỈ XÓA VÙNG LÕI (Không xóa khung trắng và nhãn thời gian cố định)
    lcd.fillRect(WAVE_X, WAVE_Y, WAVE_W, WAVE_H, COLOR_BLACK);

    // Vẽ lưới mờ (mỗi 15s = 60px)
    for (int i = 60; i < 240; i += 60)
    {
        lcd.drawLine(i, WAVE_Y, i, WAVE_Y + WAVE_H, 0x1082); // Màu xám tối
    }

    // 4. LOGIC MÀU SẮC: Bình thường Vàng, Cảnh báo (S3) Đỏ
    uint16_t waveColor = (state >= 3) ? COLOR_RED : COLOR_YELLOW;

    // 5. Vẽ đường sóng (Làm dày 2 pixel để nhìn to và rõ hơn)
    for (int i = 0; i < p_count - 1; i++)
    {
        int idx0 = (head - p_count + i + MAX_POINTS) % MAX_POINTS;
        int idx1 = (head - p_count + i + 1 + MAX_POINTS) % MAX_POINTS;

        int x0 = i * STEP_X;
        int x1 = (i + 1) * STEP_X;

        // Tính toán tọa độ Y dựa trên Min-Max hiện tại
        int y0 = WAVE_Y + WAVE_H - ((gas_history[idx0] - min_val) * WAVE_H / range);
        int y1 = WAVE_Y + WAVE_H - ((gas_history[idx1] - min_val) * WAVE_H / range);

        lcd.drawLine(x0, y0, x1, y1, waveColor);
        lcd.drawLine(x0, y0 + 1, x1, y1 + 1, waveColor); // Vẽ thêm 1 đường để làm dày nét
    }

    // 6. Cập nhật số liệu Max/Min ở góc đồ thị (Xóa số cũ bằng màu nền đen)
    char buf[16];
    sprintf(buf, "MAX:%-4d", max_val);
    lcd.drawString(180, WAVE_Y + 5, buf, 0x7BEF, COLOR_BLACK);
    sprintf(buf, "MIN:%-4d", min_val);
    lcd.drawString(180, WAVE_Y + WAVE_H - 15, buf, 0x7BEF, COLOR_BLACK);

    // 7. Cập nhật Giờ NTP (Vùng cố định dưới cùng)
    if (timeinfo->tm_year > 0)
    {
        sprintf(buf, "%02d:%02d:%02d", timeinfo->tm_hour, timeinfo->tm_min, timeinfo->tm_sec);
        lcd.drawString(170, 220, buf, COLOR_CYAN, COLOR_BLACK);
    }
}