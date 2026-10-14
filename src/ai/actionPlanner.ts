import { GoogleGenAI } from '@google/genai';
import { ActionPlan, StallAnalysis } from '../types/index.js';
import {
  STALL_ALERTER_SYSTEM_DIRECTIVE,
  ACTION_PLAN_SCHEMA_DESCRIPTION,
} from './directive.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Deterministic contextual fallback engine.
 * Generates structured, high-conviction action plans when offline or without API keys.
 */
export function generateDeterministicActionPlan(stall: StallAnalysis): ActionPlan {
  const { candidate, businessDaysStalled, slaThresholdDays, detectedRisks, urgencyLevel } = stall;
  const stage = candidate.canonicalStage;
  const owner = candidate.nextStepOwner || candidate.hiringManager || candidate.recruiter || 'Team';

  let channel: 'Slack' | 'Email' | 'Phone' | 'ATS' = 'Email';
  let targetAudience = 'Recruiter';
  let actionSummary = '';
  let priorityRankReason = '';
  let draftSubject = '';
  let draftMessage = '';

  const hasCompetingOffer = detectedRisks.some((r) => r.includes('Competing Offer'));
  const hasMissingScorecard = detectedRisks.some((r) => r.includes('Missing Interviewer Scorecard'));
  const isUnresponsive = detectedRisks.some((r) => r.includes('Candidate Unresponsive'));
  const isVipReferral = detectedRisks.some((r) => r.includes('Executive Referral'));

  if (!stall.isStalled) {
    return {
      actionSummary: `Candidate is progressing normally through ${stage} (within ${slaThresholdDays}-day SLA).`,
      priorityRankReason: `Pipeline on track. Active for ${businessDaysStalled} business days. No blockers detected.`,
      channel: 'ATS',
      targetAudience: owner,
      draftSubject: `Pipeline Status: ${candidate.name} - ${candidate.role}`,
      draftMessage: `Hi ${owner},\n\n${candidate.name} is progressing on schedule through ${stage}. Next step ownership is currently with ${owner}. Continue standard timeline.\n\nBest,\nTalent Operations`,
      isAIGenerated: false,
    };
  }

  if (stage === 'Offer Extended' || stage === 'Offer Discussion') {
    if (hasCompetingOffer) {
      channel = 'Phone';
      targetAudience = 'Candidate & Hiring Manager';
      actionSummary = `Initiate immediate closing call with ${candidate.name} and HM ${candidate.hiringManager} to counter competing deadline.`;
      priorityRankReason = `Critical stage (${stage}) stalled for ${businessDaysStalled} business days (SLA: ${slaThresholdDays}d) with active competing offer threat.`;
      draftSubject = `Urgent check-in regarding your offer with our team - ${candidate.role}`;
      draftMessage = `Hi ${candidate.name},\n\nI hope you're having a great week. I wanted to personally reach out following our offer discussion. We know you are evaluating options and have an upcoming deadline, and our entire leadership team—including ${candidate.hiringManager}—is thrilled about the prospect of you joining us.\n\nCould we jump on a brief 10-minute call today to address any questions regarding compensation, start date, or equity?\n\nBest regards,\n${candidate.recruiter}`;
    } else {
      channel = 'Slack';
      targetAudience = 'Hiring Manager';
      actionSummary = `Ping HM ${candidate.hiringManager} to conduct an executive closing check-in with ${candidate.name}.`;
      priorityRankReason = `Offer stage stalled for ${businessDaysStalled} business days. Top candidates cool down rapidly without active closing touches.`;
      draftSubject = `Action Needed: Closing touchpoint for ${candidate.name} (${candidate.role})`;
      draftMessage = `@${candidate.hiringManager} Hi! ${candidate.name} has been in ${stage} for ${businessDaysStalled} business days without an update. Could you drop them a quick congratulatory note or schedule a casual 15-minute coffee chat to reinforce how excited the team is? Let me know once done!`;
    }
  } else if (stage === 'Debrief') {
    channel = 'Slack';
    targetAudience = 'Interview Panel & Hiring Manager';
    actionSummary = `Convene debrief or enforce scorecard completion deadline with ${candidate.hiringManager}.`;
    priorityRankReason = `Debrief is breached by ${stall.slaBreachDays} days. Interview recall degrades significantly after 48 hours.`;
    draftSubject = `Debrief Required: ${candidate.name} - ${candidate.role}`;
    draftMessage = `@${owner} Hi team, ${candidate.name} completed their loop ${businessDaysStalled} days ago, but the debrief decision has not been finalized. ${hasMissingScorecard ? 'Please submit your outstanding scorecards by 2:00 PM today so we can finalize the decision.' : 'Can we schedule a 15-minute alignment sync today to make the call?'} Candidate experience SLA is currently breached.`;
  } else if (stage === 'Technical Interview' || stage === 'Onsite / Final') {
    if (hasMissingScorecard) {
      channel = 'Slack';
      targetAudience = 'Hiring Manager & Interviewers';
      actionSummary = `Nudge interviewers to submit pending evaluation scorecards for ${candidate.name}.`;
      priorityRankReason = `Internal feedback bottleneck: stalled ${businessDaysStalled} business days awaiting interview scorecards.`;
      draftSubject = `Pending Feedback: ${candidate.name} (${candidate.role})`;
      draftMessage = `@${owner} Friendly reminder: We are waiting on your interview feedback for ${candidate.name} (${candidate.role}). The candidate completed their session on ${candidate.lastActivityDateRaw}, and we need all scorecards in before we can notify the candidate. Please submit by end of day today.`;
    } else {
      channel = 'Email';
      targetAudience = 'Candidate';
      actionSummary = `Send status update to ${candidate.name} and provide timeline for next steps.`;
      priorityRankReason = `Candidate has waited ${businessDaysStalled} business days in ${stage}. Keeping high-potential candidates warm prevents drop-off.`;
      draftSubject = `Update on your application for ${candidate.role}`;
      draftMessage = `Hi ${candidate.name},\n\nThank you for your patience while our team reviews feedback from your recent ${stage}. We wanted to give you a quick update that the review process is active, and we expect to be back in touch with next steps by tomorrow.\n\nThank you again for your time and enthusiasm!\n\nBest,\n${candidate.recruiter}`;
    }
  } else if (stage === 'Take-Home') {
    channel = 'Slack';
    targetAudience = 'Hiring Manager';
    actionSummary = `Assign take-home assessment review to designated engineering reviewer.`;
    priorityRankReason = `Take-home assignment pending evaluation for ${businessDaysStalled} business days.`;
    draftSubject = `Take-Home Review Needed: ${candidate.name}`;
    draftMessage = `@${candidate.hiringManager} The take-home submission from ${candidate.name} has been sitting for ${businessDaysStalled} days. Could you please assign an engineer to grade the submission or review it today so we don't lose candidate momentum?`;
  } else {
    // Screening or Applied
    if (isUnresponsive) {
      channel = 'Email';
      targetAudience = 'Candidate';
      actionSummary = `Send final re-engagement check-in to ${candidate.name} before archiving.`;
      priorityRankReason = `Candidate unresponsive for ${businessDaysStalled} business days. Clean pipeline hygiene prevents ghosting.`;
      draftSubject = `Checking in regarding your application for ${candidate.role}`;
      draftMessage = `Hi ${candidate.name},\n\nI hope you're doing well! I'm following up on our previous note regarding your candidacy for the ${candidate.role} position. We understand timing can be busy, but wanted to check if you're still interested in exploring this opportunity. If we don't hear back by the end of this week, we'll keep your profile on file for future openings.\n\nWarm regards,\n${candidate.recruiter}`;
    } else {
      channel = 'Email';
      targetAudience = 'Candidate';
      actionSummary = `Reach out to schedule initial recruiter screen with ${candidate.name}.`;
      priorityRankReason = `Application in ${stage} stalled for ${businessDaysStalled} business days.`;
      draftSubject = `Next steps: ${candidate.role} interview at our company`;
      draftMessage = `Hi ${candidate.name},\n\nThank you for applying to the ${candidate.role} role! We were impressed by your background and would love to schedule a 20-minute introductory conversation to learn more about your goals and share more about the role.\n\nPlease pick a convenient time here: [Scheduling Link]. Looking forward to speaking!\n\nBest,\n${candidate.recruiter}`;
    }
  }

  if (isVipReferral) {
    priorityRankReason += ` Note: Candidate is flagged as a VIP / Executive Referral.`;
  }

  return {
    actionSummary,
    priorityRankReason,
    channel,
    targetAudience,
    draftSubject,
    draftMessage,
    isAIGenerated: false,
  };
}

/**
 * Generate action plan using Gemini API when available, with resilient fallback.
 */
export async function generateActionPlan(
  stall: StallAnalysis,
  apiKey: string | undefined = process.env.GEMINI_API_KEY
): Promise<ActionPlan> {
  if (!apiKey || apiKey.trim() === '') {
    return generateDeterministicActionPlan(stall);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const candidatePrompt = `
Analyze the following stalled candidate and formulate the prioritized action plan:

- Candidate Name: ${stall.candidate.name}
- Candidate ID: ${stall.candidate.id}
- Email: ${stall.candidate.email || 'N/A'}
- Role: ${stall.candidate.role}
- Department: ${stall.candidate.department}
- Current Stage: ${stall.candidate.stage} (Canonical: ${stall.candidate.canonicalStage})
- Last Activity: ${stall.candidate.lastActivityDateRaw} (${stall.businessDaysStalled} business days ago)
- Stage SLA Threshold: ${stall.slaThresholdDays} business days
- SLA Breach Days: ${stall.slaBreachDays} days
- Urgency Level: ${stall.urgencyLevel} (Score: ${stall.urgencyScore})
- Next Step Owner: ${stall.candidate.nextStepOwner || 'Unassigned'}
- Hiring Manager: ${stall.candidate.hiringManager}
- Recruiter: ${stall.candidate.recruiter}
- Detected Risks: ${stall.detectedRisks.length > 0 ? stall.detectedRisks.join(', ') : 'None'}
- Recruiter / Interviewer Notes: "${stall.candidate.notes || 'No recent notes'}"
- Tags: ${stall.candidate.tags.join(', ') || 'None'}

Return ONLY a valid JSON object matching this schema:
${ACTION_PLAN_SCHEMA_DESCRIPTION}
`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: [{ text: `${STALL_ALERTER_SYSTEM_DIRECTIVE}\n\n${candidatePrompt}` }],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim();
    if (!text) {
      return generateDeterministicActionPlan(stall);
    }

    // Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Strip markdown code block if present
      const cleaned = text.replace(/```(?:json)?\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    if (
      parsed &&
      typeof parsed.actionSummary === 'string' &&
      typeof parsed.draftMessage === 'string'
    ) {
      return {
        actionSummary: parsed.actionSummary,
        priorityRankReason: parsed.priorityRankReason || `Prioritized due to ${stall.urgencyLevel} stall status.`,
        channel: ['Slack', 'Email', 'Phone', 'ATS'].includes(parsed.channel)
          ? parsed.channel
          : 'Email',
        targetAudience: parsed.targetAudience || 'Recruiter',
        draftSubject: parsed.draftSubject || `Follow-up: ${stall.candidate.name} - ${stall.candidate.role}`,
        draftMessage: parsed.draftMessage,
        isAIGenerated: true,
      };
    }

    return generateDeterministicActionPlan(stall);
  } catch (error) {
    // If API call times out, encounters rate limits or errors, seamlessly fall back
    console.warn(`[AI Engine] Gemini API call failed or unavailable. Falling back to deterministic engine. Error: ${error instanceof Error ? error.message : String(error)}`);
    return generateDeterministicActionPlan(stall);
  }
}

/**
 * Batch enrich stall analyses with action plans.
 */
export async function enrichAnalysesWithActions(
  analyses: StallAnalysis[],
  apiKey?: string
): Promise<StallAnalysis[]> {
  const results: StallAnalysis[] = [];
  for (const analysis of analyses) {
    const actionPlan = await generateActionPlan(analysis, apiKey);
    results.push({
      ...analysis,
      actionPlan,
    });
  }
  return results;
}
