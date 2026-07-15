export interface TelemetryData {
  zoneId: string;
  gateCapacityPercentage: number;       // e.g., 0 to 100 representing capacity utilization
  securityThroughputPerMin: number;     // Number of visitors processed per minute
  concessionWaitTimeMins: number;       // Average cashierless / general concession wait time in minutes
  activeIncidentsCount: number;         // Count of active safety/security incidents
  timestamp: number;                    // Epoch timestamp of telemetry entry
}

export type TelemetryPoint = TelemetryData;
