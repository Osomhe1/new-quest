# Day 2 Log: Semantic Intent vs Deterministic Arithmetic

## Focus
Defining stage-specific SLAs, calendar math, and the boundary between deterministic code and LLM reasoning.

## What Was Attempted
- Configured realistic recruitment SLAs across 8 stages:
  - `Applied`: 3 days
  - `Screening`: 2 days
  - `Take-Home`: 3 days
  - `Technical Interview`: 3 days
  - `Onsite / Final`: 2 days
  - `Debrief`: 1 day (urgent)
  - `Offer Discussion`: 2 days
  - `Offer Extended`: 2 days
- Attempted to pass raw dates to the LLM and asked it to calculate *"how many business days have elapsed since last activity relative to today, excluding weekends."*

## What Broke & What Failed
- **LLM Hallucinated Math:** The LLM consistently botched the business-day calculations.
  - For a date of Friday, March 20, 2026 evaluated against Wednesday, March 25, 2026, the model sometimes said 5 days, sometimes 4 days, and occasionally claimed Sunday was a business day!
  - It failed to maintain consistent calendar math across multi-turn prompts.
- **Latency & Cost Waste:** Asking an LLM to perform basic integer calendar math consumed needless tokens and was nondeterministic.

## AI Usage & Iteration
- **Architectural Pivot:** Decided on a strict separation of concerns:
  1. **Deterministic Core:** TypeScript functions (`calculateCalendarDays`, `calculateBusinessDays`) compute exact timestamps, weekends, and SLA breach days mathematically.
  2. **AI Reasoning:** The LLM receives pre-calculated metrics (`businessDaysStalled: 3`, `slaBreachDays: 1`) along with the candidate notes and context, focusing 100% of its cognitive capacity on root-cause analysis, communication channel selection, and message tone.

## Unlearning Reflection
- **Habit Dropped:** *The "All-or-Nothing LLM" fallacy.* (Assuming that an AI-first tool means letting the LLM do every single computation).
- **New Approach:** **Hybrid Cognitive Architecture**. Use deterministic math where computers excel (arithmetic, dates), and use LLM reasoning where human judgment and empathy excel (nuance, tone, contextual priorities).
