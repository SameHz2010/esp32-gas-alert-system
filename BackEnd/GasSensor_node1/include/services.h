#pragma once

#include <Arduino.h>
#include <time.h>

struct RemoteSnapshot
{
    String deviceId;
    String timeText;
    unsigned long epoch;
    float temperature;
    float humidity;
    int gas;
    float deltaGas;
    float gasRelative;
    int state;
    bool valid;
};

bool initWiFi();
bool isWiFiConnected();
uint32_t getWiFiDisconnectEventCount();
uint32_t getWiFiGotIpEventCount();
bool initTime();
void initFirebase();
bool uploadData(float temperature, float humidity, int gas, float deltaGas, float gasRelative, int state, const tm &info);
bool readRemoteSnapshot(const char *deviceId, RemoteSnapshot &snapshot);
