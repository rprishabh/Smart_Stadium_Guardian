# 🛡️ Stadium Guardian - FIFA World Cup Ops Centre

An AI-powered, Web3-enabled smart event operations dashboard designed to coordinate frontline volunteers, automate multi-sector crowd control dynamics, and protect stadium integrity for mega-scale global sporting events like the FIFA World Cup 2026.

Live Application Link: https://smart-stadium-guardians.web.app/

---

## 🏆 Chosen Vertical & Problem Statement
* **Vertical:** Smart Infrastructure / Event Operations & Crowd Management
* **The Problem:** Mega-events suffer from massive logistical friction—chaotic bottlenecks, disconnected communication networks, high turnstile stress, language barriers among international fans, and zero transparency for post-match security audits. 
* **The Solution:** Stadium Guardian serves as a centralized "brain" that acts as a real-time command station. It integrates live infrastructure telemetry with predictive AI orchestration and blockchain incentives to keep stadium staff dynamic, unified, and efficient.

---

## 🧠 Core Engineering Architecture & Logic

### 1. Ingestion & Telemetry Pipeline
* **Real-World Vision:** Built to connect seamlessly to physical stadium infrastructure including raw RTSP streams from IoT CCTV camera vision grids, ticketing API endpoints for gate turnstiles, and GeoJSON facility digital twins.
* **Sandbox Validation:** Features a native `Inject Scenario Dataset` controller and a manual CSV file parse pipeline allowing evaluators to simulate rapid capacity surges and gate incidents across major stadium zones (Gates A through D).

### 2. Google Gemini 3.5 Flash Orchestration
* **AI Operational Adviser:** The system scans live sector data matrices continuously. When capacity crosses critical thresholds ($>80\%$), Gemini 3.5 Flash computes real-time crowd diversion scripts and pushes actionable, clear instructions directly to operators.
* **Multilingual Translation Matrix:** Integrates the Web Speech API with Gemini's high-performance linguistic capabilities. Volunteers capture fan audio queries spoken in diverse languages (e.g., Hindi, Spanish, Arabic), which Gemini instantly translates into English while returning structured routing and safety procedures.

### 3. Web3 Integrity & Accountability
* **Polygon Amoy Audit Trail:** To prevent log tampering during high-stakes security threats, all critical capacity updates and active incidents are committed directly to the Polygon Amoy Testnet via Web3 smart contracts.
* **Soulbound ERC-1155 Rewards:** Volunteers connect their decentralized MetaMask identity to unlock untransferable Soulbound tokens (SBTs) that track their operational achievements, transforming volunteer management into a transparent, gamified pipeline.

### 4. AI Operational Robustness & Architectural Elegance
* **Strict Constraint-Driven Component Architecture:** Component rendering separates functional logic, layout rendering, and mock datasets into strict boundaries. Design themes are mapped systematically to CSS variables to enforce premium, high-contrast visual clarity.
* **Zod LLM Output Validation:** Employs strict `zod` schema parsing on Google Gemini 3.5 Flash JSON output structures. If the model returns malformed JSON, Zod immediately flags validation errors, keeping the data models deterministic and preventing downstream parsing failures.
* **Input Boundary Scanning & Graceful Failure:** Defends the console dashboard using a robust React `ErrorBoundary` wrapper that intercepts runtime crashes. Cleans and sanitizes inputs via regex boundaries (`maxLength={200}`) to block scripting vectors, malformed unicode characters, or emoji floods from causing crash exceptions.

---

## 📐 Architectural Elegance & Edge Case Handling
To ensure enterprise-grade reliability, Stadium Guardian is built with constraint-driven component architecture:
* **LLM Output Validation:** All dynamic JSON responses from the Gemini 3.5 Flash engine are strictly validated using **Zod schemas** at runtime. This prevents malformed AI hallucinations from breaking the React state.
* **Input Boundary Scanning:** The Telemetry Pipeline and Translation Matrix feature aggressive input sanitation, gracefully catching unicode injections, empty payloads, and character-limit breaches without system crashes.
* **Modular Service Decomposition:** Core telemetry ingestion, Web3 audit logging, and AI routing logic are decoupled into isolated service layers, ensuring maintainability and scalability for distributed deployment.
* **State Integrity:** The application utilizes Global Error Boundaries to ensure that compound edge scenarios (e.g., network failure during a state transition) fail gracefully without corrupting the operational command view.

---

## 🛠️ How to Run & Verify Functionality

1. **Onboard Infrastructure:** Click the `Connect Infrastructure` dashboard element to view the enterprise turnstile hooks and Vision AI setup.
2. **Inject Test State:** Go to the `Quick Sandbox` panel and click `Inject Scenario Dataset` to populate the dynamic operations console with active alerts.
3. **Trigger AI Reasoning:** Scroll down to the `AI Operational Adviser` block to inspect the customized tactical recommendations compiled by the Gemini engine.
4. **Test Translation Matrix:** Enter an international text query manually in the translation matrix console to review structured JSON data parsing.
5. **Audit On-Chain State:** Link your MetaMask wallet to view your active Soulbound token tiers and click out to verify the live block explorer transaction records.

---

## 📝 Architectural Assumptions
* Automated CCTV metrics assume pre-processed bounding box data provided by a dedicated edge deployment running YOLOv8 crowd density frameworks.
* Blockchain states assume minor transaction gas parameters are subsidized via standard platform developer relayer infrastructure to keep entry barriers low for non-technical volunteers.
