#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
#include <freertos/task.h>
#include "config.h"
#include "services.h"
#include "monitoring.h"
#include "remote_alerts.h"

namespace
{
    constexpr uint8_t ROOM_COUNT = 3;
    constexpr unsigned long SMS_RETRY_INTERVAL_MS = 30000UL;
    constexpr uint32_t SMS_TASK_STACK_SIZE = 6144;
    constexpr UBaseType_t SMS_TASK_PRIORITY = 1;
    constexpr BaseType_t SMS_TASK_CORE = 0;
    constexpr size_t SMS_TIME_TEXT_SIZE = 24;
    constexpr size_t SYSTEM_SMS_TEXT_SIZE = 160;
    constexpr uint8_t SYSTEM_SMS_QUEUE_SIZE = 4;

    RemoteSnapshot remoteNode1;
    RemoteSnapshot remoteNode2;
    unsigned long lastRemoteFetchTime = 0;

    struct RoomSmsAlert
    {
        const char *deviceId;
        bool pendingSms;
        int queuedGas;
        int queuedState;
        float queuedTemperature;
        float queuedHumidity;
        char queuedTimeText[SMS_TIME_TEXT_SIZE];
        unsigned long lastSmsTime;
        unsigned long lastAttemptTime;
    };

    struct SmsSendJob
    {
        bool systemMessage;
        uint8_t roomIndex;
        const char *deviceId;
        int gas;
        int state;
        float temperature;
        float humidity;
        char timeText[SMS_TIME_TEXT_SIZE];
        char message[SYSTEM_SMS_TEXT_SIZE];
    };

    struct SystemSmsQueue
    {
        bool active;
        char activeMessage[SYSTEM_SMS_TEXT_SIZE];
        unsigned long lastAttemptTime;
        char queuedMessages[SYSTEM_SMS_QUEUE_SIZE][SYSTEM_SMS_TEXT_SIZE];
        uint8_t head;
        uint8_t tail;
        uint8_t count;
    };

    RoomSmsAlert room1Sms = {DEVICE_ID, false, 0, 0, 0.0f, 0.0f, "-", 0, 0};
    RoomSmsAlert room2Sms = {REMOTE_NODE_1_ID, false, 0, 0, 0.0f, 0.0f, "-", 0, 0};
    RoomSmsAlert room3Sms = {REMOTE_NODE_2_ID, false, 0, 0, 0.0f, 0.0f, "-", 0, 0};
    RoomSmsAlert *rooms[ROOM_COUNT] = {&room1Sms, &room2Sms, &room3Sms};
    SystemSmsQueue systemSms = {};

    SemaphoreHandle_t smsAlertMutex = nullptr;
    TaskHandle_t smsTaskHandle = nullptr;
    uint8_t nextSmsRoom = 0;

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

    bool smsRetryReady(const RoomSmsAlert &room)
    {
        return room.lastAttemptTime == 0 || millis() - room.lastAttemptTime >= SMS_RETRY_INTERVAL_MS;
    }

    bool systemSmsRetryReady()
    {
        return systemSms.lastAttemptTime == 0 || millis() - systemSms.lastAttemptTime >= SMS_RETRY_INTERVAL_MS;
    }

    bool isDangerState(int state)
    {
        return state == 3 || state == 4;
    }

    bool ensureSmsMutex()
    {
        if (smsAlertMutex != nullptr)
            return true;

        smsAlertMutex = xSemaphoreCreateMutex();
        if (smsAlertMutex == nullptr)
        {
            Serial.println("SMS alert mutex create failed");
            return false;
        }

        return true;
    }

    bool lockSmsAlerts(TickType_t timeoutTicks)
    {
        if (!ensureSmsMutex())
            return false;

        return xSemaphoreTake(smsAlertMutex, timeoutTicks) == pdTRUE;
    }

    void unlockSmsAlerts()
    {
        xSemaphoreGive(smsAlertMutex);
    }

    void queueRoomSmsAlert(RoomSmsAlert &room,
                           bool dataValid,
                           int gas,
                           int state,
                           float temperature,
                           float humidity,
                           const char *timeText)
    {
        if (!dataValid || !isDangerState(state))
            return;

        if (!lockSmsAlerts(pdMS_TO_TICKS(10)))
            return;

        if (!room.pendingSms && !smsCooldownReady(room))
        {
            unlockSmsAlerts();
            return;
        }

        room.pendingSms = true;
        room.queuedGas = gas;
        room.queuedState = state;
        room.queuedTemperature = temperature;
        room.queuedHumidity = humidity;
        snprintf(room.queuedTimeText,
                 sizeof(room.queuedTimeText),
                 "%s",
                 (timeText != nullptr && timeText[0] != '\0') ? timeText : "-");

        unlockSmsAlerts();
    }

    void pushSystemSmsLocked(const char *message)
    {
        if (systemSms.count >= SYSTEM_SMS_QUEUE_SIZE)
        {
            systemSms.head = (systemSms.head + 1) % SYSTEM_SMS_QUEUE_SIZE;
            systemSms.count--;
            Serial.println("System SMS queue full, dropping oldest message");
        }

        snprintf(systemSms.queuedMessages[systemSms.tail],
                 sizeof(systemSms.queuedMessages[systemSms.tail]),
                 "%s",
                 message);
        systemSms.tail = (systemSms.tail + 1) % SYSTEM_SMS_QUEUE_SIZE;
        systemSms.count++;
    }

    void loadNextSystemSmsLocked()
    {
        if (systemSms.active || systemSms.count == 0)
            return;

        snprintf(systemSms.activeMessage,
                 sizeof(systemSms.activeMessage),
                 "%s",
                 systemSms.queuedMessages[systemSms.head]);
        systemSms.head = (systemSms.head + 1) % SYSTEM_SMS_QUEUE_SIZE;
        systemSms.count--;
        systemSms.active = true;
        systemSms.lastAttemptTime = 0;
    }

    bool takeNextSystemSms(SmsSendJob &job)
    {
        if (!lockSmsAlerts(pdMS_TO_TICKS(10)))
            return false;

        loadNextSystemSmsLocked();

        if (!systemSms.active || !systemSmsRetryReady())
        {
            unlockSmsAlerts();
            return false;
        }

        systemSms.lastAttemptTime = millis();
        job.systemMessage = true;
        snprintf(job.message, sizeof(job.message), "%s", systemSms.activeMessage);

        unlockSmsAlerts();
        return true;
    }

    bool takeNextQueuedSms(SmsSendJob &job)
    {
        if (!lockSmsAlerts(pdMS_TO_TICKS(10)))
            return false;

        for (uint8_t i = 0; i < ROOM_COUNT; i++)
        {
            uint8_t index = (nextSmsRoom + i) % ROOM_COUNT;
            RoomSmsAlert &room = *rooms[index];

            if (!room.pendingSms || !smsRetryReady(room))
                continue;

            room.lastAttemptTime = millis();
            nextSmsRoom = (index + 1) % ROOM_COUNT;

            job.systemMessage = false;
            job.roomIndex = index;
            job.deviceId = room.deviceId;
            job.gas = room.queuedGas;
            job.state = room.queuedState;
            job.temperature = room.queuedTemperature;
            job.humidity = room.queuedHumidity;
            snprintf(job.timeText, sizeof(job.timeText), "%s", room.queuedTimeText);

            unlockSmsAlerts();
            return true;
        }

        unlockSmsAlerts();
        return false;
    }

    void markSystemSmsResult(bool sent)
    {
        if (!sent)
            return;

        if (!lockSmsAlerts(portMAX_DELAY))
            return;

        systemSms.active = false;
        systemSms.activeMessage[0] = '\0';
        systemSms.lastAttemptTime = 0;

        unlockSmsAlerts();
    }

    void markSmsSendResult(uint8_t roomIndex, bool sent, unsigned long sentAt)
    {
        if (!sent || roomIndex >= ROOM_COUNT)
            return;

        if (!lockSmsAlerts(portMAX_DELAY))
            return;

        RoomSmsAlert &room = *rooms[roomIndex];
        room.pendingSms = false;
        room.lastSmsTime = sentAt != 0 ? sentAt : millis();
        room.lastAttemptTime = 0;

        unlockSmsAlerts();
    }

    void smsAlertTask(void *parameter)
    {
        (void)parameter;
        Serial.println("SMS alert task started");

        while (true)
        {
            SmsSendJob job;

            if (takeNextSystemSms(job))
            {
                bool sent = sendSystemSms(job.message);
                markSystemSmsResult(sent);
            }
            else if (takeNextQueuedSms(job))
            {
                unsigned long sentAt = 0;
                bool sent = sendAlertSms(job.deviceId,
                                         job.gas,
                                         job.temperature,
                                         job.humidity,
                                         job.timeText,
                                         sentAt,
                                         job.state);
                markSmsSendResult(job.roomIndex, sent, sentAt);
            }
            else
            {
                pollAlertModule();
            }

            vTaskDelay(pdMS_TO_TICKS(200));
        }
    }
}

void queueSystemSms(const char *message)
{
    if (message == nullptr || message[0] == '\0')
        return;

    if (!lockSmsAlerts(pdMS_TO_TICKS(20)))
    {
        Serial.println("System SMS queue busy, message not queued");
        return;
    }

    pushSystemSmsLocked(message);
    Serial.print("Queued system SMS: ");
    Serial.println(message);

    unlockSmsAlerts();
}

void fetchRemoteNodes(bool firebaseReady)
{
    if (!firebaseReady)
    {
        remoteNode1.valid = false;
        remoteNode2.valid = false;
        return;
    }

    if (millis() - lastRemoteFetchTime < REMOTE_FETCH_INTERVAL_MS)
        return;

    lastRemoteFetchTime = millis();

    bool node1Ok = readRemoteSnapshot(REMOTE_NODE_1_ID, remoteNode1);
    bool node2Ok = readRemoteSnapshot(REMOTE_NODE_2_ID, remoteNode2);

    if (node1Ok)
    {
        Serial.println("REMOTE NODE 1");
        printRemoteSnapshot(remoteNode1);
    }

    if (node2Ok)
    {
        Serial.println("REMOTE NODE 2");
        printRemoteSnapshot(remoteNode2);
    }

    if (node1Ok || node2Ok)
    {
        Serial.println("----------------------------------------------");
    }
}

void startSmsAlertTask()
{
    if (smsTaskHandle != nullptr)
        return;

    if (!ensureSmsMutex())
        return;

    BaseType_t result = xTaskCreatePinnedToCore(
        smsAlertTask,
        "SmsAlertTask",
        SMS_TASK_STACK_SIZE,
        nullptr,
        SMS_TASK_PRIORITY,
        &smsTaskHandle,
        SMS_TASK_CORE);

    if (result != pdPASS)
    {
        smsTaskHandle = nullptr;
        Serial.println("SMS alert task start failed");
    }
}

void processAllRoomSmsAlerts(int localGas,
                             int localState,
                             float localTemperature,
                             float localHumidity,
                             const tm *localTime)
{
    char localTimeText[SMS_TIME_TEXT_SIZE] = "-";
    if (localTime != nullptr && localTime->tm_year > 0)
        strftime(localTimeText, sizeof(localTimeText), "%H:%M:%S %d/%m/%Y", localTime);

    queueRoomSmsAlert(room1Sms,
                      true,
                      localGas,
                      localState,
                      localTemperature,
                      localHumidity,
                      localTimeText);

    queueRoomSmsAlert(room2Sms,
                      remoteNode1.valid,
                      remoteNode1.gas,
                      remoteNode1.state,
                      remoteNode1.temperature,
                      remoteNode1.humidity,
                      remoteNode1.timeText.length() > 0 ? remoteNode1.timeText.c_str() : localTimeText);

    queueRoomSmsAlert(room3Sms,
                      remoteNode2.valid,
                      remoteNode2.gas,
                      remoteNode2.state,
                      remoteNode2.temperature,
                      remoteNode2.humidity,
                      remoteNode2.timeText.length() > 0 ? remoteNode2.timeText.c_str() : localTimeText);
}
