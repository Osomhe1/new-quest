import {
  Candidate,
  PipelineStage,
  SLAConfig,
  StallAnalysis,
  UrgencyLevel,
  AnalysisSummary,
  ParsingWarning,
} from '../types/index.js';

export const DEFAULT_SLA_CONFIG: SLAConfig = {
  businessDaysOnly: true,
  defaultThresholdDays: 3,
  stageSLADays: {
    Applied: 3,
    Screening: 2,
    'Take-Home': 3,
    'Technical Interview': 3,
    'Onsite / Final': 2,
    Debrief: 1,
    'Offer Discussion': 2,
    'Offer Extended': 2,
    Unknown: 3,
  },
  stageWeights: {
    'Offer Extended': 3.5,
    'Offer Discussion': 3.2,
    Debrief: 3.0,
    'Onsite / Final': 2.5,
    'Technical Interview': 2.0,
    'Take-Home': 1.8,
    Screening: 1.4,
    Applied: 1.0,
    Unknown: 1.0,
  },
};

export function calculateCalendarDays(fromDate: Date, toDate: Date): number {
  const diffTime = toDate.getTime() - fromDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function calculateBusinessDays(fromDate: Date, toDate: Date): number {
  if (fromDate > toDate) return 0;
  let count = 0;
  const cur = new Date(fromDate);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(toDate);
  end.setHours(0, 0, 0, 0);

  while (cur < end) {
    cur.setDate(cur.getDate() + 1);
    const dayOfWeek = cur.getDay(); // 0 = Sun, 6 = Sat
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }
  return count;
}

export function extractRiskFactors(candidate: Candidate): string[] {
  const risks: string[] = [];
  const text = `${candidate.notes} ${candidate.tags.join(' ')}`.toLowerCase();

  if (/competing offer|other offer|deadline|counter offer|exploding/i.test(text)) {
    risks.push('🚨 Competing Offer / Tight Decision Deadline');
  }
  if (/referral|ceo|vp referral|exec|vip/i.test(text)) {
    risks.push('⭐ High-Visibility / Executive Referral');
  }
  if (/scorecard missing|pending scorecard|no feedback|waiting on feedback/i.test(text)) {
    risks.push('⏳ Missing Interviewer Scorecard / Internal Bottleneck');
  }
  if (/unresponsive|no reply|ghosted|left voicemail|follow-up sent/i.test(text)) {
    risks.push('⚠️ Candidate Unresponsive to Previous Contact');
  }
  if (/visa|sponsorship|relocation|h-1b|stem opt/i.test(text)) {
    risks.push('🛂 Immigration / Relocation Timeline Sensitivity');
  }
  if (/salary|comp expectation|above band|equity/i.test(text)) {
    risks.push('💰 Compensation Alignment Pending');
  }

  return risks;
}

export function analyzeCandidateStall(
  candidate: Candidate,
  referenceDate: Date = new Date(),
  config: SLAConfig = DEFAULT_SLA_CONFIG,
  customThresholdOverride?: number
): StallAnalysis {
  if (candidate.isArchived) {
    return {
      candidate,
      daysSinceLastActivity: 0,
      businessDaysStalled: 0,
      slaThresholdDays: 0,
      isStalled: false,
      slaBreachDays: 0,
      slaBreachRatio: 0,
      urgencyScore: 0,
      urgencyLevel: 'LOW',
      detectedRisks: [],
      responsibleOwner: candidate.nextStepOwner || 'None (Archived)',
    };
  }

  const calendarDays = calculateCalendarDays(candidate.lastActivityDate, referenceDate);
  const businessDays = calculateBusinessDays(candidate.lastActivityDate, referenceDate);
  const effectiveDaysStalled = config.businessDaysOnly ? businessDays : calendarDays;

  const slaThreshold =
    customThresholdOverride ??
    (config.stageSLADays[candidate.canonicalStage] || config.defaultThresholdDays);

  const isStalled = effectiveDaysStalled >= slaThreshold;
  const slaBreachDays = Math.max(0, effectiveDaysStalled - slaThreshold);
  const slaBreachRatio = slaThreshold > 0 ? effectiveDaysStalled / slaThreshold : 1;

  const detectedRisks = extractRiskFactors(candidate);
  const stageWeight = config.stageWeights[candidate.canonicalStage] || 1.0;

  // Multi-factor urgency calculation
  let urgencyScore = 0;
  if (isStalled) {
    // 1. Stage Baseline Urgency (High-stake stages have inherently higher baseline cost of stall)
    const stageBaseBonus: Record<string, number> = {
      'Offer Extended': 45,
      'Offer Discussion': 35,
      Debrief: 30,
      'Onsite / Final': 20,
      'Technical Interview': 15,
      'Take-Home': 10,
      Screening: 5,
      Applied: 0,
    };
    urgencyScore += stageBaseBonus[candidate.canonicalStage] || 0;

    // 2. Days Stalled scaled by Stage Weight (with diminishing returns for early stages)
    const cappedDays = ['Applied', 'Screening'].includes(candidate.canonicalStage)
      ? Math.min(effectiveDaysStalled, 6)
      : effectiveDaysStalled;

    urgencyScore += cappedDays * 3.0 * stageWeight;

    // 3. SLA Breach impact (using breach days rather than volatile 1-day ratios)
    urgencyScore += Math.min(slaBreachDays, 6) * 7.0 * stageWeight;

    // 4. Detected Risk multipliers (competing offers are critical tier-1 emergencies)
    if (detectedRisks.some((r) => r.includes('Competing Offer'))) {
      urgencyScore += 110.0;
    }
    if (detectedRisks.some((r) => r.includes('Executive Referral'))) {
      urgencyScore += 25.0;
    }
    if (detectedRisks.some((r) => r.includes('Missing Interviewer Scorecard'))) {
      urgencyScore += 22.0;
    }
    if (detectedRisks.some((r) => r.includes('Candidate Unresponsive'))) {
      urgencyScore += 10.0;
    }
    if (detectedRisks.some((r) => r.includes('Immigration'))) {
      urgencyScore += 15.0;
    }

    // 5. Applied stage cap: Unreviewed cold application should not exceed 40 points without executive referral
    if (candidate.canonicalStage === 'Applied' && !detectedRisks.some((r) => r.includes('Executive Referral'))) {
      urgencyScore = Math.min(urgencyScore, 40);
    }
  }

  urgencyScore = Math.round(Math.max(0, urgencyScore));

  let urgencyLevel: UrgencyLevel = 'ON TRACK';
  if (isStalled) {
    if (
      urgencyScore >= 75 ||
      ['Offer Extended', 'Offer Discussion', 'Debrief'].includes(candidate.canonicalStage) && slaBreachDays >= 1 ||
      detectedRisks.some((r) => r.includes('Competing Offer'))
    ) {
      urgencyLevel = 'CRITICAL';
    } else if (urgencyScore >= 45 || slaBreachDays >= 3) {
      urgencyLevel = 'HIGH';
    } else if (urgencyScore >= 20 || slaBreachDays >= 1) {
      urgencyLevel = 'MEDIUM';
    } else {
      urgencyLevel = 'LOW';
    }
  }

  const responsibleOwner = candidate.nextStepOwner || candidate.recruiter || candidate.hiringManager;

  return {
    candidate,
    daysSinceLastActivity: calendarDays,
    businessDaysStalled: businessDays,
    slaThresholdDays: slaThreshold,
    isStalled,
    slaBreachDays,
    slaBreachRatio: parseFloat(slaBreachRatio.toFixed(2)),
    urgencyScore,
    urgencyLevel,
    detectedRisks,
    responsibleOwner,
  };
}

export function evaluateHiringBoard(
  candidates: Candidate[],
  referenceDate: Date = new Date(),
  config: SLAConfig = DEFAULT_SLA_CONFIG,
  customThresholdOverride?: number,
  warnings: ParsingWarning[] = []
): AnalysisSummary {
  const activeCandidates = candidates.filter((c) => !c.isArchived);

  // Auto-align reference date if candidate dates in CSV are newer than chosen reference date
  let effectiveRefDate = referenceDate;
  const maxCandTime = activeCandidates.reduce(
    (max, c) => (c.lastActivityDate.getTime() > max ? c.lastActivityDate.getTime() : max),
    0
  );
  if (maxCandTime > referenceDate.getTime()) {
    effectiveRefDate = new Date(maxCandTime + 24 * 60 * 60 * 1000);
    warnings.push({
      rowNumber: 0,
      type: 'DATE_FORMAT',
      message: `Selected reference date was earlier than candidate dates in the CSV. Auto-aligned evaluation date to ${effectiveRefDate.toISOString().split('T')[0]}.`,
    });
  }

  const analyses = activeCandidates.map((c) =>
    analyzeCandidateStall(c, effectiveRefDate, config, customThresholdOverride)
  );

  const stalled = analyses.filter((a) => a.isStalled);
  const onTrack = analyses.filter((a) => !a.isStalled);

  // Sort stalled by urgencyScore desc, then businessDaysStalled desc
  stalled.sort((a, b) => {
    if (b.urgencyScore !== a.urgencyScore) {
      return b.urgencyScore - a.urgencyScore;
    }
    return b.businessDaysStalled - a.businessDaysStalled;
  });

  // Sort on-track by businessDaysStalled desc
  onTrack.sort((a, b) => b.businessDaysStalled - a.businessDaysStalled);

  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  stalled.forEach((s) => {
    if (s.urgencyLevel === 'CRITICAL') criticalCount++;
    else if (s.urgencyLevel === 'HIGH') highCount++;
    else if (s.urgencyLevel === 'MEDIUM') mediumCount++;
    else lowCount++;
  });

  return {
    referenceDate: effectiveRefDate,
    totalEvaluated: activeCandidates.length,
    totalStalled: stalled.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    onTrackCount: onTrack.length,
    analyses: [...stalled, ...onTrack],
    warnings,
  };
}
