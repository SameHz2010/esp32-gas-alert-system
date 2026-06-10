import type { RoomId } from "./constants";
import type { TimePresetId } from "./timePresets";

export interface SensorReading {
  timeKey: string;
  dateKey: string;
  temperature: number;
  humidity: number;
  gas: number;
  delta_gas: number;
  gas_relative: number;
  label: number;
  sortKey: string;
}

export interface HistoryFilters {
  date: string;
  timePreset: TimePresetId;
  timeFrom: string;
  timeTo: string;
  label: string;
  gasMin: string;
  gasMax: string;
  deltaGasMin: string;
  deltaGasMax: string;
  gasRelativeMin: string;
  gasRelativeMax: string;
  tempMin: string;
  tempMax: string;
  humidityMin: string;
  humidityMax: string;
  search: string;
}

export interface ChartPoint {
  second: number;
  value: number;
  timeLabel: string;
}

export interface LabelChartPoint {
  second: number;
  label: number;
  barValue: number;
  timeLabel: string;
  fill: string;
}

export interface GasStateChartPoint {
  second: number;
  gas: number;
  label: number;
  timeLabel: string;
  fill: string;
}

export type RoomReadingsMap = Record<RoomId, SensorReading[]>;
