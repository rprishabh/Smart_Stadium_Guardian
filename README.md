# 🏟️ Smart Stadium Guardians - FIFA 2026 Operations Console

A multi-user, AI-powered real-time command center for mega-event volunteer operations. Built for hackathon evaluation, this dashboard simulates live stadium telemetry, integrates AI-driven foreign language translation for crowd support, and permanently logs operational tasks to the Polygon blockchain via Google Firebase.

## High-Level Architecture
This application utilizes a modern serverless stack to manage real-time crowds:
*   **Frontend Interface:** React + Tailwind CSS + Web Speech API (Microphone) & Geolocation API.
*   **Google Services:** Firebase Authentication (User Login) & Firestore (Cryptographic Audit Logging).
*   **AI Engine:** Google Gemini API (Multilingual Fan Intent Translation & Tactical Stadium Routing).
*   **Web3 Ledger:** Polygon Amoy Testnet (Soulbound ERC-1155 NFT Generation for Volunteer Action Verification).

---

## 🔑 Hackathon Evaluation Credentials
To bypass standard user registration and access the full dashboard footprint, please use our pre-configured judge credentials:

> **Email:** `volunteer1@stadium.com`
> **Password:** `password123`
> *(Alternatively, use the "Bypass / Explore as Guest Judge" button on the login screen for 1-click access).*

---

## Step-by-Step Testing Guide

We have built a "Guided Sandbox" so you can easily test the dynamic features without waiting for an automated timer. 

**1. Test the Match Timeline States**
*   Use the 4 buttons at the top (`Pre-Match`, `Live Play`, `Half-Time`, `Post-Match`).
*   Observe how the 6 Multi-Sector portals instantly change alert statuses and the scoreboard syncs to the match clock.

**2. Test the Live AI Translation Matrix**
*   Select a language from the dropdown (e.g., `Hindi`).
*   Click **"Listen to Fan"** (Accept microphone permissions).
*   Speak a phrase like "Where is my seat?" or "Washroom kidhar hai". 
*   Observe Gemini translating the phrase to English and providing a contextual routing instruction based on the active Match Timeline.

**3. Test the Cryptographic Volunteer Deployment**
*   Identify a sector showing a Red "ALERT" status.
*   Click **"Deploy Volunteer to Resolve"**.
*   Accept the MetaMask transaction prompt (requires Polygon Amoy Testnet).
*   Observe the live Geolocation capture, the Firebase Firestore sync, and the new verifiable transaction hash populating the Live Shift Timeline on the right.
