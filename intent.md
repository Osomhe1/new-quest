# Intent: AI-First Hiring Board Stall Alerter

## 1. Problem Framing
Hiring pipelines in high-growth engineering and talent organizations suffer from a silent, compounding failure mode: **pipeline stall**. 

Candidates drop off not because they failed an interview, but because they languished uncontacted across stages—waiting for an interviewer to submit a scorecard, waiting for a hiring manager to approve a leveling decision, or waiting for a recruiter to send an offer letter. 

In traditional HR tooling (ATS platforms like Greenhouse, Lever, Ashby), teams either rely on manual human review or rigid static notifications that fire indiscriminately. The results are familiar:
- **Alert Fatigue:** 200 daily emails warning that resumes are older than 3 days.
- **Priority Inversion:** A recruiter spends the morning rejecting 14-day-old cold inbound resumes while an active VP candidate with a 24-hour competing offer from Stripe sits unattended in "Offer Extended".
- **Action Paralysis:** Standard notifications state *that* someone is stalled, but never prescribe *who* owns the bottleneck or *what* exact message should be sent to resolve it.

## 2. The AI-First Hypothesis
**Hypothesis:** An effective hiring operations tool in 2026 cannot be built purely with traditional imperative heuristics (which break under schema variations and miss textual nuance) nor can it be built purely with end-to-end generative LLM calls (which hallucinate calendar dates, fail at business-day math, and introduce latency).

Instead, the AI-first architecture must be a **Hybrid Cognitive Pipeline**:
1. **Deterministic Foundation:** Deterministic business logic handles date parsing, calendar-versus-business-day arithmetic, and mathematical SLA thresholds.
2. **Semantic Extraction & Urgency Reasoning:** An AI reasoning engine inspects unstructured recruiter notes, interview feedback, and tags to detect high-stakes contextual risks (e.g., competing offers, visa deadlines, scorecard bottlenecks, executive referrals).
3. **Action Generation:** The AI acts as an autonomous talent operations copilot, synthesizing candidate history, bottleneck ownership, and communication tone to generate ready-to-send draft messages tailored to the recipient.

## 3. Scope & 5-Day Plan
Rather than build an sprawling ATS clone, the 5-day goal was to build a focused, resilient, high-load CLI and Web tool:
- **Input:** Any messy CSV export from an ATS hiring board.
- **Processing:** Resilient parsing -> Stage canonicalization -> Multi-factor SLA urgency scoring -> Semantic risk extraction -> Action prescription.
- **Outputs:**
  - An interactive terminal CLI with triage tables and deep candidate inspection.
  - A local responsive web dashboard for one-click draft copying and visual pipeline health inspection.
  - Full automated stress-test suite comparing clean, messy, and adversarial datasets.

## 4. What Success Looks Like
1. **Resilience to Chaos:** The tool must ingest realistic, corrupted CSV boards without crashing, auto-correcting dates, handling missing columns, and surfacing clear ingestion health warnings.
2. **Zero Priority Inversion:** High-stake candidates with flight risks or competing deadlines must reliably outrank cold backlog applicants.
3. **Turnkey Utility:** Every alert must produce a concrete owner, an action channel, and an immediate, copy-pasteable communication draft.
