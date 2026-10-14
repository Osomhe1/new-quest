# 5-Day Development Chronicle: Stall Alerter

This chronicle aggregates the daily progress, technical pivots, and honest post-mortems over the 5-day AI-first build.

---

## Day 1: The "AI as Autocomplete" Trap
- **Objective:** Scaffolding the domain model, establishing baseline clean CSV ingestion, and initial prompt design.
- **Hypothesis:** A general LLM prompt could triage candidates directly from CSV rows.
- **What Failed:** The AI generated vague, uniform advice (*"Follow up with candidate"*) and recommended contacting candidates when the blocker was an internal interviewer missing a scorecard.
- **Key Realization:** Treating AI as a text autocomplete produces shallow results. Shifted toward defining explicit system directives, role boundaries, and JSON output contracts.

---

## Day 2: Semantic Intent vs Deterministic Arithmetic
- **Objective:** Implementing stage-specific SLAs and measuring business-day pipeline velocity.
- **Hypothesis:** The LLM could handle date subtraction and weekend filtering.
- **What Failed:** The model hallucinated calendar arithmetic, produced off-by-one errors on weekends, and introduced unnecessary token latency.
- **Key Realization:** Adopted a **Hybrid Cognitive Architecture**: deterministic TypeScript algorithms calculate exact business-day math, while the AI focuses on semantic note interpretation, risk factor extraction, and draft communication synthesis.

---

## Day 3: Raising the Load — Dirty Data & Priority Inversion
- **Objective:** Stress-testing against messy, realistic CSV exports (`data/messy_board.csv`).
- **Hypothesis:** A standard CSV parser and linear urgency score (`days * SLA`) would handle edge cases.
- **What Failed:** 
  1. Corrupted dates (`MM/DD/YYYY` vs `ISO-8601` vs `N/A`) crashed parsing.
  2. The **Priority Inversion Bug**: A cold inbound applicant sitting in `Applied` for 18 days was ranked #1 above a critical offer with a 48-hour competing offer from Stripe.
- **Key Realization:** Replaced naive linear scoring with a multi-factor formula incorporating stage weights, early-stage score caps, and emergency bonuses for competing offers.

---

## Day 4: Adversarial Stress & Hallucination Breakdown
- **Objective:** Injecting adversarial scenarios (ghosted candidates, split debrief loops, multi-offer deadlocks) and simulating network/API limits.
- **Hypothesis:** External LLM calls could serve as the sole execution engine.
- **What Failed:** Markdown code-block wrappers broke `JSON.parse`, and missing API keys crashed test pipelines.
- **Key Realization:** Built a defensive dual-engine architecture: Gemini API for rich AI synthesis when available, backed by an intelligent, deterministic contextual rule engine for 100% offline uptime and zero-crash test execution.

---

## Day 5: Convergence, UI Delivery, & Production Hardening
- **Objective:** Delivering dual interfaces (Commander CLI and Express Web Dashboard) and running automated test suites.
- **What Failed:** Minor flag collisions in Commander (`--ref` vs `--reference-date`) and double-counting days stalled in urgency scoring.
- **Outcome:** 14/14 tests passing in Vitest, sub-30ms processing speeds, and a complete web dashboard allowing 1-click copying of tailored follow-up drafts.
