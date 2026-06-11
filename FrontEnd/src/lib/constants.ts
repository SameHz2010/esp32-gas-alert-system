export const ROOMS = [
  { id: "room_1" as const, label: "Room 1" },
  { id: "room_2" as const, label: "Room 2" },
  { id: "room_3" as const, label: "Room 3" },
];

export type RoomId = (typeof ROOMS)[number]["id"];

export const REALTIME_WINDOW_SECONDS = 60;
export const HISTORY_PAGE_SIZE = 10;
export const TIMEZONE = "Asia/Ho_Chi_Minh";

export const LABEL_META: Record<
  number,
  { name: string; color: string; description: string }
> = {
  0: { name: "Safe", color: "#7dd87d", description: "Normal conditions" },
  1: { name: "Mild", color: "#4fc3f7", description: "Slight elevation" },
  2: { name: "Warning", color: "#ffb300", description: "Elevated gas levels" },
  3: { name: "Danger", color: "#ff5722", description: "High risk detected" },
  4: { name: "Critical", color: "#b71c1c", description: "Harsh environment" },
};

export const METRIC_CONFIG = {
  temperature: { label: "Temperature", unit: "°C", color: "#ff9800" },
  humidity: { label: "Humidity", unit: "%", color: "#22d3ee" },
  gas: { label: "Gas", unit: "ppm", color: "#ff6f00" },
} as const;
