import { describe, it, expect } from 'vitest';
import {
  generateDeterministicActionPlan,
  generateActionPlan,
  enrichAnalysesWithActions,
} from '../src/ai/actionPlanner.js';
import { StallAnalysis, Candidate } from '../src/types/index.js';

describe('AI Action Planner & Guardrails', () => {
  const sampleCandidate: Candidate = {
    id: 'CAND-001',
    name: 'Elena Rostova',
    email: 'elena@example.com',
    role: 'Staff Backend Engineer',
    department: 'Core Platform',
    stage: 'Offer Extended',
    canonicalStage: 'Offer Extended',
    lastActivityDate: new Date('2026-03-20'),
    lastActivityDateRaw: '2026-03-20',
    hiringManager: 'Marcus Vance',
    recruiter: 'Jessica Alba',
    nextStepOwner: 'Recruiter',
    notes: 'Candidate has a competing offer from Stripe expiring Friday.',
    tags: ['urgent', 'competing_offer'],
    isArchived: false,
  };

  const sampleStall: StallAnalysis = {
    candidate: sampleCandidate,
    daysSinceLastActivity: 5,
    businessDaysStalled: 3,
    slaThresholdDays: 2,
    isStalled: true,
    slaBreachDays: 1,
    slaBreachRatio: 1.5,
    urgencyScore: 85,
    urgencyLevel: 'CRITICAL',
    detectedRisks: ['🚨 Competing Offer / Tight Decision Deadline'],
    responsibleOwner: 'Jessica Alba',
  };

  it('generates a high-conviction action plan via deterministic engine', () => {
    const plan = generateDeterministicActionPlan(sampleStall);

    expect(plan.actionSummary).toContain('Elena Rostova');
    expect(plan.actionSummary).toContain('competing');
    expect(plan.targetAudience).toContain('Candidate');
    expect(plan.draftSubject).toContain('offer');
    expect(plan.draftMessage).toContain('Marcus Vance');
    expect(plan.isAIGenerated).toBe(false);
  });

  it('gracefully handles missing API keys by using the fallback engine', async () => {
    // Calling with empty or undefined key
    const plan = await generateActionPlan(sampleStall, '');
    expect(plan).toBeDefined();
    expect(plan.draftMessage.length).toBeGreaterThan(20);
    expect(plan.isAIGenerated).toBe(false);
  });

  it('enriches a batch of stall analyses with action plans', async () => {
    const enriched = await enrichAnalysesWithActions([sampleStall]);
    expect(enriched.length).toBe(1);
    expect(enriched[0].actionPlan).toBeDefined();
    expect(enriched[0].actionPlan?.draftSubject).toBeDefined();
  });
});
