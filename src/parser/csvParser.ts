import { parse } from 'csv-parse/sync';
import { Candidate, ParsingWarning, ParseResult, PipelineStage } from '../types/index.js';

interface HeaderMapping {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  stage?: string;
  lastActivityDate?: string;
  hiringManager?: string;
  recruiter?: string;
  nextStepOwner?: string;
  notes?: string;
  tags?: string;
}

const STAGE_PATTERNS: Array<{ stage: PipelineStage; patterns: RegExp[] }> = [
  {
    stage: 'Archived',
    patterns: [/archive/i, /hired/i, /closed/i, /withdrawn/i, /not moving forward/i],
  },
  {
    stage: 'Rejected',
    patterns: [/reject/i, /declined/i, /passed/i, /turned down/i],
  },
  {
    stage: 'Offer Extended',
    patterns: [/offer extended/i, /offer sent/i, /written offer/i, /offer out/i],
  },
  {
    stage: 'Offer Discussion',
    patterns: [/offer/i, /comp discussion/i, /verbal offer/i, /closing/i],
  },
  {
    stage: 'Debrief',
    patterns: [/debrief/i, /hiring committee/i, /decision/i, /scorecard review/i, /deliberation/i],
  },
  {
    stage: 'Onsite / Final',
    patterns: [/onsite/i, /final round/i, /super day/i, /loop/i, /panel/i, /presentation/i],
  },
  {
    stage: 'Technical Interview',
    patterns: [/technical/i, /tech screen/i, /system design/i, /live coding/i, /peer interview/i],
  },
  {
    stage: 'Take-Home',
    patterns: [/take[- ]?home/i, /assignment/i, /coding test/i, /coding challenge/i, /challenge/i, /assessment/i, /project review/i],
  },
  {
    stage: 'Screening',
    patterns: [/screen/i, /phone screen/i, /intro call/i, /recruiter chat/i, /initial review/i],
  },
  {
    stage: 'Applied',
    patterns: [/applied/i, /new/i, /application review/i, /inbox/i, /sourced/i, /resume review/i],
  },
];

export function canonicalizeStage(rawStage: string): PipelineStage {
  if (!rawStage) return 'Unknown';
  const trimmed = rawStage.trim();
  for (const group of STAGE_PATTERNS) {
    for (const pattern of group.patterns) {
      if (pattern.test(trimmed)) {
        return group.stage;
      }
    }
  }
  return 'Unknown';
}

export function parseResilientDate(
  dateStr: string,
  rowNum: number,
  warnings: ParsingWarning[]
): Date | null {
  if (!dateStr || dateStr.trim() === '' || dateStr.trim().toLowerCase() === 'n/a') {
    warnings.push({
      rowNumber: rowNum,
      type: 'DATE_FORMAT',
      message: 'Date value is empty or N/A; defaulting to current reference date minus 1 day.',
    });
    return null;
  }

  const clean = dateStr.trim();

  // Try direct ISO format (YYYY-MM-DD or full ISO 8601)
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) return d;
  }

  // Try American format MM/DD/YYYY or M/D/YYYY
  const usMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (usMatch) {
    const first = parseInt(usMatch[1], 10);
    const second = parseInt(usMatch[2], 10);
    const year = parseInt(usMatch[3], 10);

    // If first > 12, it must be DD/MM/YYYY
    let month = first - 1;
    let day = second;
    if (first > 12 && second <= 12) {
      month = second - 1;
      day = first;
      warnings.push({
        rowNumber: rowNum,
        type: 'DATE_FORMAT',
        message: `Date '${clean}' interpreted as DD/MM/YYYY because first number (${first}) exceeds 12.`,
      });
    }

    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback to Date.parse
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  warnings.push({
    rowNumber: rowNum,
    type: 'DATE_FORMAT',
    message: `Unable to parse date string: '${clean}'.`,
  });
  return null;
}

export function mapHeaders(headers: string[]): HeaderMapping {
  const mapping: HeaderMapping = {};
  const normalize = (s: string) => s.toLowerCase().replace(/[\s_\-]+/g, '');

  headers.forEach((original) => {
    const h = normalize(original);
    if (h === 'id' || h === 'candidateid' || h === 'applicantid' || h === 'reqid') {
      mapping.id = original;
    } else if (h === 'name' || h === 'candidatename' || h === 'fullname' || h === 'applicant' || h === 'applicantname') {
      mapping.name = original;
    } else if (h === 'email' || h === 'candidateemail' || h === 'contact') {
      mapping.email = original;
    } else if (h === 'role' || h === 'jobtitle' || h === 'position' || h === 'title') {
      mapping.role = original;
    } else if (h === 'department' || h === 'dept' || h === 'team' || h === 'division') {
      mapping.department = original;
    } else if (h === 'stage' || h === 'currentstage' || h === 'pipelinestage' || h === 'status') {
      mapping.stage = original;
    } else if (
      h === 'lastactivity' ||
      h === 'lastactivitydate' ||
      h === 'lastupdated' ||
      h === 'updatedat' ||
      h === 'date'
    ) {
      mapping.lastActivityDate = original;
    } else if (h === 'hiringmanager' || h === 'hm' || h === 'manager') {
      mapping.hiringManager = original;
    } else if (h === 'recruiter' || h === 'talentpartner' || h === 'sourcer') {
      mapping.recruiter = original;
    } else if (
      h === 'nextstepowner' ||
      h === 'pendingon' ||
      h === 'blocker' ||
      h === 'owner' ||
      h === 'actionwith'
    ) {
      mapping.nextStepOwner = original;
    } else if (h === 'notes' || h === 'lastnote' || h === 'comments' || h === 'feedback') {
      mapping.notes = original;
    } else if (h === 'tags' || h === 'priority' || h === 'labels') {
      mapping.tags = original;
    }
  });

  return mapping;
}

export function parseHiringBoardCSV(
  csvContent: string,
  referenceDate: Date = new Date()
): ParseResult {
  const warnings: ParsingWarning[] = [];
  let records: Record<string, string>[];

  try {
    records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      relax_quotes: true,
    });
  } catch (err: any) {
    throw new Error(`CSV Parsing Failure: ${err?.message || 'Malformed CSV format'}`);
  }

  if (records.length === 0) {
    return {
      candidates: [],
      warnings: [{ rowNumber: 0, type: 'ROW_MALFORMED', message: 'The CSV file contains no data rows.' }],
      totalRowsProcessed: 0,
      validCandidatesCount: 0,
      archivedCandidatesCount: 0,
    };
  }

  const rawHeaders = Object.keys(records[0]);
  const headerMap = mapHeaders(rawHeaders);

  if (!headerMap.name && !headerMap.id) {
    warnings.push({
      rowNumber: 1,
      type: 'MISSING_FIELD',
      message: 'Could not detect Candidate Name or ID column in CSV headers.',
    });
  }

  const candidates: Candidate[] = [];
  let archivedCount = 0;

  records.forEach((row, index) => {
    const rowNum = index + 2; // +1 for 0-index, +1 for header line
    const name = (headerMap.name ? row[headerMap.name] : '') || `Candidate #${rowNum}`;
    const id = (headerMap.id ? row[headerMap.id] : '') || `CAND-${rowNum}`;
    const email = headerMap.email ? row[headerMap.email] : '';
    const role = (headerMap.role ? row[headerMap.role] : '') || 'Unassigned Role';
    const department = (headerMap.department ? row[headerMap.department] : '') || 'General';
    const rawStage = (headerMap.stage ? row[headerMap.stage] : '') || 'Applied';
    const canonicalStage = canonicalizeStage(rawStage);

    if (canonicalStage === 'Unknown') {
      warnings.push({
        rowNumber: rowNum,
        candidateId: id,
        candidateName: name,
        type: 'STAGE_UNKNOWN',
        message: `Unrecognized pipeline stage: '${rawStage}'. Categorized as Unknown.`,
      });
    }

    const rawDate = headerMap.lastActivityDate ? row[headerMap.lastActivityDate] : '';
    let parsedDate = parseResilientDate(rawDate, rowNum, warnings);
    if (!parsedDate) {
      // Default to yesterday if date was missing
      parsedDate = new Date(referenceDate.getTime() - 24 * 60 * 60 * 1000);
    }

    const hiringManager = (headerMap.hiringManager ? row[headerMap.hiringManager] : '') || 'Unassigned HM';
    const recruiter = (headerMap.recruiter ? row[headerMap.recruiter] : '') || 'Unassigned Recruiter';
    let nextStepOwner = headerMap.nextStepOwner ? row[headerMap.nextStepOwner] : '';
    if (!nextStepOwner) {
      // Infer based on canonical stage
      if (['Applied', 'Screening'].includes(canonicalStage)) {
        nextStepOwner = recruiter;
      } else if (['Take-Home', 'Technical Interview', 'Onsite / Final', 'Debrief'].includes(canonicalStage)) {
        nextStepOwner = hiringManager;
      } else {
        nextStepOwner = recruiter;
      }
    }

    const notes = headerMap.notes ? row[headerMap.notes] : '';
    const rawTags = headerMap.tags ? row[headerMap.tags] : '';
    const tags = rawTags
      ? rawTags.split(/[;,|]/).map((t) => t.trim()).filter(Boolean)
      : [];

    const isArchived = canonicalStage === 'Archived' || canonicalStage === 'Rejected';
    if (isArchived) {
      archivedCount++;
    }

    candidates.push({
      id,
      name,
      email,
      role,
      department,
      stage: rawStage,
      canonicalStage,
      lastActivityDate: parsedDate,
      lastActivityDateRaw: rawDate,
      hiringManager,
      recruiter,
      nextStepOwner,
      notes,
      tags,
      isArchived,
    });
  });

  return {
    candidates,
    warnings,
    totalRowsProcessed: records.length,
    validCandidatesCount: candidates.length,
    archivedCandidatesCount: archivedCount,
  };
}
