#include <time.h>
#include "config.h"
#include "dht20.h"
#include "services.h"
#include "monitoring.h"
#include "ST7789.h"
#include "waveform.h"

float gas_prev = 0, gas_avg = 0;
unsigned long last_call_time = 0;
unsigned long last_loop_time = 0;
unsigned long last_remote_fetch_time = 0;
bool wifi_ready = false;
bool time_ready = false;
bool firebase_ready = false;
bool sim_ready = false;

ST7789 lcd(ST7789_CS_PIN, ST7789_DC_PIN, ST7789_RST_PIN, ST7789_BLK_PIN);
RemoteSnapshot remoteNode1;
RemoteSnapshot remoteNode2;

struct RoomSmsAlert
{
  const char *deviceId;
  bool alertFlag;
  unsigned long lastSmsTime;
};

RoomSmsAlert room1Sms = {DEVICE_ID, false, 0};
RoomSmsAlert room2Sms = {REMOTE_NODE_1_ID, false, 0};
RoomSmsAlert room3Sms = {REMOTE_NODE_2_ID, false, 0};

void ensureServices()
{
  if (!wifi_ready)
    wifi_ready = initWiFi();

  if (wifi_ready && !time_ready)
    time_ready = initTime();

  if (wifi_ready && !firebase_ready)
  {
    initFirebase();
    firebase_ready = true;
  }
}

void printRemoteSnapshot(const RemoteSnapshot &snapshot)
{
  if (!snapshot.valid)
    return;

  Serial.printf(
      "Remote [%s] Temp=%.2fC Hum=%.2f%% Gas=%d Delta=%.2f Relative=%.2f State=%d\n",
      snapshot.deviceId.c_str(),
      snapshot.temperature,
      snapshot.humidity,
      snapshot.gas,
      snapshot.deltaGas,
      snapshot.gasRelative,
      snapshot.state);
}

void fetchRemoteNodes()
{
  if (!firebase_ready)
    return;

  if (millis() - last_remote_fetch_time < REMOTE_FETCH_INTERVAL_MS)
    return;

  last_remote_fetch_time = millis();

  bool node1Ok = readRemoteSnapshot(REMOTE_NODE_1_ID, remoteNode1);
  bool node2Ok = readRemoteSnapshot(REMOTE_NODE_2_ID, remoteNode2);

  if (node1Ok || node2Ok)
  {
    Serial.println("REMOTE NODE DATA");
    printRemoteSnapshot(remoteNode1);
    printRemoteSnapshot(remoteNode2);
    Serial.println("----------------------------------------------");
  }
}

bool smsCooldownReady(const RoomSmsAlert &room)
{
  return room.lastSmsTime == 0 || millis() - room.lastSmsTime >= SMS_COOLDOWN;
}

void processRoomSmsAlert(RoomSmsAlert &room, bool dataValid, int gas, int state)
{
  if (!dataValid || state != 3)
  {
    room.alertFlag = false;
    return;
  }

  if (!room.alertFlag && smsCooldownReady(room))
    room.alertFlag = true;

  if (!room.alertFlag)
    return;

  if (sendAlertSms(room.deviceId, gas, room.lastSmsTime, state))
    room.alertFlag = false;
}

void processAllRoomSmsAlerts(int localGas, int localState)
{
  processRoomSmsAlert(room1Sms, true, localGas, localState);
  processRoomSmsAlert(room2Sms, remoteNode1.valid, remoteNode1.gas, remoteNode1.state);
  processRoomSmsAlert(room3Sms, remoteNode2.valid, remoteNode2.gas, remoteNode2.state);
}

// MAIN SETUP VA LOOP
void setup()
{
  Serial.begin(115200);
  pinMode(RED_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  Wire.begin(21, 22);

  if (!dht20_init())
  {
    Serial.println("DHT20 Fail");
  }

  wifi_ready = initWiFi();

  if (wifi_ready)
  {
    time_ready = initTime();
    initFirebase();
    firebase_ready = true;
  }
  else
  {
    Serial.println("System will continue and retry connectivity in loop");
  }

  sim_ready = initAlertModule();

  if (SEND_TEST_SMS_ON_BOOT)
    sendStartupTestSms();

  initWaveformDisplay(lcd);

  printf("Setup complete\n");
}

void loop()
{
  if (millis() - last_loop_time < LOOP_INTERVAL_MS)
    return;

  last_loop_time = millis();
  ensureServices();
  fetchRemoteNodes();
  pollAlertModule();

  float temp, hum;
  int gas = sampleGasSensor();
  struct tm timeinfo;
  bool dht_ok = dht20_read(&temp, &hum);
  bool time_ok = getLocalTime(&timeinfo);
  float display_temp = dht_ok ? temp : 25.0f;
  float display_hum = dht_ok ? hum : 50.0f;

  float delta_gas = gas - gas_prev;
  gas_avg = (gas_avg * 0.9f) + (gas * 0.1f);
  float gas_relative = (gas_avg > 0) ? ((float)gas / gas_avg) : 1.0f;
  gas_prev = (float)gas;

  int state = detectGasState(display_temp, display_hum, gas, delta_gas, gas_relative);
  alertControl(state);

  static int last_state = -1;
  // Bình thường Vàng (Chữ Đen), Cảnh báo Đỏ (Chữ Trắng)
  uint16_t themeCol = (state >= 3) ? COLOR_RED : COLOR_YELLOW;
  uint16_t textCol = (state >= 3) ? COLOR_WHITE : COLOR_BLACK;

  if (state != last_state)
  {
    lcd.fillRect(0, 0, 240, 40, themeCol); // Chỉ xóa nền khi đổi trạng thái
    last_state = state;
  }

  char buf[32];
  // Cập nhật số liệu Gas và State
  sprintf(buf, "GAS: %-4d (S%d)", gas, state);
  lcd.drawString(10, 12, buf, textCol, themeCol);

  // --- THAY ĐỔI TẠI ĐÂY: Hiện 2 chữ số thập phân ---
  // %6.2f giúp cố định độ rộng để số không bị nhảy vị trí khi thay đổi
  sprintf(buf, "%.2fC|%.2f%%", display_temp, display_hum);

  // Có thể cần lùi tọa độ X sang trái một chút (từ 135 hoặc 145 về 125)
  // để đủ chỗ hiện thêm các chữ số thập phân
  lcd.drawString(125, 12, buf, textCol, themeCol);

  // --- Vẽ dạng sóng 60 giây ---
  updateWaveform(lcd, gas, state, &timeinfo);

  if (sim_ready)
    processAllRoomSmsAlerts(gas, state);

  // if (sim_ready && ENABLE_SIM_CALL_ON_DANGER && state == 3)
  //   placeAlertCall(last_call_time);

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
