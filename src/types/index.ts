export type PipelineStage =
  | 'Applied'
  | 'Screening'
  | 'Take-Home'
  | 'Technical Interview'
  | 'Onsite / Final'
  | 'Debrief'
  | 'Offer Discussion'
  | 'Offer Extended'
  | 'Archived'
  | 'Rejected'
  | 'Unknown';

export type UrgencyLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'ON TRACK';

export interface Candidate {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  stage: string;
  canonicalStage: PipelineStage;
  lastActivityDate: Date;
  lastActivityDateRaw: string;
  hiringManager: string;
  recruiter: string;
  nextStepOwner: string;
  notes: string;
  tags: string[];
  isArchived: boolean;
}

export interface SLAConfig {
  stageSLADays: Record<string, number>;
  stageWeights: Record<string, number>;
  businessDaysOnly: boolean;
  defaultThresholdDays: number;
}

export interface ActionPlan {
  actionSummary: string;
  priorityRankReason: string;
  channel: 'Email' | 'Slack' | 'Phone' | 'ATS';
  targetAudience: string;
  draftSubject: string;
  draftMessage: string;
  isAIGenerated: boolean;
}

export interface StallAnalysis {
  candidate: Candidate;
  daysSinceLastActivity: number;
  businessDaysStalled: number;
  slaThresholdDays: number;
  isStalled: boolean;
  slaBreachDays: number;
  slaBreachRatio: number;
  urgencyScore: number;
  urgencyLevel: UrgencyLevel;
  detectedRisks: string[];
  responsibleOwner: string;
  actionPlan?: ActionPlan;
}

export interface ParsingWarning {
  rowNumber: number;
  candidateId?: string;
  candidateName?: string;
  type: 'DATE_FORMAT' | 'MISSING_FIELD' | 'STAGE_UNKNOWN' | 'AMBIGUOUS_OWNER' | 'ROW_MALFORMED';
  message: string;
}

export interface ParseResult {
  candidates: Candidate[];
  warnings: ParsingWarning[];
  totalRowsProcessed: number;
  validCandidatesCount: number;
  archivedCandidatesCount: number;
}

export interface AnalysisSummary {
  referenceDate: Date;
  totalEvaluated: number;
  totalStalled: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  onTrackCount: number;
  analyses: StallAnalysis[];
  warnings: ParsingWarning[];
}
