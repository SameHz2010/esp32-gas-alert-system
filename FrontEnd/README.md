# Gas Sensor Dashboard

Next.js real-time dashboard for the ESP32 gas alert system. Reads sensor data from Firebase Realtime Database.

## Stack

- Next.js 15 (App Router)
- Tailwind CSS
- Recharts
- Firebase Realtime Database
- Zustand (session-persisted room buffers)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- 3 room tabs: Room 1, Room 2, Room 3
- Live charts for humidity, temperature, gas, and alert label (60-second window)
- History log with date/time/label/value filters, search, and pagination (10 rows/page)
- Alert border pulse when label is 3 or 4
- Responsive layout for mobile, tablet, and desktop

## Firebase Path

```
/devices/{room_1|room_2|room_3}/{YYYY-MM-DD}/{HH-MM-SS}
```

## Fix `Permission denied` on Dashboard

Mock BE can write (legacy secret), but FE must be allowed to **read** RTDB.

### 1) Realtime Database Rules (required)

Firebase Console → Realtime Database → **Rules**, paste:

```json
{
  "rules": {
    "devices": {
      ".read": true,
      ".write": true
    }
  }
}
```

Publish rules. (File also in `database.rules.json`.)

Deploy via CLI (after `firebase login`):

```bash
npx -y firebase-tools@latest deploy --only database --project sensor-gas-3843e
```

### 2) Enable Anonymous Auth (recommended)

Firebase Console → Authentication → Sign-in method → **Anonymous** → Enable.

FE auto signs in anonymously before reading data.
