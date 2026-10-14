import { describe, it, expect } from 'vitest';
import {
  calculateBusinessDays,
  calculateCalendarDays,
  extractRiskFactors,
  analyzeCandidateStall,
  evaluateHiringBoard,
  DEFAULT_SLA_CONFIG,
} from '../src/analyzer/stallAnalyzer.js';
import { Candidate } from '../src/types/index.js';

describe('Stall Analyzer & Urgency Scoring Engine', () => {
  it('calculates business days correctly across weekends', () => {
    // Friday March 20, 2026 to Wednesday March 25, 2026
    // Sat 21 and Sun 22 should be excluded: Mon 23, Tue 24, Wed 25 = 3 business days
    const fri = new Date(2026, 2, 20); // Note: Month is 0-indexed (2 = March)
    const wed = new Date(2026, 2, 25);
    const busDays = calculateBusinessDays(fri, wed);
    const calDays = calculateCalendarDays(fri, wed);

    expect(busDays).toBe(3);
    expect(calDays).toBe(5);
  });

  it('detects multiple risk keywords in notes and tags', () => {
    const candidate: Candidate = {
      id: 'C-1',
      name: 'Alice',
      email: 'alice@example.com',
      role: 'Staff Eng',
      department: 'Infra',
      stage: 'Offer Discussion',
      canonicalStage: 'Offer Discussion',
      lastActivityDate: new Date('2026-03-20'),
      lastActivityDateRaw: '2026-03-20',
      hiringManager: 'Marcus',
      recruiter: 'Jessica',
      nextStepOwner: 'Recruiter',
      notes: 'Candidate has a competing offer from Meta expiring on Friday. Executive referral by CEO.',
      tags: ['urgent', 'competing_offer'],
      isArchived: false,
    };

    const risks = extractRiskFactors(candidate);
    expect(risks.some((r) => r.includes('Competing Offer'))).toBe(true);
    expect(risks.some((r) => r.includes('Executive Referral'))).toBe(true);
  });

  it('solves priority inversion: urgent offer with competing deadline outranks long-stalled resume review', () => {
    const refDate = new Date(2026, 2, 25);

    // Candidate A: Offer Extended, stalled 3 business days, competing offer
    const candA: Candidate = {
      id: 'C-A',
      name: 'Elena Rostova',
      email: 'elena@example.com',
      role: 'Staff Engineer',
      department: 'Platform',
      stage: 'Offer Extended',
      canonicalStage: 'Offer Extended',
      lastActivityDate: new Date(2026, 2, 20), // Friday -> Wed = 3 business days
      lastActivityDateRaw: '2026-03-20',
      hiringManager: 'Marcus',
      recruiter: 'Jessica',
      nextStepOwner: 'Recruiter',
      notes: 'Competing offer deadline approaching. High priority.',
      tags: ['competing_offer'],
      isArchived: false,
    };

    // Candidate B: Applied stage, unreviewed for 15 business days, no competing offer
    const candB: Candidate = {
      id: 'C-B',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Junior Analyst',
      department: 'Marketing',
      stage: 'Applied',
      canonicalStage: 'Applied',
      lastActivityDate: new Date(2026, 2, 4), // 15 business days ago
      lastActivityDateRaw: '2026-03-04',
      hiringManager: 'Rachel',
      recruiter: 'David',
      nextStepOwner: 'Recruiter',
      notes: 'General application received.',
      tags: [],
      isArchived: false,
    };

    const summary = evaluateHiringBoard([candA, candB], refDate);

    // Candidate A MUST be ranked #1 despite fewer calendar days stalled
    expect(summary.analyses.length).toBe(2);
    expect(summary.analyses[0].candidate.id).toBe('C-A');
    expect(summary.analyses[0].urgencyLevel).toBe('CRITICAL');
  });

  it('ignores archived and rejected candidates in the triage list', () => {
    const refDate = new Date(2026, 2, 25);
    const activeCand: Candidate = {
      id: 'C-Active',
      name: 'Active Cand',
      email: '',
      role: 'Dev',
      department: 'Eng',
      stage: 'Technical Interview',
      canonicalStage: 'Technical Interview',
      lastActivityDate: new Date(2026, 2, 16),
      lastActivityDateRaw: '2026-03-16',
      hiringManager: 'HM',
      recruiter: 'Recruiter',
      nextStepOwner: 'HM',
      notes: 'Waiting on feedback',
      tags: [],
      isArchived: false,
    };

    const archivedCand: Candidate = {
      id: 'C-Archived',
      name: 'Archived Cand',
      email: '',
      role: 'Dev',
      department: 'Eng',
      stage: 'Archived',
      canonicalStage: 'Archived',
      lastActivityDate: new Date(2026, 2, 1),
      lastActivityDateRaw: '2026-03-01',
      hiringManager: 'HM',
      recruiter: 'Recruiter',
      nextStepOwner: 'None',
      notes: 'Declined offer',
      tags: [],
      isArchived: true,
    };

    const summary = evaluateHiringBoard([activeCand, archivedCand], refDate);
    expect(summary.totalEvaluated).toBe(1);
    expect(summary.analyses.some((a) => a.candidate.id === 'C-Archived')).toBe(false);
  });
});
