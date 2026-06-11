#include <Arduino.h>
#include "config.h"
#include "services.h"
#include "monitoring.h"
#include "remote_alerts.h"

namespace
{
    RemoteSnapshot remoteNode1;
    RemoteSnapshot remoteNode2;
    unsigned long lastRemoteFetchTime = 0;

    struct RoomSmsAlert
    {
        const char *deviceId;
        bool alertFlag;
        unsigned long lastSmsTime;
    };

    RoomSmsAlert room1Sms = {DEVICE_ID, false, 0};
    RoomSmsAlert room2Sms = {REMOTE_NODE_1_ID, false, 0};
    RoomSmsAlert room3Sms = {REMOTE_NODE_2_ID, false, 0};

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
}

void fetchRemoteNodes(bool firebaseReady)
{
    if (!firebaseReady)
        return;

    if (millis() - lastRemoteFetchTime < REMOTE_FETCH_INTERVAL_MS)
        return;

    lastRemoteFetchTime = millis();

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

void processAllRoomSmsAlerts(int localGas, int localState)
{
    processRoomSmsAlert(room1Sms, true, localGas, localState);
    processRoomSmsAlert(room2Sms, remoteNode1.valid, remoteNode1.gas, remoteNode1.state);
    processRoomSmsAlert(room3Sms, remoteNode2.valid, remoteNode2.gas, remoteNode2.state);
}