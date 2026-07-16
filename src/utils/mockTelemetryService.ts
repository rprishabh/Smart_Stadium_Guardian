import { TelemetryPoint } from "../types/telemetry";

/**
 * 🎖️ Pre-defined titles for volunteer hierarchy tiers (Level 1 to 10).
 */
export const VOLUNTEER_RANKS: string[] = [
  "Novice Steward",       // Level 1
  "Crowd Coordinator",    // Level 2
  "Sector Guardian",      // Level 3
  "Flow Tactician",       // Level 4
  "Concourse Captain",    // Level 5
  "Safety Sentinel",      // Level 6
  "Zone Commander",       // Level 7
  "Operations Master",    // Level 8
  "Stadium Elite",        // Level 9
  "FIFA Vanguard",        // Level 10
];

/**
 * 🔒 Details and mock transaction receipts for standard Soulbound Badge tiers.
 */
export interface BadgeDetails {
  matchContext: string;
  sectorAction: string;
  hash: string;
}

export const DEFAULT_BADGE_DETAILS: Record<number, BadgeDetails> = {
  1: {
    matchContext: "FIFA World Cup - Onboarding",
    sectorAction: "Steward orientation and safety protocol onboarding completed",
    hash: "0x12a3f8db8204e38ac9b11efec34d56789abcde01"
  },
  2: {
    matchContext: "FIFA World Cup - Group Stage: Pre-Match Entry",
    sectorAction: "Crowd diverted successfully from high occupancy ticket lanes at Sector B.",
    hash: "0x28f6da8204e38ac9b11efec34d56789abcde02"
  },
  3: {
    matchContext: "FIFA World Cup - Group Stage: Half-Time Surge",
    sectorAction: "Assisted with translation and directions for 15+ foreign fans at Plaza 3.",
    hash: "0x39a3f8db8204e38ac9b11efec34d56789abcde03"
  },
  4: {
    matchContext: "FIFA World Cup - Group Stage: Live Play",
    sectorAction: "Identified and resolved congestion bottleneck in East Concourse escalator.",
    hash: "0x4af6da8204e38ac9b11efec34d56789abcde04"
  },
  5: {
    matchContext: "FIFA World Cup - Knockout Phase: Pre-Match",
    sectorAction: "Concourse routing plan implemented cleanly for maximum capacity load.",
    hash: "0x5bf6da8204e38ac9b11efec34d56789abcde05"
  },
  6: {
    matchContext: "FIFA World Cup - Knockout Phase: Post-Match",
    sectorAction: "Rapid coordination response executed during emergency egress warning sweep.",
    hash: "0x6cf6da8204e38ac9b11efec34d56789abcde06"
  },
  7: {
    matchContext: "FIFA World Cup - Quarter Finals: Half-Time",
    sectorAction: "Crisis management protocol established for VIP block entry checkpoint.",
    hash: "0x7df6da8204e38ac9b11efec34d56789abcde07"
  },
  8: {
    matchContext: "FIFA World Cup - Semi Finals: Live Play",
    sectorAction: "Operations command ledger reviewed and coordinated with security coordinators.",
    hash: "0x8ef6da8204e38ac9b11efec34d56789abcde08"
  },
  9: {
    matchContext: "FIFA World Cup - Third-Place Playoff",
    sectorAction: "Steward team assignments and shift logs audited for final matches.",
    hash: "0x9ff6da8204e38ac9b11efec34d56789abcde09"
  },
  10: {
    matchContext: "FIFA World Cup - Final Match",
    sectorAction: "Global operations supervisor duty successfully completed. Zero safety incidents.",
    hash: "0xa0f6da8204e38ac9b11efec34d56789abcde10"
  }
};

/**
 * 📊 Initial sample telemetry points representing the 4 main stadium gates.
 */
export const SAMPLE_TELEMETRY: TelemetryPoint[] = [
  {
    zoneId: "Zone A (North Gate)",
    gateCapacityPercentage: 88,
    securityThroughputPerMin: 42,
    concessionWaitTimeMins: 18,
    activeIncidentsCount: 1,
    timestamp: Date.now(),
  },
  {
    zoneId: "Zone B (East Concourse)",
    gateCapacityPercentage: 55,
    securityThroughputPerMin: 78,
    concessionWaitTimeMins: 22,
    activeIncidentsCount: 0,
    timestamp: Date.now(),
  },
  {
    zoneId: "Zone C (South Portal)",
    gateCapacityPercentage: 94,
    securityThroughputPerMin: 28,
    concessionWaitTimeMins: 11,
    activeIncidentsCount: 2,
    timestamp: Date.now(),
  },
  {
    zoneId: "Zone D (VIP Gate)",
    gateCapacityPercentage: 45,
    securityThroughputPerMin: 105,
    concessionWaitTimeMins: 4,
    activeIncidentsCount: 0,
    timestamp: Date.now(),
  },
];

/**
 * 🔄 Crowd simulation patterns detailing gate capacity target configurations
 * for match timelines to emulate crowd flow shifts.
 */
export interface CrowdPattern {
  name: string;
  targets: number[];
}

export const CROWD_PATTERNS: CrowdPattern[] = [
  { name: "Pre-Match North Rush",  targets: [92, 50, 40, 35] },
  { name: "Overflow to East",      targets: [78, 85, 45, 40] },
  { name: "Halftime Concessions",  targets: [60, 70, 65, 55] },
  { name: "Second Half Settled",   targets: [55, 55, 50, 45] },
  { name: "Match End South Surge", targets: [45, 50, 95, 88] },
  { name: "Full Evacuation",       targets: [70, 75, 85, 92] },
  { name: "Post-Match Cooldown",   targets: [35, 40, 55, 30] },
];
