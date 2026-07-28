#pragma once

#include <time.h>

void fetchRemoteNodes(bool firebaseReady);
void startSmsAlertTask();
void queueSystemSms(const char *message);
void processAllRoomSmsAlerts(int localGas,
                             int localState,
                             float localTemperature,
                             float localHumidity,
                             const tm *localTime);
