import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadConfig() {
  const candidates = ["config.json", "config.example.json"];

  for (const file of candidates) {
    const path = join(__dirname, file);
    if (!existsSync(path)) continue;

    const config = JSON.parse(readFileSync(path, "utf8"));
    console.log(`Using config: ${file}`);
    return config;
  }

  console.error(
    "No config found. Create config.json (or use config.example.json).",
  );
  process.exit(1);
}

function loadSecretFromEspHeaders() {
  const headerPaths = [
    join(__dirname, "../GasSensor_node1/include/secrets.h"),
    join(__dirname, "../GasSensor_node2/include/secrets.h"),
    join(__dirname, "../GasSensor_node3/include/secrets.h"),
  ];

  for (const path of headerPaths) {
    if (!existsSync(path)) continue;

    const content = readFileSync(path, "utf8");
    const match = content.match(/#define\s+DATABASE_SECRET\s+"([^"]+)"/);
    if (match && !match[1].includes("YOUR_")) {
      console.log(`Loaded DATABASE_SECRET from ${path}`);
      return match[1];
    }
  }

  return "";
}

const config = loadConfig();
let databaseSecret = config.databaseSecret ?? "";

function isValidSecret(value) {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes("YOUR_")) return false;
  if (trimmed.startsWith("PASTE_")) return false;
  if (trimmed.startsWith("AIza")) return false;
  return true;
}

if (!isValidSecret(databaseSecret)) {
  databaseSecret = process.env.DATABASE_SECRET ?? "";
}

if (!isValidSecret(databaseSecret)) {
  databaseSecret = loadSecretFromEspHeaders();
}

const {
  databaseUrl,
  intervalMs = 1000,
  timezoneOffsetHours = 7,
  rooms = ["room_1", "room_2", "room_3"],
} = config;

if (!databaseUrl) {
  console.error("config must include databaseUrl");
  process.exit(1);
}

if (!isValidSecret(databaseSecret)) {
  console.error("\nMissing DATABASE_SECRET.");
  console.error("Fix one of these options:");
  console.error("  1) Set databaseSecret in config.json");
  console.error("  2) Set env DATABASE_SECRET");
  console.error(
    "  3) Keep secrets.h in BackEnd/GasSensor_node1/include/secrets.h",
  );
  console.error(
    "\nCopy DATABASE_SECRET from Firebase Console or your ESP secrets.h",
  );
  console.error("(API Key is NOT the database secret.)\n");
  process.exit(1);
}

const GAS_SAFE_THRESHOLD = 650;
const GAS_WARNING_THRESHOLD = 800;
// config.h has 100 (typo) — real danger must be above warning threshold
const GAS_DANGER_THRESHOLD = 950;

function detectGasState(temperature, humidity, gas, deltaGas, gasRelative) {
  const harshEnv = humidity > 90 || temperature > 50 || temperature < 0;

  if (harshEnv && gas < GAS_WARNING_THRESHOLD) return 4;
  if (gas >= GAS_DANGER_THRESHOLD && (deltaGas > 60 || gasRelative > 1.15))
    return 3;
  if (gas >= GAS_WARNING_THRESHOLD && (deltaGas > 35 || gasRelative > 1.02))
    return 2;
  if (gas >= GAS_SAFE_THRESHOLD || deltaGas > 20 || gasRelative > 1.03)
    return 1;
  return 0;
}

function getVietnamDateParts(date = new Date()) {
  const shifted = new Date(
    date.getTime() + timezoneOffsetHours * 60 * 60 * 1000,
  );
  const iso = shifted.toISOString();
  const dateKey = iso.slice(0, 10);
  const timePart = iso.slice(11, 19);
  const timeKey = timePart.replace(/:/g, "-");
  return { dateKey, timeKey, displayTime: timePart };
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createRoomState(seedOffset = 0) {
  const baseGas = 420 + seedOffset * 35;
  return {
    temperature: randomBetween(24, 30),
    humidity: randomBetween(45, 65),
    gas: baseGas,
    gasPrev: baseGas,
    gasAvg: baseGas,
  };
}

function nextRoomState(state) {
  state.temperature = clamp(
    state.temperature + randomBetween(-0.4, 0.4),
    18,
    42,
  );
  state.humidity = clamp(state.humidity + randomBetween(-1.2, 1.2), 30, 95);

  const spikeChance = Math.random();
  let spike = 0;
  if (spikeChance < 0.04) spike = randomBetween(120, 220);
  else if (spikeChance < 0.1) spike = randomBetween(40, 90);

  const prevGas = state.gas;
  state.gas = clamp(state.gas + randomBetween(-18, 18) + spike, 280, 1050);

  // Match ESP firmware: delta from previous tick, relative vs EMA average
  const deltaGas = state.gas - state.gasPrev;
  state.gasAvg = state.gasAvg * 0.9 + state.gas * 0.1;
  const gasRelative = state.gasAvg > 0 ? state.gas / state.gasAvg : 1;
  state.gasPrev = state.gas;

  const roundedGas = Math.round(state.gas);
  const label = detectGasState(
    state.temperature,
    state.humidity,
    roundedGas,
    deltaGas,
    gasRelative,
  );

  return {
    temperature: Number(state.temperature.toFixed(2)),
    humidity: Number(state.humidity.toFixed(2)),
    gas: roundedGas,
    delta_gas: Number(deltaGas.toFixed(2)),
    gas_relative: Number(gasRelative.toFixed(3)),
    label,
  };
}

async function uploadReading(roomId, payload, dateKey, timeKey) {
  const path = `devices/${roomId}/${dateKey}/${timeKey}.json`;
  const url = `${databaseUrl.replace(/\/$/, "")}/${path}?auth=${encodeURIComponent(databaseSecret.trim())}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401) {
      throw new Error(
        `${roomId} permission denied. Check DATABASE_SECRET in config.json or secrets.h`,
      );
    }
    throw new Error(`${roomId} upload failed (${response.status}): ${text}`);
  }
}

const roomStates = Object.fromEntries(
  rooms.map((roomId, index) => [roomId, createRoomState(index)]),
);

let tick = 0;

async function publishTick() {
  const { dateKey, timeKey, displayTime } = getVietnamDateParts();

  await Promise.all(
    rooms.map(async (roomId) => {
      const payload = nextRoomState(roomStates[roomId]);
      await uploadReading(roomId, payload, dateKey, timeKey);
      console.log(
        `[${displayTime}] ${roomId} temp=${payload.temperature}C hum=${payload.humidity}% gas=${payload.gas} label=${payload.label}`,
      );
    }),
  );

  tick += 1;
  if (tick % 10 === 0) {
    console.log(`--- ${tick} ticks sent for ${rooms.join(", ")} ---`);
  }
}

console.log("Gas Sensor Mock Sender");
console.log(`Database : ${databaseUrl}`);
console.log(`Auth     : legacy secret`);
console.log(`Rooms    : ${rooms.join(", ")}`);
console.log(`Interval : ${intervalMs}ms`);
console.log("Press Ctrl+C to stop.\n");

try {
  await publishTick();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

setInterval(() => {
  publishTick().catch((error) => {
    console.error("Upload error:", error.message);
  });
}, intervalMs);
