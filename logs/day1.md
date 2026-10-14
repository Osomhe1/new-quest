# Day 1 Log: The "AI as Autocomplete" Trap

## Focus
Scaffolding the Stall Alerter problem space, initial data modeling, and confronting legacy developer habits.

## What Was Attempted
- Modeled the core candidate entity (`Candidate`, `PipelineStage`, `StallAnalysis`).
- Created a baseline dataset of 12 candidates across standard hiring stages (`data/clean_board.csv`).
- Initially prompted the AI naively: *"Look at this candidate row and tell me what the recruiter should do."*

## What Broke & What Failed
- **Vague Outputs:** The early LLM outputs were utterly generic. For almost every candidate, it gave boilerplate advice: *"Send a follow-up email to check on their status."*
- **Ignored Internal Bottlenecks:** When a candidate was stuck in `Debrief` because two interviewers hadn't submitted scorecards, the AI suggested emailing the candidate to ask if they had questions! This would have actively damaged candidate experience by revealing internal disorganization.
- **Developer Habit Trap:** My immediate instinct was to write 300 lines of imperative `if/else` checks to catch every stage and manually hardcode strings.

## AI Usage & Iteration
- Realized that treating AI as a code autocomplete or a magical one-shot oracle is ineffective.
- Started defining an explicit system directive (`directive.md`) with role constraints: the AI is a **Talent Operations Copilot**, not a customer support bot.
- Established the need for structured JSON schema outputs instead of freeform prose.

## Unlearning Reflection
- **Habit Dropped:** *Thinking in isolated function syntax.*
- **New Approach:** Thinking in **contracts, directives, and system roles**. The prompt is not a comment; it is an architectural interface.
