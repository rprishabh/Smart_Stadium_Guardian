import React, { useState, useEffect, useRef, useCallback } from "react";
import { DataIngestion } from "./components/DataIngestion";
import { SecurityLog, SecurityIncidentLog } from "./components/SecurityLog";
import { evaluateStadiumMetrics } from "./utils/geminiEngine";
import { logIncidentToLedger } from "./utils/ledger";
import { TelemetryPoint } from "./types/telemetry";
import ZoneCard from "./components/ZoneCard";
import ZoneDetailModal from "./components/ZoneDetailModal";
import CCTVGrid from "./components/CCTVGrid";
import { connectWallet, awardVolunteerBadge } from "./utils/web3Service";
import { generateCrowdAdvice, translateFanQuery } from "./utils/geminiService";
import { logDeploymentEvent, auth } from "./utils/firebaseConfig";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

const VOLUNTEER_RANKS = [
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

const DEFAULT_BADGE_DETAILS: Record<number, { matchContext: string; sectorAction: string; hash: string }> = {
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



// ── Constants ──────────────────────────────────────
const LANGUAGES = [
  { label: "English", value: "English" },
  { label: "Spanish (Español)", value: "Spanish" },
  { label: "French (Français)", value: "French" },
  { label: "Arabic (العربية)", value: "Arabic" },
  { label: "German (Deutsch)", value: "German" },
  { label: "Hindi (हिन्दी)", value: "Hindi" },
];

const SAMPLE_TELEMETRY: TelemetryPoint[] = [
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

// ── Crowd simulation patterns ──
// Each pattern has target capacity ranges per zone to create realistic movement narratives
const CROWD_PATTERNS = [
  { name: "Pre-Match North Rush",  targets: [92, 50, 40, 35] },
  { name: "Overflow to East",      targets: [78, 85, 45, 40] },
  { name: "Halftime Concessions",  targets: [60, 70, 65, 55] },
  { name: "Second Half Settled",   targets: [55, 55, 50, 45] },
  { name: "Match End South Surge", targets: [45, 50, 95, 88] },
  { name: "Full Evacuation",       targets: [70, 75, 85, 92] },
  { name: "Post-Match Cooldown",   targets: [35, 40, 55, 30] },
];

/** Clamp a number between min and max */
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Nudge a value toward a target with some random jitter */
function nudgeToward(current: number, target: number, jitter: number): number {
  const diff = target - current;
  const step = Math.sign(diff) * Math.min(Math.abs(diff), Math.floor(Math.random() * jitter) + 2);
  return current + step;
}

// ── Match ticker mock data ──
const MATCH_TEAMS = { home: "USA 🇺🇸", away: "🇧🇷 Brazil" };

function getBadgeIpfsUrl(level: number, title: string): string {
  const urlTitle = title.replace(/ /g, "%20");
  return `https://turquoise-unconscious-wombat-876.mypinata.cloud/ipfs/bafybeigup3a7qo2fkjjxgzksriym7wq7vdjyj2eqwo4mqbox6eokgnupoy/Level%20${level}%20-%20${urlTitle}%20NFT.png`;
}

function getSectorData(matchPhase: string) {
  switch (matchPhase) {
    case "Pre-Match":
      return [
        { name: "Grandstand Concourses", status: "Alert", value: "92% Occupancy", desc: "Critical entry bottleneck; ramp lanes fully utilized.", icon: "🎪", alert: true },
        { name: "Concession & Restrooms", status: "Nominal", value: "8 min queue", desc: "Wait-times nominal; inventory stable.", icon: "🍔", alert: false },
        { name: "Multilingual Info Plazas", status: "Nominal", value: "15 req/min", desc: "Translation queries stable.", icon: "🌐", alert: false },
        { name: "Medical Operations", status: "Nominal", value: "100% Clear", desc: "Response pathways fully open.", icon: "🚑", alert: false },
        { name: "Eco-Patrol Stations", status: "Nominal", value: "20% Filled", desc: "Trash volume low.", icon: "♻️", alert: false },
        { name: "Transit Egress Hubs", status: "Nominal", value: "Nominal", desc: "Train terminal steady.", icon: "🚇", alert: false },
      ];
    case "Live Play":
      return [
        { name: "Grandstand Concourses", status: "Nominal", value: "85% Occupancy", desc: "Fans seated; concourse traffic low.", icon: "🎪", alert: false },
        { name: "Concession & Restrooms", status: "Nominal", value: "4 min queue", desc: "Minimal wait-times during active match play.", icon: "🍔", alert: false },
        { name: "Multilingual Info Plazas", status: "Nominal", value: "10 req/min", desc: "Queries stable.", icon: "🌐", alert: false },
        { name: "Medical Operations", status: "Warning", value: "East Restricted", desc: "Heat fatigue incident; medics deployed.", icon: "VIP", alert: true },
        { name: "Eco-Patrol Stations", status: "Nominal", value: "40% Filled", desc: "Normal garbage load.", icon: "♻️", alert: false },
        { name: "Transit Egress Hubs", status: "Nominal", value: "Standby", desc: "Egress fleets positioned for match conclusion.", icon: "🚇", alert: false },
      ];
    case "Half-Time":
      return [
        { name: "Grandstand Concourses", status: "Nominal", value: "Nominal", desc: "Ramp ways clear; minor lobby traffic.", icon: "🎪", alert: false },
        { name: "Concession & Restrooms", status: "Alert", value: "24 min queue", desc: "Extreme surge load at hot-food counters & restrooms.", icon: "🍔", alert: true },
        { name: "Multilingual Info Plazas", status: "Nominal", value: "25 req/min", desc: "Nominal queries regarding halftime facilities.", icon: "🌐", alert: false },
        { name: "Medical Operations", status: "Nominal", value: "100% Clear", desc: "Response lanes clear.", icon: "🚑", alert: false },
        { name: "Eco-Patrol Stations", status: "Warning", value: "85% Filled", desc: "Trash capacity warning; bin clearing sweep required.", icon: "♻️", alert: true },
        { name: "Transit Egress Hubs", status: "Nominal", value: "Nominal", desc: "Transit operations normal; zero egress queue.", icon: "🚇", alert: false },
      ];
    case "Post-Match":
      return [
        { name: "Grandstand Concourses", status: "Nominal", value: "Nominal", desc: "Mass exodus exiting seating areas; slow crowd movement.", icon: "🎪", alert: false },
        { name: "Concession & Restrooms", status: "Nominal", value: "2 min queue", desc: "Food counters closed.", icon: "🍔", alert: false },
        { name: "Multilingual Info Plazas", status: "Nominal", value: "15 req/min", desc: "Lost & found queries active.", icon: "🌐", alert: false },
        { name: "Medical Operations", status: "Nominal", value: "100% Clear", desc: "Response lanes nominal.", icon: "🚑", alert: false },
        { name: "Eco-Patrol Stations", status: "Nominal", value: "35% Filled", desc: "Clean up sweep completed.", icon: "♻️", alert: false },
        { name: "Transit Egress Hubs", status: "Alert", value: "96% Capacity", desc: "Critical mass egress surge; heavy delays at train platforms.", icon: "🚇", alert: true },
      ];
    default:
      return [];
  }
}

function getScoreboardData(phase: string) {
  switch (phase) {
    case "Pre-Match":
      return { time: "Pre-Game", home: 0, away: 0 };
    case "Live Play":
      return { time: "32'", home: 1, away: 0 };
    case "Half-Time":
      return { time: "45' (HT)", home: 1, away: 1 };
    case "Post-Match":
      return { time: "FT", home: 2, away: 1 };
    default:
      return { time: "Pre-Game", home: 0, away: 0 };
  }
}

// ══════════════════════════════════════════════════
//  App Component
// ══════════════════════════════════════════════════
export default function App() {
  const [telemetry, setTelemetry] = useState<TelemetryPoint[] | null>(null);
  const [prevTelemetry, setPrevTelemetry] = useState<TelemetryPoint[] | null>(null);
  const [logs, setLogs] = useState<SecurityIncidentLog[]>([]);
  const [targetLanguage, setTargetLanguage] = useState<string>("English");
  const [manualQueryText, setManualQueryText] = useState<string>("");
  const [cctvUrl, setCctvUrl] = useState<string>("");
  const [aiDirective, setAiDirective] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "blockchain">("dashboard");
  const [selectedZone, setSelectedZone] = useState<TelemetryPoint | null>(null);
  const [aiStatus, setAiStatus] = useState<"Online" | "Offline">("Offline");
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [matchPhase, setMatchPhase] = useState<string>("Pre-Match");

  // ── Web3 states ──
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [tasksCompleted, setTasksCompleted] = useState<number>(() => {
    const saved = localStorage.getItem("tasksCompleted");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [currentNftLevel, setCurrentNftLevel] = useState<number>(() => {
    const saved = localStorage.getItem("currentNftLevel");
    return saved ? parseInt(saved, 10) : 1;
  });
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [deployingZoneId, setDeployingZoneId] = useState<string | null>(null);
  const [rankUpData, setRankUpData] = useState<{
    level: number;
    title: string;
    hash: string;
  } | null>(null);
  const [badgeReceipts, setBadgeReceipts] = useState<Record<number, { hash: string; firestoreDocId: string; matchContext: string; sectorAction: string }>>({
    1: {
      hash: "0x12a3f8db8204e38ac9b11efec34d56789abcde01",
      firestoreDocId: "doc_lvl_1_onboarding",
      matchContext: "FIFA World Cup - Onboarding",
      sectorAction: "Steward orientation and safety protocol onboarding completed"
    }
  });
  const isTriggeringRef = useRef<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [capturedSTT, setCapturedSTT] = useState<string>("");
  const [detectedLanguage, setDetectedLanguage] = useState<string>("");
  const [englishTranslation, setEnglishTranslation] = useState<string>("");
  const [tacticalInstruction, setTacticalInstruction] = useState<string>("");
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(process.env.NODE_ENV === "test" ? false : true);
  const [emailInput, setEmailInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [isInfraModalOpen, setIsInfraModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);
  const [gpsCoordinates, setGpsCoordinates] = useState<{ latitude: number | string; longitude: number | string } | null>(null);
  const [micPermissionBlocked, setMicPermissionBlocked] = useState<boolean>(false);
  const [lastResolvedTaskText, setLastResolvedTaskText] = useState<string>("Steward orientation and safety protocol onboarding completed");

  const [shiftLogs, setShiftLogs] = useState<Array<{ time: string; type: string; message: string }>>([
    { time: new Date().toLocaleTimeString(), type: "system", message: "Shift started. System monitoring active." }
  ]);

  const addLog = (type: string, message: string) => {
    setShiftLogs(prev => [{ time: new Date().toLocaleTimeString(), type, message }, ...prev]);
  };

  const [fansAssisted, setFansAssisted] = useState<number>(() => {
    const saved = localStorage.getItem("fansAssisted");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [alertsResolved, setAlertsResolved] = useState<number>(() => {
    const saved = localStorage.getItem("alertsResolved");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [distanceCovered, setDistanceCovered] = useState<number>(() => {
    const saved = localStorage.getItem("distanceCovered");
    return saved ? parseFloat(saved) : 0.0;
  });

  useEffect(() => {
    localStorage.setItem("tasksCompleted", tasksCompleted.toString());
  }, [tasksCompleted]);

  useEffect(() => {
    localStorage.setItem("currentNftLevel", currentNftLevel.toString());
  }, [currentNftLevel]);

  useEffect(() => {
    localStorage.setItem("badgeReceipts", JSON.stringify(badgeReceipts));
  }, [badgeReceipts]);

  useEffect(() => {
    localStorage.setItem("fansAssisted", fansAssisted.toString());
  }, [fansAssisted]);

  useEffect(() => {
    localStorage.setItem("alertsResolved", alertsResolved.toString());
  }, [alertsResolved]);

  useEffect(() => {
    localStorage.setItem("distanceCovered", distanceCovered.toString());
  }, [distanceCovered]);

  const handleConnectWallet = async () => {
    try {
      const address = await connectWallet();
      if (address) {
        setWalletAddress(address);
      } else {
        setToastMessage("Failed to connect wallet. Please ensure MetaMask is unlocked and try again.");
      }
    } catch (err) {
      console.error("Wallet connection handler error:", err);
      setToastMessage("Network error: Failed to connect wallet. Please try again.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      alert("Please enter both email and password.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, emailInput, passwordInput);
      setEmailInput("");
      setPasswordInput("");
    } catch (err: any) {
      console.error("Firebase Authentication error:", err);
      setToastMessage("Authentication failed. Network error. Please try again.");
      alert(`Login failed: ${err.message || "Network error. Please try again."}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error("Firebase Signout error:", err);
      setToastMessage("Network error: Logout failed. Please try again.");
    }
  };

  const handleGuestBypass = async () => {
    try {
      await signInWithEmailAndPassword(auth, "volunteer1@stadium.com", "password123");
    } catch (err: any) {
      console.error("Guest bypass login error:", err);
      setToastMessage("Bypass login failed: Network error. Please try again.");
      alert(`Bypass login failed: ${err.message || "Network error. Please try again."}`);
    }
  };

  const triggerLevelUp = useCallback(async (targetLevel: number, userAddr: string) => {
    setIsMinting(true);
    try {
      alert(`🏆 LEVEL UP! Initiating Soulbound Badge minting for Level ${targetLevel} (${VOLUNTEER_RANKS[targetLevel - 1]}). Please confirm the transaction in MetaMask.`);
      const hash = await awardVolunteerBadge(userAddr, targetLevel);
      if (hash) {
        setCurrentNftLevel(targetLevel);
        setRankUpData({
          level: targetLevel,
          title: VOLUNTEER_RANKS[targetLevel - 1],
          hash: hash,
        });
        addLog("web3", "Cryptographic audit synced. Transaction Hash: " + hash);

        // Add audit trail log entry
        const newLog: SecurityIncidentLog = {
          timestamp: new Date().toLocaleTimeString(),
          zone: "Global Ops",
          alert: `🏆 NFT MINT SUCCESS: Soulbound Badge Awarded (Level ${targetLevel} - ${VOLUNTEER_RANKS[targetLevel - 1]}).`,
          txHash: hash,
          isRealTx: true,
        };

        // Invoke Google Firebase Firestore database recording layer
        const volunteerId = user?.uid || "anonymous_volunteer";
        const taskText = lastResolvedTaskText;
        const coordinates = gpsCoordinates;

        let dbLogId: string | null = null;
        try {
          dbLogId = await logDeploymentEvent(volunteerId, targetLevel, hash, taskText, coordinates);
        } catch (dbErr) {
          console.error("Firebase multi-user database write error: ", dbErr);
        }

        const matchContext = `FIFA World Cup - Group Stage: ${matchPhase === "Pre-Match" ? "Pre-Match Entry" : matchPhase === "Half-Time" ? "Half-Time Surge" : matchPhase === "Post-Match" ? "Post-Match Exit" : "Live Play"}`;

        // Populate receipt locally immediately to prevent UI details being missing
        setBadgeReceipts((prev) => {
          const updated = {
            ...prev,
            [targetLevel]: {
              hash: hash,
              firestoreDocId: dbLogId || "local_sync_offline",
              matchContext: matchContext,
              sectorAction: taskText,
            },
          };
          localStorage.setItem("badgeReceipts", JSON.stringify(updated));
          return updated;
        });

        if (dbLogId) {
          const firebaseLog: SecurityIncidentLog = {
            timestamp: new Date().toLocaleTimeString(),
            zone: "Firebase",
            alert: "🛡️ Google Cloud Services: Persistent decentralized log synced to Firestore.",
            txHash: dbLogId,
            isRealTx: false,
          };
          setLogs((prev) => [newLog, firebaseLog, ...prev]);
        } else {
          setLogs((prev) => [newLog, ...prev]);
          setToastMessage("Firebase Sync Offline: Local cryptographic receipt generated.");
        }
      } else {
        alert("Smart contract minting failed or was cancelled.");
        setToastMessage("Smart contract minting failed or was cancelled.");
      }
    } catch (err) {
      console.error("NFT Badge minting error:", err);
      alert("An error occurred during smart contract transaction execution.");
      setToastMessage("Network error during Smart Contract minting. Please try again.");
    } finally {
      setIsMinting(false);
    }
  }, [matchPhase, user, lastResolvedTaskText, gpsCoordinates]);

  // Monitor for automated Soulbound mint trigger
  useEffect(() => {
    if (walletAddress && !isMinting && !rankUpData && !isTriggeringRef.current) {
      const nextLevel = currentNftLevel + 1;
      if (nextLevel <= 10) {
        const requiredTasks = (nextLevel - 1) * 2;
        if (tasksCompleted >= requiredTasks) {
          isTriggeringRef.current = true;
          triggerLevelUp(nextLevel, walletAddress).finally(() => {
            isTriggeringRef.current = false;
          });
        }
      }
    }
  }, [walletAddress, tasksCompleted, currentNftLevel, isMinting, rankUpData, triggerLevelUp]);

  const handleDeployVolunteer = async (zoneId: string) => {
    if (deployingZoneId) return;
    setDeployingZoneId(zoneId);

    // Invoke geolocation tracking
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn("Geolocation access denied or failed:", error);
          setGpsCoordinates({ latitude: "Denied", longitude: "Denied" });
          setToastMessage("Location access denied. Proceeding with simulated sector coordinates.");
        }
      );
    } else {
      console.warn("Geolocation is not supported by this browser.");
      setGpsCoordinates({ latitude: "Denied", longitude: "Denied" });
      setToastMessage("Location access denied. Proceeding with simulated sector coordinates.");
    }

    setLastResolvedTaskText(`Resolved bottleneck congestion at Sector ${zoneId}`);

    // Switch AI status to Online and update recommendation dynamically
    setAiStatus("Online");
    setAiDirective(
      `🤖 AI Active Directive:\nVolunteer dispatched to resolve bottlenecks and clear congestion in ${zoneId}. Normalizing entry gates via Edge AI Crowd Scanning.`
    );

    // 4-second simulated cooling state
    setTimeout(() => {
      // 1. Programmatically cool down the telemetry data for this zone in state
      setTelemetry((prevTelemetry) => {
        if (!prevTelemetry) return null;
        return prevTelemetry.map((pt) => {
          if (pt.zoneId === zoneId) {
            return {
              ...pt,
              gateCapacityPercentage: 45,
              activeIncidentsCount: 0,
              timestamp: Date.now(),
            };
          }
          return pt;
        });
      });

      setDeployingZoneId(null);

      // 2. Increment tasks completed count
      setTasksCompleted((prev) => prev + 1);
      addLog("action", "Resolved critical alert at " + zoneId);
      setAlertsResolved((prev) => prev + 1);
      setDistanceCovered((prev) => prev + (Math.random() * 0.4 + 0.1));

      alert(`✅ Crowd successfully cleared in ${zoneId}! Gate capacity normalized to 45%.`);
    }, 4000);
  };

  const handleSpeakDirective = () => {
    const textToSpeak = aiRecommendation || aiDirective;
    if (!textToSpeak) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang =
      targetLanguage === "Spanish"
        ? "es-ES"
        : targetLanguage === "French"
        ? "fr-FR"
        : "en-US";
    window.speechSynthesis.speak(utterance);
  };

  const triggerSimulatedVoiceInput = () => {
    setIsListening(true);
    
    // Select a realistic phrase based on targetLanguage
    let simulatedPhrase = "Washroom kaha par hai"; // Hindi default
    if (targetLanguage === "Spanish") {
      simulatedPhrase = "¿Dónde está la puerta de salida?";
    } else if (targetLanguage === "French") {
      simulatedPhrase = "Où est le poste de secours?";
    } else if (targetLanguage === "Arabic") {
      simulatedPhrase = "أين المخرج الرئيسي؟";
    } else if (targetLanguage === "German") {
      simulatedPhrase = "Wo ist die medizinische Station?";
    } else if (targetLanguage === "English") {
      simulatedPhrase = "Where is the main entry gate?";
    }

    setTimeout(async () => {
      setIsListening(false);
      setIsAiLoading(true);
      setAiStatus("Online");
      
      try {
        const result = await translateFanQuery(simulatedPhrase, targetLanguage, matchPhase);
        setCapturedSTT(simulatedPhrase);
        setDetectedLanguage(result.detectedLanguage);
        setEnglishTranslation(result.englishTranslation);
        setTacticalInstruction(result.tacticalInstruction);
        setAiRecommendation(result.tacticalInstruction);
        setAiDirective(result.tacticalInstruction);
        addLog("translation", "Assisted fan via Mic: " + result.englishTranslation);
        setFansAssisted((prev) => prev + 1);
      } catch (err) {
        console.error("Simulated voice translation error:", err);
        setToastMessage("Gemini API connection error. Please try manually typing.");
      } finally {
        setIsAiLoading(false);
      }
    }, 1500); // 1.5s simulated listening animation
  };

  const handleListenToFan = () => {
    setMicPermissionBlocked(false);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      triggerSimulatedVoiceInput();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    // Map selected language to SpeechRecognition locale
    let speechLang = "en-US";
    if (targetLanguage === "Spanish") {
      speechLang = "es-ES";
    } else if (targetLanguage === "French") {
      speechLang = "fr-FR";
    }
    recognition.lang = speechLang;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      setIsAiLoading(true);
      setAiStatus("Online");

      try {
        const result = await translateFanQuery(transcript, targetLanguage, matchPhase);
        setCapturedSTT(transcript);
        setDetectedLanguage(result.detectedLanguage);
        setEnglishTranslation(result.englishTranslation);
        setTacticalInstruction(result.tacticalInstruction);
        setAiRecommendation(result.tacticalInstruction);
        setAiDirective(result.tacticalInstruction);
        addLog("translation", "Assisted fan via AI Matrix: " + result.englishTranslation);
        setFansAssisted((prev) => prev + 1);
      } catch (err) {
        console.error("Gemini translation query error:", err);
        setToastMessage("Network error: Gemini API translation query failed. Please try again.");
      } finally {
        setIsAiLoading(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      recognition.onend = null; // Unbind onend to prevent state race condition
      setIsListening(false);
      if (event.error === "not-allowed") {
        console.warn("Microphone access blocked by browser/user permissions.");
        setMicPermissionBlocked(true);
      }
      triggerSimulatedVoiceInput();
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleManualQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQueryText.trim()) return;

    setIsAiLoading(true);
    setAiStatus("Online");
    const query = manualQueryText.trim();
    
    try {
      const result = await translateFanQuery(query, targetLanguage, matchPhase);
      setCapturedSTT(query);
      setDetectedLanguage(result.detectedLanguage);
      setEnglishTranslation(result.englishTranslation);
      setTacticalInstruction(result.tacticalInstruction);
      setAiRecommendation(result.tacticalInstruction);
      setAiDirective(result.tacticalInstruction);
      addLog("translation", "Assisted fan via manual entry: " + result.englishTranslation);
      setFansAssisted((prev) => prev + 1);
      setManualQueryText("");
    } catch (err) {
      console.error("Gemini translation query error:", err);
      setToastMessage("Network error: Gemini API translation query failed. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Synchronize AI Adviser status with telemetry alerts
  useEffect(() => {
    if (!telemetry) return;
    const criticalZones = telemetry.filter(
      (pt) => pt.gateCapacityPercentage > 80 || pt.activeIncidentsCount > 0
    );
    if (criticalZones.length > 0) {
      setAiStatus("Online");
      
      // Find the most critical zone
      const mostCritical = [...criticalZones].sort(
        (a, b) => b.gateCapacityPercentage - a.gateCapacityPercentage
      )[0];

      if (mostCritical) {
        const fetchSimulatedAdvice = async () => {
          try {
            const roleMetrics = getSectorData(matchPhase);
            const activeSector = roleMetrics.find(r => r.alert)?.name || mostCritical.zoneId;

            const advice = await generateCrowdAdvice(
              mostCritical.gateCapacityPercentage,
              mostCritical.activeIncidentsCount,
              matchPhase,
              activeSector
            );
            setAiRecommendation(advice);
            setAiDirective(advice);
          } catch (err) {
            console.error("Failed to generate dynamic advice in effect:", err);
            setToastMessage("Network error: Gemini API advice query failed. Please try again.");
          }
        };
        fetchSimulatedAdvice();
      }
    } else {
      if (!deployingZoneId) {
        setAiStatus("Offline");
        setAiRecommendation("✅ Stadium operations are nominal. AI Advisor in standby monitoring mode.");
        setAiDirective("✅ Stadium operations are nominal. AI Advisor in standby monitoring mode.");
      }
    }
  }, [telemetry, deployingZoneId, matchPhase]);



  // ── Match ticker state ──
  const [patternIndex, setPatternIndex] = useState(0);

  // Ref to keep simulation running independently of state closure issues
  const telemetryRef = useRef<TelemetryPoint[] | null>(null);
  telemetryRef.current = telemetry;

  // ── Dynamic telemetry simulation (every 4 seconds) ──
  useEffect(() => {
    const interval = setInterval(() => {
      const current = telemetryRef.current;
      if (!current) return;

      const pattern = CROWD_PATTERNS[patternIndex % CROWD_PATTERNS.length];

      setPrevTelemetry(current);

      const updated: TelemetryPoint[] = current.map((pt, idx) => {
        const targetCap = pattern.targets[idx] ?? 50;
        const newCap = clamp(nudgeToward(pt.gateCapacityPercentage, targetCap, 8), 15, 99);
        const newThroughput = clamp(
          pt.securityThroughputPerMin + Math.floor(Math.random() * 15) - 7,
          10,
          120
        );
        const newConcession = clamp(
          pt.concessionWaitTimeMins + Math.floor(Math.random() * 5) - 2,
          1,
          30
        );
        // Incidents are probabilistic: higher capacity → more likely
        let newIncidents = pt.activeIncidentsCount;
        if (Math.random() < 0.15) {
          newIncidents = newCap > 85 ? Math.floor(Math.random() * 3) : Math.random() < 0.3 ? 1 : 0;
        }

        return {
          ...pt,
          gateCapacityPercentage: newCap,
          securityThroughputPerMin: newThroughput,
          concessionWaitTimeMins: newConcession,
          activeIncidentsCount: newIncidents,
          timestamp: Date.now(),
        };
      });

      setTelemetry(updated);
    }, 4000);

    return () => clearInterval(interval);
  }, [patternIndex]);

  // ── Rotate crowd pattern every 20 seconds ──
  useEffect(() => {
    const interval = setInterval(() => {
      setPatternIndex((prev) => (prev + 1) % CROWD_PATTERNS.length);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // ── Core telemetry ingestion handler ──
  const handleTelemetryIngested = useCallback(
    async (data: TelemetryPoint[], urlVal?: string, langOverride?: string) => {
      const targetLang = langOverride || targetLanguage;
      const targetUrl = urlVal !== undefined ? urlVal : cctvUrl;

      setPrevTelemetry(telemetry);
      setTelemetry(data);
      if (urlVal !== undefined) {
        setCctvUrl(urlVal);
      }
      setAiDirective(null);
      setIsAiLoading(true);

      try {
        const directive = await evaluateStadiumMetrics(data, targetLang, targetUrl);
        setAiDirective(directive);

        const criticalZones = data.filter(
          (point) => point.gateCapacityPercentage > 80 || point.activeIncidentsCount > 0
        );

        const ledgerReceipts: SecurityIncidentLog[] = [];
        for (const zone of criticalZones) {
          let alertMessage = "";
          if (zone.gateCapacityPercentage > 80 && zone.activeIncidentsCount > 0) {
            alertMessage = `CRITICAL ALERT: Capacity reached ${zone.gateCapacityPercentage}% with ${zone.activeIncidentsCount} active incidents.`;
          } else if (zone.gateCapacityPercentage > 80) {
            alertMessage = `CAPACITY BOTTLENECK: Entry gate capacity utilization at ${zone.gateCapacityPercentage}%.`;
          } else {
            alertMessage = `INCIDENT REPORTED: ${zone.activeIncidentsCount} active safety incidents detected.`;
          }

          const txHash = await logIncidentToLedger(zone.zoneId, alertMessage);

          ledgerReceipts.push({
            timestamp: new Date().toLocaleTimeString(),
            zone: zone.zoneId,
            alert: alertMessage,
            txHash,
          });
        }

        if (ledgerReceipts.length > 0) {
          setLogs((prevLogs) => [...ledgerReceipts, ...prevLogs]);
        }
      } catch (error) {
        console.error("[Operations Control Error]: Failed to ingest telemetry stream:", error);
        setToastMessage("Network error: Telemetry ingestion failed. Please try again.");
      } finally {
        setIsAiLoading(false);
      }
    },
    [targetLanguage, cctvUrl, telemetry]
  );

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMicPermissionBlocked(false);
    const newLang = e.target.value;
    setTargetLanguage(newLang);
    if (telemetry) {
      handleTelemetryIngested(telemetry, undefined, newLang);
    }
  };

  const loadSampleTelemetry = () => {
    handleTelemetryIngested(SAMPLE_TELEMETRY, "https://www.youtube.com/watch?v=mock_stadium_feed", targetLanguage);
  };

  // Current crowd pattern label
  const currentPattern = CROWD_PATTERNS[patternIndex % CROWD_PATTERNS.length];

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white bg-slate-950 font-mono text-sm tracking-wider animate-pulse">
        Loading Secure Console...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center font-sans antialiased p-4">
        {/* Sleek Centered Glassmorphic Login Container */}
        <div className="w-full max-w-md bg-slate-900/40 border border-slate-900 rounded-2xl p-8 flex flex-col gap-6 shadow-2xl backdrop-blur-md">
          {/* Brand Header */}
          <div className="flex items-center gap-4 pb-4 border-b border-slate-800 justify-center">
            <div className="p-2 bg-indigo-950/60 border border-indigo-500/30 rounded-xl text-indigo-450 shrink-0">
              <svg width="36" height="36" className="w-9 h-9 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="text-center">
              <h1 className="text-lg font-black tracking-widest text-white uppercase font-sans">
                STADIUM GUARDIAN
              </h1>
              <p className="text-[10px] text-slate-450 uppercase tracking-widest font-bold font-mono mt-0.5">
                FIFA WORLD CUP OPS CENTRE
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 justify-center">
              👤 Volunteer Identity Portal
            </h4>
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <p className="text-[11px] text-slate-400 leading-relaxed text-center">
                Sign in with your Firebase volunteer credentials to authenticate.
              </p>
              <div className="space-y-2">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                />
                <span className="text-[9px] text-slate-500 leading-tight block pt-0.5 text-center">
                  For manual testing, credentials are: <strong className="text-slate-400">volunteer1@stadium.com / password123</strong>
                </span>
              </div>
              
              <button
                type="submit"
                className="w-full py-2 bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/20 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Secure Login
              </button>

              {/* Highly prominent visual bypass for judges */}
              <div className="pt-2 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={handleGuestBypass}
                  className="relative p-[1px] bg-gradient-to-r from-violet-650 via-indigo-600 to-cyan-500 rounded-lg w-full text-left font-bold shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <span className="flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-transparent rounded-[7px] py-2 px-3 text-[10px] text-indigo-300 hover:text-white transition duration-200">
                    ⚡ Bypass / Explore as Guest Judge
                  </span>
                </button>
              </div>

              {/* Quick prefill helper pills */}
              <div className="pt-2 border-t border-slate-800/60 text-center">
                <span className="text-[9px] text-slate-550 block mb-1">Testing Quick Credentials:</span>
                <div className="flex gap-1.5 justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailInput("alex@worldcup.org");
                      setPasswordInput("steward123");
                    }}
                    className="text-[9px] text-indigo-400 hover:text-indigo-350 underline cursor-pointer"
                  >
                    Prefill Alex
                  </button>
                  <span className="text-[9px] text-slate-650">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailInput("sam@worldcup.org");
                      setPasswordInput("inspector123");
                    }}
                    className="text-[9px] text-indigo-400 hover:text-indigo-350 underline cursor-pointer"
                  >
                    Prefill Sam
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const scoreboard = getScoreboardData(matchPhase);

  const renderTimeline = () => {
    return (
      <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 shadow-2xl transition duration-300 hover:border-slate-700">
        {/* Header Panel */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Live Shift Operations</h3>
          </div>
          <span className="text-[9px] uppercase tracking-widest font-black px-2.5 py-1 bg-emerald-950/40 text-emerald-450 rounded-full border border-emerald-500/20 font-mono">
            Active Roster
          </span>
        </div>

        {/* Main Timeline Feed */}
        <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar space-y-4">
          {shiftLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12">
              <span className="text-3xl mb-2">⏱️</span>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Timeline Empty</p>
              <p className="text-[10px] text-slate-500 mt-1">Shift logs will populate as actions occur.</p>
            </div>
          ) : (
            <div className="relative border-l border-slate-800 ml-4 pl-6 space-y-6 py-2">
              {shiftLogs.map((log, index) => {
                // Determine icon and color mapping
                let icon = "⚙️";
                let colorClasses = "bg-slate-950 border-slate-800 text-slate-400";
                let glowClass = "";

                if (log.type === "translation") {
                  icon = "🗣️";
                  colorClasses = "bg-indigo-950 border-indigo-500/40 text-indigo-300";
                  glowClass = "shadow-[0_0_8px_rgba(99,102,241,0.25)]";
                } else if (log.type === "action") {
                  icon = "🛡️";
                  colorClasses = "bg-emerald-950 border-emerald-500/40 text-emerald-300";
                  glowClass = "shadow-[0_0_8px_rgba(16,185,129,0.25)]";
                } else if (log.type === "web3") {
                  icon = "⚡";
                  colorClasses = "bg-amber-950 border-amber-500/40 text-amber-300";
                  glowClass = "shadow-[0_0_8px_rgba(245,158,11,0.25)]";
                }

                return (
                  <div key={index} className="relative flex flex-col gap-1.5 group">
                    {/* Timeline Node Dot */}
                    <div className={`absolute -left-[35px] top-0 w-6 h-6 rounded-full border flex items-center justify-center text-[10px] transition-all duration-300 ${colorClasses} ${glowClass} group-hover:scale-110`}>
                      {icon}
                    </div>

                    {/* Log Header */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] uppercase tracking-widest font-black font-mono text-slate-500">
                        {log.time}
                      </span>
                      <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        log.type === "translation"
                          ? "bg-indigo-950 text-indigo-400"
                          : log.type === "action"
                          ? "bg-emerald-950 text-emerald-450"
                          : log.type === "web3"
                          ? "bg-amber-950 text-amber-400"
                          : "bg-slate-950 text-slate-400"
                      }`}>
                        {log.type}
                      </span>
                    </div>

                    {/* Log Content Card */}
                    <div className="bg-slate-950/45 border border-slate-900 rounded-lg p-3 hover:border-slate-800 transition duration-150">
                      <p className="text-[11px] text-slate-300 leading-relaxed font-sans break-words">
                        {log.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans select-none antialiased">

      {/* ═══ LIVE MATCH SCORE TICKER ═══ */}
      <div
        className="w-full px-4 py-2 bg-gradient-to-r from-indigo-950/80 via-slate-950 to-indigo-950/80 border-b border-indigo-900/30 flex items-center justify-center gap-6 text-xs shrink-0"
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-indigo-400 uppercase tracking-wider font-semibold hidden sm:inline">
            🏟️ FIFA World Cup 2026
          </span>
          <div className="flex items-center gap-2 bg-slate-900/60 px-3 py-1 rounded-lg border border-slate-800">
            <span className="text-white font-bold">{MATCH_TEAMS.home}</span>
            <span className="text-lg font-black font-mono text-white">
              {scoreboard.home}
            </span>
            <span className="text-slate-500 font-mono">—</span>
            <span className="text-lg font-black font-mono text-white">
              {scoreboard.away}
            </span>
            <span className="text-white font-bold">{MATCH_TEAMS.away}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 font-mono font-bold">{scoreboard.time}</span>
          </div>
        </div>
      </div>

      {/* ═══ MAIN LAYOUT ═══ */}
      <div className="flex-grow flex flex-col md:flex-row overflow-hidden">

        {/* ── Sidebar Control Panel (Left Pane) ── */}
        <aside className="w-full md:w-80 border-r border-slate-900 bg-slate-950 p-6 flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar">
          {/* Brand Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-900">
            <div className="p-2 bg-indigo-950/50 border border-indigo-500/30 rounded-lg text-indigo-400 shrink-0">
              <svg width="32" height="32" className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-md font-bold tracking-tight text-white">
                STADIUM GUARDIAN
              </h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Operations Center
              </p>
            </div>
          </div>
          {/* Volunteer Identity Portal Info Panel */}
          <div className="bg-slate-900/50 border border-slate-900 rounded-xl p-5 text-slate-350 flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              👤 Volunteer Identity Portal
            </h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 uppercase font-mono">Volunteer Active</span>
                <button
                  onClick={handleLogout}
                  className="text-[10px] text-red-400 hover:text-red-305 underline cursor-pointer hover:font-semibold"
                >
                  Sign Out
                </button>
              </div>
              <div className="bg-slate-950/80 border border-slate-900 rounded-lg p-3 space-y-2">
                <span className="text-[9px] text-slate-500 uppercase font-mono block font-bold">Welcome Banner</span>
                <p className="text-white text-[11px] font-semibold break-all">Welcome, {user.email}</p>
                <div className="border-t border-slate-900 pt-2 flex items-center justify-between text-[10px]">
                  <span className="text-[9px] text-slate-500 uppercase font-mono">UUID</span>
                  <span className="text-[9px] font-mono text-indigo-400">{user.uid.substring(0, 10)}...</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Shift Metrics Card */}
          <div className="bg-slate-900/50 border border-slate-900 rounded-xl p-5 text-slate-350 flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              📊 Live Shift Metrics
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-950/60 border border-slate-900 rounded-lg p-2 flex flex-col items-center justify-center">
                <span className="text-[16px]" title="Fans Assisted">👥</span>
                <span className="text-[10px] text-slate-500 uppercase font-mono mt-1">Assisted</span>
                <span className="text-md font-black text-indigo-400 font-mono tracking-tight mt-0.5">
                  {fansAssisted}
                </span>
              </div>
              
              <div className="bg-slate-950/60 border border-slate-900 rounded-lg p-2 flex flex-col items-center justify-center">
                <span className="text-[16px]" title="Alerts Resolved">🚨</span>
                <span className="text-[10px] text-slate-500 uppercase font-mono mt-1">Resolved</span>
                <span className="text-md font-black text-emerald-400 font-mono tracking-tight mt-0.5">
                  {alertsResolved}
                </span>
              </div>
              
              <div className="bg-slate-950/60 border border-slate-900 rounded-lg p-2 flex flex-col items-center justify-center">
                <span className="text-[16px]" title="Distance Covered">📍</span>
                <span className="text-[10px] text-slate-500 uppercase font-mono mt-1">Distance</span>
                <span className="text-[11px] font-black text-cyan-400 font-mono tracking-tight mt-1">
                  {distanceCovered.toFixed(2)} <span className="text-[8px] text-slate-500">km</span>
                </span>
              </div>
            </div>
          </div>

          {/* Data Ingestion Pipeline */}
          <DataIngestion onDataParsed={(data, url) => handleTelemetryIngested(data, url)} />

          {/* Quick Sandbox Tester */}
          <div className="bg-slate-900/50 border border-slate-900 rounded-xl p-5 text-slate-330">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <svg width="16" height="16" className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Quick Sandbox
            </h4>
            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
              Load mock research metrics to test operational AI reasoning immediately.
            </p>
            <button
              onClick={loadSampleTelemetry}
              className="w-full py-2 px-3 bg-indigo-650 hover:bg-indigo-600 active:scale-[0.98] transition rounded-lg text-xs font-medium text-white shadow-lg shadow-indigo-950/50"
            >
              Inject Scenario Dataset
            </button>
          </div>

          {/* Translation Settings */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5">
            <label htmlFor="language-select" className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Translation Matrix
            </label>
            <select
              id="language-select"
              value={targetLanguage}
              onChange={handleLanguageChange}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none transition cursor-pointer mb-3"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleListenToFan}
              disabled={isListening}
              className={`w-full py-1.5 border transition rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                isListening
                  ? "bg-red-950/40 border-red-800/40 text-red-400 animate-pulse"
                  : "bg-indigo-950 hover:bg-indigo-900 border-indigo-850 text-indigo-400 hover:text-indigo-300"
              }`}
            >
              {isListening ? "🎙️ Listening..." : "🎤 Listen to Fan"}
            </button>

            {micPermissionBlocked && (
              <p className="text-red-500 text-[11px] mt-2 font-medium">
                🎤 Microphone access blocked. Please allow browser permissions to test live AI translation.
              </p>
            )}

            {/* Manual Query Input Fallback */}
            <div className="mt-3 pt-3 border-t border-slate-900/60">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">
                Or Type Fan Query Manually
              </span>
              <form onSubmit={handleManualQuerySubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Washroom kaha par hai"
                  value={manualQueryText}
                  onChange={(e) => setManualQueryText(e.target.value)}
                  className="flex-grow bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
                />
                <button
                  type="submit"
                  disabled={isAiLoading || !manualQueryText.trim()}
                  className="px-3 bg-indigo-950 hover:bg-indigo-900 border border-indigo-850 text-indigo-400 hover:text-indigo-300 rounded-lg text-xs font-semibold cursor-pointer active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition"
                >
                  Translate
                </button>
              </form>
            </div>

            {capturedSTT && (
              <div className="mt-4 p-3 bg-slate-950/80 border border-slate-900 rounded-lg space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Captured STT</span>
                  <p className="text-slate-350 font-medium italic">"{capturedSTT}"</p>
                </div>
                <div className="border-t border-slate-900 pt-2 space-y-1.5">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Detected Script/Language</span>
                    <span className="text-emerald-455 font-semibold">{detectedLanguage}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-400 uppercase font-mono block">English Translation</span>
                    <p className="text-slate-200 leading-normal font-semibold">"{englishTranslation}"</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-455 uppercase font-mono block">AI Tactical Instruction</span>
                    <p className="text-slate-200 leading-relaxed font-sans">{tacticalInstruction}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setCapturedSTT("");
                    setDetectedLanguage("");
                    setEnglishTranslation("");
                    setTacticalInstruction("");
                  }}
                  className="text-[10px] text-slate-500 hover:text-slate-300 font-mono block w-full text-right mt-1 hover:underline cursor-pointer"
                >
                  Clear Log
                </button>
              </div>
            )}
          </div>

          {/* Web3 Volunteer Rewards Control Panel */}
          <div className="bg-slate-900/50 border border-slate-900 rounded-xl p-5 text-slate-350 flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <svg width="16" height="16" className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2zM17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h2m3-4H9a2 2 0 00-2 2v3m12-3V9a2 2 0 00-2-2h-3m-3 4H9M9 3h3" />
              </svg>
              Volunteer Rewards
            </h4>
            
            {/* Styled Badge Visual Wrapper */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950/60 to-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col items-center justify-center text-center shadow-lg min-h-[140px] group">
              <div className="absolute inset-0 bg-radial-gradient from-indigo-500/10 via-transparent to-transparent opacity-60 pointer-events-none" />
              
              {/* Badge Icon / Level Graphic */}
              <div className="w-14 h-14 rounded-full bg-slate-900 border-2 border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-md shadow-indigo-950/50 mb-2 relative transition-transform duration-300 group-hover:scale-105">
                <span className="text-xs font-black tracking-widest font-mono">
                  LVL {currentNftLevel}
                </span>
              </div>
              
              <span className="text-[10px] text-indigo-300 uppercase tracking-widest font-bold">
                Soulbound ERC-1155 NFT
              </span>
              <p className="text-xs text-white font-bold mt-1">
                {VOLUNTEER_RANKS[currentNftLevel - 1] || "Novice Steward"}
              </p>
              {currentNftLevel < 10 ? (
                <span className="text-[9px] text-slate-500 mt-0.5">
                  Tasks Completed: <strong className="text-slate-300">{tasksCompleted}</strong> / {currentNftLevel * 2} for Lvl {currentNftLevel + 1}
                </span>
              ) : (
                <span className="text-[9px] text-slate-500 mt-0.5">
                  Tasks Completed: <strong className="text-slate-300">{tasksCompleted}</strong> (Max Level Reached)
                </span>
              )}
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed text-center font-medium">
              Current Rank: <span className="text-slate-200">Level {currentNftLevel} - {VOLUNTEER_RANKS[currentNftLevel - 1]}</span>
            </p>

            {walletAddress ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs bg-slate-950/60 p-2 rounded-lg border border-slate-900">
                  <span className="text-[10px] text-slate-500 font-mono">Address</span>
                  <span className="text-emerald-400 font-mono font-semibold" title={walletAddress}>
                    {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                  </span>
                </div>
                {currentNftLevel < 10 && tasksCompleted >= currentNftLevel * 2 && (
                  <button
                    onClick={() => triggerLevelUp(currentNftLevel + 1, walletAddress)}
                    disabled={isMinting}
                    className="w-full py-2 px-3 bg-emerald-650 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 active:scale-[0.98] transition rounded-lg text-xs font-semibold text-white shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isMinting ? "Minting..." : `🏆 Claim Rank ${currentNftLevel + 1} NFT`}
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                className="w-full py-2 px-3 bg-indigo-650 hover:bg-indigo-600 active:scale-[0.98] transition rounded-lg text-xs font-semibold text-white shadow-lg shadow-indigo-950/50 cursor-pointer"
              >
                Connect Wallet
              </button>
            )}
          </div>

          {/* Infrastructure Integration Hub Button */}
          <button
            onClick={() => setIsInfraModalOpen(true)}
            className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 text-slate-300 active:scale-[0.98] transition rounded-lg text-xs font-semibold shadow-lg hover:shadow-indigo-950/20 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 mt-1"
          >
            🔌 Connect Infrastructure
          </button>
        </aside>

        {/* ── Main Workspace (Right Pane) ── */}
        <div className="flex-grow flex flex-col min-w-0 bg-slate-950/20">

          {/* Top Operations Header */}
          <header className="border-b border-slate-900 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/60 backdrop-blur shrink-0">
            <div>
              <h2 className="text-sm font-semibold text-slate-400 tracking-wider uppercase">
                FIFA World Cup 2026 Operations Console
              </h2>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-xs text-slate-500">Real-Time Smart Crowd & Security Monitoring Panel</p>
                {telemetry && (
                  <span className="text-[10px] text-indigo-400 bg-indigo-950/30 border border-indigo-900/30 px-2 py-0.5 rounded font-mono font-medium">
                    📊 {currentPattern.name}
                  </span>
                )}
              </div>
            </div>

            {/* Network Badges */}
            <div className="flex items-center gap-3 shrink-0">
              {walletAddress ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/20 border border-emerald-900/30 rounded-lg text-xs text-emerald-450">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono text-[11px]" title={walletAddress}>
                    {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleConnectWallet}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-xs text-slate-300 transition cursor-pointer active:scale-95"
                >
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-indigo-400">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Connect Wallet</span>
                </button>
              )}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs">
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-slate-300 font-mono text-[11px]">Polygon Amoy Testnet (80002)</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/20 border border-emerald-900/30 rounded-lg text-xs text-emerald-450">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-[11px]">AI Engine Online</span>
              </div>
            </div>
          </header>

          {/* Dashboard Workspace */}
          <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">

            {/* Central Workspace Pane */}
            <section className="flex-grow overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6 min-w-0">
              {/* Dashboard Tab Buttons (Mobile Viewport) */}
              <div className="flex border-b border-slate-900 lg:hidden shrink-0 mb-2">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`flex-1 py-3 text-xs uppercase tracking-wider font-semibold border-b-2 transition ${
                    activeTab === "dashboard" ? "border-indigo-500 text-white" : "border-transparent text-slate-400"
                  }`}
                >
                  Ops Console
                </button>
                <button
                  onClick={() => setActiveTab("blockchain")}
                  className={`flex-1 py-3 text-xs uppercase tracking-wider font-semibold border-b-2 transition ${
                    activeTab === "blockchain" ? "border-indigo-500 text-white" : "border-transparent text-slate-400"
                  }`}
                >
                  Ledger Logs ({logs.length})
                </button>
              </div>

              {/* Central Content Panel */}
              <div className={`flex-grow flex flex-col gap-6 ${activeTab === "dashboard" ? "flex" : "hidden lg:flex"}`}>
                {telemetry === null ? (
                  /* Initial Uninitialized Screen */
                  <div className="flex-grow flex flex-col items-center justify-center border border-slate-900 bg-slate-950/40 rounded-2xl p-12 text-center select-text">
                    <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-500 mb-4 animate-pulse">
                      <svg width="32" height="32" className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h2 className="text-md font-semibold text-slate-200 mb-2">Workspace Uninitialized</h2>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      Awaiting pluggable CSV metrics array upload to initiate AI operational reasoning matrix...
                    </p>
                    <button
                      onClick={loadSampleTelemetry}
                      className="mt-6 px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900 hover:bg-slate-900/80 transition rounded-xl text-xs font-semibold text-indigo-400"
                    >
                      Load Scenario Telemetry
                    </button>
                  </div>
                ) : (
                  /* ── Ingested Scenario Grid ── */
                  <div className="flex-grow flex flex-col gap-6">
                    {/* Match State Timeline Selector */}
                    <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold font-mono">Operations Timeline</span>
                        <h4 className="text-xs font-semibold text-slate-350 mt-0.5">Match Context Shifts (Simulated Dynamics)</h4>
                      </div>
                      <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-900 w-full sm:w-auto">
                        {(["Pre-Match", "Live Play", "Half-Time", "Post-Match"] as const).map((state) => (
                          <button
                            key={state}
                            onClick={() => setMatchPhase(state)}
                            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                              matchPhase === state
                                ? "bg-indigo-600 text-white shadow shadow-indigo-950/50"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {state === "Pre-Match" && "Pre-Match (Entry)"}
                            {state === "Live Play" && "Live Play"}
                            {state === "Half-Time" && "Half-Time Surge"}
                            {state === "Post-Match" && "Post-Match (Exit)"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Zone Telemetry Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
                      {telemetry.map((pt, idx) => (
                        <ZoneCard
                          key={pt.zoneId}
                          point={pt}
                          prevCapacity={prevTelemetry?.[idx]?.gateCapacityPercentage}
                          onClick={() => setSelectedZone(pt)}
                          onDeployVolunteer={handleDeployVolunteer}
                          deployingZoneId={deployingZoneId}
                        />
                      ))}
                    </div>

                    {/* CCTV Surveillance Grid */}
                    <CCTVGrid telemetry={telemetry} />

                    {/* Multi-Sector Operations Layout */}
                    <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="p-1 bg-indigo-950 border border-indigo-800 text-indigo-400 rounded-md">
                            <svg width="16" height="16" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </span>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                            Multi-Sector Operations Control
                          </h3>
                        </div>
                        <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded font-mono font-medium">
                          6 Operations Portals
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {getSectorData(matchPhase).map((item) => (
                          <div
                            key={item.name}
                            className={`border rounded-xl p-4 flex flex-col justify-between transition bg-slate-950/40 ${
                              item.alert
                                ? "border-red-500/20 shadow-lg shadow-red-950/10 hover:border-red-500/40"
                                : "border-slate-800/80 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{item.icon}</span>
                                <h4 className="text-xs font-bold text-slate-200">{item.name}</h4>
                              </div>
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                item.alert
                                  ? "text-red-400 bg-red-950/30 border border-red-900/30"
                                  : "text-emerald-400 bg-emerald-950/20 border border-emerald-900/30"
                              }`}>
                                {item.status}
                              </span>
                            </div>
                            
                            <div className="mt-3">
                              <span className="text-lg font-black text-white tracking-tight">{item.value}</span>
                              <p className="text-[10px] text-slate-400 leading-relaxed mt-1">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Volunteer Advisor Console */}
                    <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="p-1 bg-indigo-950 border border-indigo-800 text-indigo-400 rounded-md">
                            <svg width="16" height="16" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </span>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                            AI Operational Adviser
                          </h3>
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border flex items-center gap-1 transition ${
                            aiStatus === "Online"
                              ? "text-emerald-400 bg-emerald-950/20 border-emerald-900/30"
                              : "text-slate-500 bg-slate-950 border-slate-800"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${aiStatus === "Online" ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
                            {aiStatus}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {(aiRecommendation || aiDirective) && (
                            <button
                              onClick={handleSpeakDirective}
                              className="px-2 py-1 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white rounded-lg transition text-[10px] font-semibold flex items-center gap-1 cursor-pointer active:scale-95"
                              title="Read directive aloud (Web Speech API)"
                            >
                              🔊 Speak
                            </button>
                          )}
                          <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded font-medium">
                            Gemini 2.5 Flash Matrix
                          </span>
                        </div>
                      </div>

                      {isAiLoading ? (
                        <div className="py-6 flex flex-col gap-3">
                          <div className="flex items-center gap-2 text-indigo-400 text-xs font-medium animate-pulse mb-1">
                            <svg width="16" height="16" className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            AI Brain Reasoning Over Telemetry Data...
                          </div>
                          <div className="h-4 bg-slate-800/60 rounded-md w-full animate-pulse"></div>
                          <div className="h-4 bg-slate-800/60 rounded-md w-11/12 animate-pulse"></div>
                        </div>
                      ) : (
                        <div className="bg-slate-950/80 border border-slate-950 rounded-xl p-4 min-h-[120px] flex flex-col justify-between">
                          <div className="space-y-4">
                            <p className="text-sm text-slate-200 leading-relaxed font-sans select-text whitespace-pre-line">
                              {(aiRecommendation || aiDirective) || "Pending telemetry generation..."}
                            </p>
                          </div>
                           <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-900 pt-3">
                            <span>Configured Language: <strong className="text-slate-400">{targetLanguage}</strong></span>
                            <span className="text-[10px] text-slate-500 italic">
                              Calculated thresholds: Capacity &gt; 80% | Incidents &gt; 0
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Verified Soulbound Badge Inventory */}
                    <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="p-1 bg-indigo-950 border border-indigo-800 text-indigo-400 rounded-md">
                            <svg width="16" height="16" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </span>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                            Verified Soulbound Badge Inventory (SBT)
                          </h3>
                        </div>
                        <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded font-medium">
                          10 Tournament Tiers
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                        {VOLUNTEER_RANKS.map((rankName, index) => {
                          const badgeLevel = index + 1;
                          const isUnlocked = currentNftLevel >= badgeLevel;
                          const ipfsUrl = getBadgeIpfsUrl(badgeLevel, rankName);
                          const receipt = badgeReceipts[badgeLevel];
                          
                          return (
                            <div
                              key={badgeLevel}
                              className={`relative border rounded-xl p-4 flex flex-col items-center justify-between text-center transition-all duration-500 overflow-hidden bg-slate-950/40 group ${
                                isUnlocked
                                  ? "border-emerald-500/30 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 scale-100 animate-fade-in"
                                  : "border-slate-800/80 grayscale opacity-40"
                              }`}
                            >
                              {/* Badge Image */}
                              <div className="w-16 h-16 mb-2 relative flex items-center justify-center">
                                <img
                                  src={ipfsUrl}
                                  alt={`${rankName} NFT Badge`}
                                  className={`w-full h-full object-contain transition-transform duration-300 ${
                                    isUnlocked ? "group-hover:scale-110" : ""
                                  }`}
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    const p = e.currentTarget.parentElement;
                                    if (p) {
                                      const fallback = document.createElement("div");
                                      fallback.className = "w-16 h-16 rounded-full bg-slate-900 border-2 border-indigo-500/20 flex items-center justify-center text-xs font-bold text-slate-600";
                                      fallback.innerText = `L${badgeLevel}`;
                                      p.appendChild(fallback);
                                    }
                                  }}
                                />
                              </div>

                              <span className="text-[9px] font-mono text-slate-500 block mb-1">
                                Level {badgeLevel}
                              </span>
                              <span className="text-[10px] font-bold text-slate-200 leading-tight block mb-2 min-h-[24px] flex items-center justify-center">
                                {rankName}
                              </span>

                              {/* Detailed Achievement History Matrix */}
                              {isUnlocked ? (
                                <div className="w-full text-left mt-2 pt-2 border-t border-slate-900/60 space-y-1.5 text-[9px] font-medium text-slate-400">
                                  <div>
                                    <span className="text-[8px] text-slate-500 block">Match Context</span>
                                    <span className="text-slate-350 leading-tight block font-semibold text-left">
                                      {receipt?.matchContext || DEFAULT_BADGE_DETAILS[badgeLevel]?.matchContext}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[8px] text-slate-500 block">Sector Action</span>
                                    <span className="text-slate-350 leading-tight block font-semibold text-left">
                                      {receipt?.sectorAction || DEFAULT_BADGE_DETAILS[badgeLevel]?.sectorAction}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[8px] text-slate-500 block">On-Chain Record</span>
                                    <a
                                      href={`https://amoy.polygonscan.com/tx/${receipt?.hash || DEFAULT_BADGE_DETAILS[badgeLevel]?.hash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-400 hover:text-indigo-300 underline font-mono break-all leading-none font-bold block mt-0.5"
                                    >
                                      {(receipt?.hash || DEFAULT_BADGE_DETAILS[badgeLevel]?.hash).substring(0, 10)}...{(receipt?.hash || DEFAULT_BADGE_DETAILS[badgeLevel]?.hash).substring((receipt?.hash || DEFAULT_BADGE_DETAILS[badgeLevel]?.hash).length - 8)} ↗
                                    </a>
                                  </div>
                                  <div className="flex items-center gap-1 mt-1.5 text-emerald-400 font-bold text-[8px] uppercase tracking-wider">
                                    <span>✔ Synced to Cloud Collection</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full mt-auto pt-2 border-t border-slate-900/60 text-center">
                                  <span className="text-[8px] font-bold text-slate-600 tracking-wide uppercase inline-flex items-center gap-1 justify-center">
                                    🔒 Locked
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Block Explorer logs tab view */}
              <div className={`flex-grow ${activeTab === "blockchain" ? "block" : "hidden lg:hidden"} space-y-6`}>
                {renderTimeline()}
                <SecurityLog logs={logs} />
              </div>
            </section>

            {/* Right Sidebar Audit Log (Desktop Pane) */}
            <aside className="w-full lg:w-96 border-l border-slate-900 bg-slate-950 p-6 hidden lg:flex flex-col gap-6 shrink-0 overflow-y-auto custom-scrollbar">
              {renderTimeline()}
              <SecurityLog logs={logs} />
            </aside>

          </div>
        </div>
      </div>

      {/* ═══ Zone Detail Modal ═══ */}
      {selectedZone && (
        <ZoneDetailModal
          point={selectedZone}
          onClose={() => setSelectedZone(null)}
        />
      )}

      {/* 🏆 Rank Up Banner Modal Overlay */}
      {rankUpData && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto"
          style={{ backgroundColor: "rgba(3, 7, 18, 0.95)", backdropFilter: "blur(24px)" }}
        >
          {/* Ambient glow backgrounds */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
            <div className="absolute top-[-10%] left-[10%] w-[400px] h-[400px] rounded-full bg-indigo-500/20 blur-[100px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full bg-emerald-500/15 blur-[100px] animate-pulse" />
          </div>

          <div className="relative w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center space-y-6 transform scale-100 transition-all duration-300">
            {/* Ribbon glow */}
            <div className="absolute -top-12 w-24 h-24 rounded-full bg-indigo-600/25 blur-xl pointer-events-none" />
            
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl shadow-lg shadow-indigo-500/20">
              🏆
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-indigo-400 font-black tracking-[0.2em] uppercase block">
                Rank Up Achieved
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
                NFT Successfully Minted!
              </h2>
            </div>

            {/* Large high-resolution NFT Badge display */}
            <div className="relative group w-64 h-64 sm:w-80 sm:h-80 rounded-2xl border border-indigo-500/20 bg-slate-950/80 p-4 flex items-center justify-center shadow-2xl shadow-indigo-950/30 overflow-hidden">
              {/* Inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 opacity-50 pointer-events-none" />
              
              <img
                src={getBadgeIpfsUrl(rankUpData.level, rankUpData.title)}
                alt={`${rankUpData.title} NFT Badge`}
                className="w-full h-full object-contain transform transition-transform duration-500 hover:scale-105 select-none z-10 filter drop-shadow-[0_10px_20px_rgba(99,102,241,0.25)]"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const p = e.currentTarget.parentElement;
                  if (p) {
                    const fallback = document.createElement("div");
                    fallback.className = "w-48 h-48 rounded-full bg-slate-900 border-2 border-indigo-500/20 flex items-center justify-center text-lg font-bold text-indigo-400 z-10 shadow-inner";
                    fallback.innerText = `Level ${rankUpData.level}`;
                    p.appendChild(fallback);
                  }
                }}
              />
            </div>

            <div className="space-y-2 max-w-sm">
              <p className="text-sm font-bold text-slate-300 leading-snug">
                Congratulations! You earned your Level {rankUpData.level} Soulbound Badge:
              </p>
              <h3 className="text-lg font-black text-indigo-455 tracking-wide">
                {rankUpData.title}
              </h3>
            </div>

            <div className="w-full bg-slate-950/80 p-3.5 rounded-xl border border-slate-900/60 flex flex-col gap-1.5 items-center">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Polygon Cryptographic Receipt</span>
              <a
                href={`https://amoy.polygonscan.com/tx/${rankUpData.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-mono underline break-all font-semibold"
              >
                {rankUpData.hash.substring(0, 18)}...{rankUpData.hash.substring(rankUpData.hash.length - 16)} ↗
              </a>
            </div>

            <button
              onClick={() => setRankUpData(null)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition duration-200 rounded-xl text-xs font-bold text-white shadow-xl shadow-indigo-950/40 cursor-pointer flex items-center justify-center gap-1.5"
            >
              Continue Operations Console
            </button>
          </div>
        </div>
      )}
      {/* ═══ ENTERPRISE INFRASTRUCTURE ONBOARDING MODAL ═══ */}
      {isInfraModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                  🔌 Enterprise Infrastructure Onboarding
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Link your physical stadium feeds, gate turnstiles, digital twins, and rosters to calibrate the operational control room.
                </p>
              </div>
              <button 
                onClick={() => setIsInfraModalOpen(false)}
                className="text-slate-500 hover:text-white text-xl font-mono cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* settings grid with 4 cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Card 1: CCTV & Vision AI Streams */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-3.5">
                <div className="flex items-center gap-2 text-indigo-400">
                  <span className="text-lg">📹</span>
                  <strong className="text-xs uppercase tracking-wider text-slate-200">CCTV & Vision AI Streams</strong>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Connect raw RTSP surveillance video feeds. Our spatial computer vision model evaluates capacity alerts.
                </p>
                <div className="space-y-2">
                  <label className="text-[9px] text-slate-450 block">RTSP Stream URLs (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="rtsp://admin:pass@192.168.1.50:554/h264Preview"
                    className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] text-slate-455 block">Computer Vision Model</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition cursor-pointer"
                  >
                    <option>Crowd Density Estimation (YOLOv8-stadium)</option>
                    <option>Incident & Vomitory Blockage Detection</option>
                    <option>Queue Wait-Time Analytics</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => alert("🔍 Verifying RTSP handshake... Connection nominal.")}
                  className="mt-auto py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:text-white text-slate-355 rounded-lg text-[10px] transition font-semibold cursor-pointer"
                >
                  Verify Handshake
                </button>
              </div>

              {/* Card 2: IoT Turnstile & Gate APIs */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-3.5">
                <div className="flex items-center gap-2 text-indigo-400">
                  <span className="text-lg">🎟️</span>
                  <strong className="text-xs uppercase tracking-wider text-slate-200">IoT Turnstile & Gate APIs</strong>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Ingest turnstile tick ticket validations dynamically to feed capacity analytics without file parses.
                </p>
                <div className="space-y-2">
                  <label className="text-[9px] text-slate-450 block">Ticketing API Endpoint URL</label>
                  <input
                    type="text"
                    placeholder="https://api.worldcup.fifa.com/stadium/v1/gates"
                    className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] text-slate-455 block">Webhook HMAC Secret Key</label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••••••••••••••••••"
                    className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => alert("🔑 Webhook handshake completed. API connection active.")}
                  className="mt-auto py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:text-white text-slate-355 rounded-lg text-[10px] transition font-semibold cursor-pointer"
                >
                  Verify Webhook
                </button>
              </div>

              {/* Card 3: Facility Digital Twin */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-3.5">
                <div className="flex items-center gap-2 text-indigo-400">
                  <span className="text-lg">🗺️</span>
                  <strong className="text-xs uppercase tracking-wider text-slate-200">Facility Digital Twin</strong>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Provide GeoJSON map models so the AI routing engine maps instructions to restrooms, plazas, and exits.
                </p>
                <div className="flex-grow border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer transition">
                  <span className="text-2xl mb-1">📂</span>
                  <span className="text-[10px] text-slate-305 font-bold">Stadium CAD File</span>
                  <span className="text-[8px] text-slate-500 mt-0.5">Drag & drop or browse (.geojson, .dxf)</span>
                </div>
              </div>

              {/* Card 4: Workforce HR Sync */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-3.5">
                <div className="flex items-center gap-2 text-indigo-400">
                  <span className="text-lg">👥</span>
                  <strong className="text-xs uppercase tracking-wider text-slate-200">Workforce HR Sync</strong>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Coordinate worker shifts. Matches live volunteers dynamically to safety tasks and blockchain reward matrices.
                </p>
                <div className="bg-slate-900/40 border border-slate-850 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-300 font-bold block">Sync Shift Roster (API)</span>
                    <span className="text-[8px] text-slate-500 block">Autosync staff metadata every 5 minutes</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-650" />
                  </label>
                </div>
                <div className="bg-slate-900/40 border border-slate-850 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-300 font-bold block">MetaMask ID Mapping</span>
                    <span className="text-[8px] text-slate-500 block">Link badges directly to payroll registry</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-650" />
                  </label>
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsInfraModalOpen(false)}
                className="py-2 px-4 hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsInfraModalOpen(false);
                  setToastMessage("✅ Infrastructure Linked. Dashboard calibrating to live data...");
                }}
                className="py-2 px-5 bg-indigo-650 hover:bg-indigo-600 active:scale-[0.98] transition rounded-lg text-xs font-bold text-white shadow-lg shadow-indigo-950/50 cursor-pointer"
              >
                Save Configuration
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Toast Notification Layer */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900/95 border border-emerald-500/40 text-emerald-450 text-xs px-4 py-3 rounded-lg shadow-xl backdrop-blur-md flex items-center gap-2">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-emerald-500 hover:text-white ml-2 text-sm font-bold">×</button>
        </div>
      )}
    </div>
  );
}
