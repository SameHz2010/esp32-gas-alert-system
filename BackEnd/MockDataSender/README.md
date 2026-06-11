# Mock Data Sender

Sends random sensor readings to Firebase for realtime dashboard testing.

## Run (important)

```bash
cd BackEnd/MockDataSender
npm start
```

Use **`npm start`** — not `npm run` alone (`npm run` only lists scripts).

## Auth setup (required)

Never put a real `databaseSecret` in `config.example.json` or commit it. Copy `config.example.json` to `config.json` locally and fill in your secret there (`config.json` is gitignored).

Firebase returned `Permission denied` without secret. Use one of:

1. **Auto** — keep `BackEnd/GasSensor_node1/include/secrets.h` with `DATABASE_SECRET`
2. **config.json** — set `databaseSecret` (copy from `secrets.h`, not API Key)
3. **Env** — PowerShell:

```powershell
$env:DATABASE_SECRET="your_secret_here"
npm start
```

Create config:

```bash
npm run setup
# then edit config.json → databaseSecret
```

## Config fields

| Field | Description |
|-------|-------------|
| `databaseUrl` | Firebase RTDB URL |
| `databaseSecret` | Legacy DB secret from ESP `secrets.h` |
| `intervalMs` | Default `1000` (1 sec / room) |
| `rooms` | `room_1`, `room_2`, `room_3` |

Stop with `Ctrl+C`.
