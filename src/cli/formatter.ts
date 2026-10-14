import { StallAnalysis, AnalysisSummary } from '../types/index.js';

// Clean ANSI color codes for cross-platform Windows / Linux terminal support
export const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

export function formatUrgencyBadge(level: string): string {
  switch (level) {
    case 'CRITICAL':
      return `${colors.bold}${colors.red}[CRITICAL]${colors.reset}`;
    case 'HIGH':
      return `${colors.bold}${colors.yellow}[HIGH]${colors.reset}`;
    case 'MEDIUM':
      return `${colors.cyan}[MEDIUM]${colors.reset}`;
    default:
      return `${colors.dim}[LOW]${colors.reset}`;
  }
}

export function renderSummaryHeader(summary: AnalysisSummary): void {
  const refDateStr = summary.referenceDate.toISOString().split('T')[0];
  console.log(`\n${colors.bold}${colors.cyan}=================================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}               HIRING BOARD STALL ALERTER — AI-FIRST TRIAGE REPORT               ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}=================================================================================${colors.reset}`);
  console.log(`Reference Date: ${colors.bold}${refDateStr}${colors.reset} | Evaluated: ${summary.totalEvaluated} active candidates`);
  console.log(
    `Stalled Pipeline Candidates: ${colors.bold}${summary.totalStalled}${colors.reset} ` +
      `(${colors.red}${summary.criticalCount} Critical${colors.reset}, ` +
      `${colors.yellow}${summary.highCount} High${colors.reset}, ` +
      `${colors.cyan}${summary.mediumCount} Medium${colors.reset}, ` +
      `${colors.dim}${summary.lowCount} Low${colors.reset})\n`
  );

  if (summary.warnings.length > 0) {
    console.log(`${colors.yellow}⚠️  Ingestion Warnings (${summary.warnings.length}):${colors.reset}`);
    summary.warnings.slice(0, 4).forEach((w) => {
      console.log(`  - Row ${w.rowNumber} [${w.type}]: ${w.message}`);
    });
    if (summary.warnings.length > 4) {
      console.log(`  ... and ${summary.warnings.length - 4} more data anomalies safely handled.`);
    }
    console.log();
  }
}

export function renderTriageTable(analyses: StallAnalysis[]): void {
  if (analyses.length === 0) {
    console.log(`${colors.green}✓ Pipeline is healthy! No stalled candidates found.${colors.reset}\n`);
    return;
  }

  console.log(
    `${colors.bold}${'RANK'.padEnd(6)} ${'URGENCY'.padEnd(12)} ${'CANDIDATE'.padEnd(20)} ${'ROLE'.padEnd(22)} ${'STAGE'.padEnd(18)} ${'STALLED'.padEnd(10)} ${'ACTION OWNER'.padEnd(18)}${colors.reset}`
  );
  console.log(''.padEnd(110, '-'));

  analyses.forEach((s, idx) => {
    const rank = `#${idx + 1}`.padEnd(6);
    const urgency = formatUrgencyBadge(s.urgencyLevel).padEnd(20);
    const name = (s.candidate.name.length > 18 ? s.candidate.name.substring(0, 17) + '…' : s.candidate.name).padEnd(20);
    const role = (s.candidate.role.length > 20 ? s.candidate.role.substring(0, 19) + '…' : s.candidate.role).padEnd(22);
    const stage = (s.candidate.stage.length > 16 ? s.candidate.stage.substring(0, 15) + '…' : s.candidate.stage).padEnd(18);
    const stalled = `${s.businessDaysStalled}d (SLA ${s.slaThresholdDays}d)`.padEnd(10);
    const owner = (s.responsibleOwner.length > 16 ? s.responsibleOwner.substring(0, 15) + '…' : s.responsibleOwner).padEnd(18);

    console.log(`${rank} ${urgency} ${name} ${role} ${stage} ${stalled} ${owner}`);

    if (s.detectedRisks.length > 0) {
      console.log(`       ${colors.yellow}↳ ${s.detectedRisks.join(' | ')}${colors.reset}`);
    }

    if (s.actionPlan) {
      console.log(`       ${colors.green}↳ Action: ${s.actionPlan.actionSummary}${colors.reset}`);
    }
    console.log();
  });
}

export function renderCandidateDetail(analysis: StallAnalysis): void {
  const { candidate, businessDaysStalled, slaThresholdDays, slaBreachDays, urgencyLevel, urgencyScore, actionPlan } = analysis;

  console.log(`\n${colors.bold}${colors.cyan}---------------------------------------------------------------------------------${colors.reset}`);
  console.log(`${colors.bold}CANDIDATE DOSSIER: ${candidate.name} (${candidate.id})${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}---------------------------------------------------------------------------------${colors.reset}`);
  console.log(`Role:            ${candidate.role} (${candidate.department})`);
  console.log(`Email:           ${candidate.email || 'N/A'}`);
  console.log(`Current Stage:   ${candidate.stage} (Canonical: ${candidate.canonicalStage})`);
  console.log(`Last Activity:   ${candidate.lastActivityDateRaw} (${businessDaysStalled} business days ago)`);
  console.log(`Stage SLA:       ${slaThresholdDays} business days (Breach: ${slaBreachDays > 0 ? colors.red + '+' + slaBreachDays + ' days' + colors.reset : 'Within SLA'})`);
  console.log(`Urgency:         ${formatUrgencyBadge(urgencyLevel)} (Score: ${urgencyScore})`);
  console.log(`Hiring Manager:  ${candidate.hiringManager}`);
  console.log(`Recruiter:       ${candidate.recruiter}`);
  console.log(`Next Step Owner: ${colors.bold}${analysis.responsibleOwner}${colors.reset}`);
  console.log(`Notes / History: "${candidate.notes || 'None'}"`);

  if (analysis.detectedRisks.length > 0) {
    console.log(`\n${colors.bold}${colors.yellow}Identified Risk Signals:${colors.reset}`);
    analysis.detectedRisks.forEach((r) => console.log(`  - ${r}`));
  }

  if (actionPlan) {
    console.log(`\n${colors.bold}${colors.green}Recommended Action Plan (${actionPlan.isAIGenerated ? 'Generated via Gemini AI' : 'Deterministic Rule Engine'}):${colors.reset}`);
    console.log(`Target Audience: ${actionPlan.targetAudience} via ${colors.bold}${actionPlan.channel}${colors.reset}`);
    console.log(`Summary:         ${colors.bold}${actionPlan.actionSummary}${colors.reset}`);
    console.log(`Priority Rationale: ${actionPlan.priorityRankReason}`);
    console.log(`\n${colors.bold}Draft Communication [Ready to Send]:${colors.reset}`);
    console.log(`Subject: ${colors.bold}${actionPlan.draftSubject}${colors.reset}`);
    console.log(''.padEnd(70, '-'));
    console.log(actionPlan.draftMessage);
    console.log(''.padEnd(70, '-'));
  }
  console.log();
}
