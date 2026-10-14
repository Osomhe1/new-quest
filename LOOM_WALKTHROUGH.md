# 5-Minute Loom Video Walkthrough: Stall Alerter

> **Video Link:** [Click here to watch the 5-Minute Loom Walkthrough](https://www.loom.com/share/stall-alerter-walkthrough-submission) *(Replace with your recorded Loom URL)*

---

## 🎬 Presentation Overview
- **Total Duration:** Exactly 5 minutes (300 seconds)
- **Target Audience:** Engineering & Talent Operations Leadership / Hiring Evaluators
- **Core Message:** How building AI-first meant unlearning traditional imperative habits, embracing a hybrid cognitive architecture, and raising the load until the system broke.

---

## ⏱️ Timestamped Video Script

### Segment 1: The Problem & The Shift in Mindset (0:00 - 0:50)
- **Visual:** Facecam + `intent.md` on screen.
- **Speaking Points:**
  - *"Welcome! For this 5-day challenge, I chose Format C: The Hiring Board Stall Alerter."*
  - *"In high-growth companies, great candidates don't get rejected—they get stalled. Interviewers forget scorecards, hiring managers travel, and recruiters suffer from alert fatigue."*
  - *"The traditional approach would be writing a brittle 500-line Python or TypeScript script with rigid regular expressions. The naive AI approach would be asking ChatGPT to read the whole CSV and guess what to do."*
  - *"In `intent.md`, I set out to prove a different hypothesis: a Hybrid Cognitive Architecture where deterministic algorithms handle exact business-day arithmetic, and AI acts as an autonomous talent operations copilot."*

---

### Segment 2: Architecture & The Unlearning (0:50 - 1:45)
- **Visual:** Show `unlearning.md` and the architecture diagram in `README.md`.
- **Speaking Points:**
  - *"The biggest unlearning of this sprint was the 'All-or-Nothing LLM' fallacy. On Day 2, I asked the LLM to calculate business days between March 20 and March 25 excluding weekends. It hallucinated dates, gave off-by-one errors, and wasted tokens."*
  - *"I unlearned that. Computers are great at calendar arithmetic; AI is great at semantic reasoning and empathy."*
  - *"Our architecture uses a Deterministic-Semantic Sandwich: deterministic parsing and SLA arithmetic feed into a multi-factor urgency engine, which feeds into a strictly prompted Gemini reasoning engine governed by `directive.md`."*

---

### Segment 3: Live Terminal CLI Demo (1:45 - 2:45)
- **Visual:** Terminal running `npm run cli -- analyze data/clean_board.csv -r 2026-03-25`.
- **Speaking Points:**
  - *"Let's see it live. I run `stall-alert analyze` on our baseline board."*
  - *"Notice what happens: Out of 10 candidates, the engine immediately identifies 8 stalled pipelines, sorted by urgency."*
  - *"Elena Rostova is #1. Why? She's in 'Offer Extended' with an active competing offer from Stripe expiring on Friday. The tool doesn't just say she's stalled—it prescribes an exact action: 'Initiate immediate closing call with Elena and HM Marcus Vance'."*
  - *(Run inspect command:)* `npm run cli -- inspect CAND-101 data/clean_board.csv -r 2026-03-25`
  - *"When I run `inspect`, it renders a complete candidate dossier and a ready-to-send draft email tailored to her situation, crediting her recruiter and hiring manager."*

---

### Segment 4: Raising the Load & The Web Dashboard (2:45 - 4:10)
- **Visual:** Switch to browser at `http://localhost:3000`.
- **Speaking Points:**
  - *"Now let's talk about Raising the Load. Anyone can build a demo that works on 5 clean rows. What happened when we made it hard?"*
  - *(Click 'Messy Real-World' button in Web UI:)* *"Here on `messy_board.csv`, headers are corrupted, dates are in American MM/DD/YYYY, ISO, and 'N/A' formats. The system resiliently auto-repairs them and flags ingestion warnings without crashing."*
  - *"On Day 3, we uncovered a critical failure: **The Priority Inversion Bug**. A cold resume sitting in 'Applied' for 18 days accumulated more linear points than an active written offer, ranking #1! In recruiting, that's disastrous. I had to completely rewrite the scoring engine to implement non-linear stage multipliers, score caps on passive stages, and emergency bonuses for competing offers."*
  - *(Click 'High-Load Adversarial' button:)* *"Under adversarial load with 15 complex candidates, competing offers and executive referrals stay locked at P0. With one click, the recruiter can copy the draft message directly to their clipboard."*

---

### Segment 5: Test Suite, Honesty, & Conclusion (4:10 - 5:00)
- **Visual:** Terminal running `npm test`.
- **Speaking Points:**
  - *"Finally, quality and honesty. I'm running `npm test`—all 14 unit and integration tests pass in under 3 seconds across parser resilience, business-day math, priority rankings, and AI fallback behavior."*
  - *"Notice that if the Gemini API is offline or without keys, the deterministic fallback engine kicks in automatically with zero downtime."*
  - *"This project changed how I work. AI isn't an autocomplete tool or a toy chatbot; when paired with defensive systems engineering and honest stress-testing, it's a force multiplier. Thank you!"*

---

## 🛠️ Recording Tips for the Submitter
1. Open two windows side-by-side or use fullscreen:
   - Left: Terminal with clear font (font size 16-18)
   - Right: Chrome at `http://localhost:3000`
2. Start the web server beforehand: `npm run web`
3. Have terminal commands pre-typed or ready in command history:
   - `npm run cli -- analyze data/clean_board.csv -r 2026-03-25`
   - `npm run cli -- inspect CAND-101 data/clean_board.csv -r 2026-03-25`
   - `npm run stress-test`
   - `npm test`
4. Keep the pace crisp and confident. Focus on what was **unlearned** and **what broke**.
