# Day 3 Log: Raising the Load — Dirty Data & Priority Inversion

## Focus
Injecting real-world chaos, messy CSV schemas, corrupted dates, and evaluating ranking behavior under pressure.

## What Was Attempted
- Created `data/messy_board.csv` containing irregular headers (`applicant_name`, `Job Title`, `Status`, `Last Updated`, `HM`, `Blocker`, `Feedback`), conflicting date formats (`MM/DD/YYYY`, `YYYY/MM/DD`, `M-D-YYYY`, `ISO-8601`, and `N/A`), and unassigned next-step owners.
- Ran the pipeline against this messy dataset to observe triage behavior.

## What Broke & What Failed
1. **Header Collapse:** The parser crashed because `applicant_name` was not normalized to `name`.
2. **Date Parser Exceptions:** Format `03/14/2026` threw an invalid date in one environment, while `N/A` produced an `Invalid Date` timestamp that poisoned the sorting algorithm.
3. **The Priority Inversion Bug (Major Flaw):**
   - Candidate Dmitri had been sitting in the `Applied` stage for 18 business days.
   - Candidate Elena was in `Offer Extended` with an active competing offer from Stripe expiring in 48 hours, stalled for 3 business days.
   - The naive formula (`urgencyScore = daysStalled * 4`) ranked Dmitri at the very top of the priority list with a massive score of 120+, burying Elena at rank #7!
   - In real-world talent operations, this is catastrophic. An unreviewed inbound resume is cold backlog; an expiring written offer is an existential fire.

## AI Usage & Iteration
- Refactored `src/parser/csvParser.ts` to implement resilient fuzzy header matching and multi-format date extraction with non-fatal ingestion warnings.
- Overhauled `src/analyzer/stallAnalyzer.ts` to implement a multi-factor urgency formula:
  - Base stage criticality multipliers (`Offer Extended`: 3.5x, `Debrief`: 3.0x, `Applied`: 1.0x).
  - Diminishing returns / score cap on `Applied` stages (capped at 40 points).
  - P0 emergency bonus for detected `Competing Offer` signals (+110 points).
  - Switched breach severity from volatile ratios (sensitive to 1-day SLAs) to absolute `slaBreachDays`.

## Unlearning Reflection
- **Habit Dropped:** *Assuming clean inputs and linear metrics.*
- **New Approach:** **Adversarial stress-testing early.** Real systems fail when linear models collide with non-linear business stakes.
