import { describe, it, expect } from 'vitest';
import { parseHiringBoardCSV, canonicalizeStage, parseResilientDate, mapHeaders } from '../src/parser/csvParser.js';

describe('CSV Parser & Normalizer', () => {
  it('correctly canonicalizes various stage descriptions', () => {
    expect(canonicalizeStage('Phone Screen')).toBe('Screening');
    expect(canonicalizeStage('recruiter chat')).toBe('Screening');
    expect(canonicalizeStage('1st technical round')).toBe('Technical Interview');
    expect(canonicalizeStage('Coding Challenge')).toBe('Take-Home');
    expect(canonicalizeStage('Super Day Panel')).toBe('Onsite / Final');
    expect(canonicalizeStage('Scorecard Review')).toBe('Debrief');
    expect(canonicalizeStage('Comp discussion')).toBe('Offer Discussion');
    expect(canonicalizeStage('Offer Extended')).toBe('Offer Extended');
    expect(canonicalizeStage('Hired')).toBe('Archived');
    expect(canonicalizeStage('Candidate Withdrawn')).toBe('Archived');
    expect(canonicalizeStage('Non-standard alien step')).toBe('Unknown');
  });

  it('parses diverse date formats resiliently', () => {
    const warnings: any[] = [];
    const isoDate = parseResilientDate('2026-03-20', 1, warnings);
    expect(isoDate).not.toBeNull();
    expect(isoDate?.getFullYear()).toBe(2026);
    expect(isoDate?.getMonth()).toBe(2); // 0-indexed March

    const usDate = parseResilientDate('03/15/2026', 2, warnings);
    expect(usDate).not.toBeNull();
    expect(usDate?.getDate()).toBe(15);

    const intlDate = parseResilientDate('25/03/2026', 3, warnings);
    expect(intlDate).not.toBeNull();
    expect(intlDate?.getDate()).toBe(25);

    const emptyDate = parseResilientDate('N/A', 4, warnings);
    expect(emptyDate).toBeNull();
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('maps irregular and messy column headers to domain fields', () => {
    const rawHeaders = ['applicant_name', 'Job Title', 'Dept', 'Status', 'Last Updated', 'HM', 'Talent Partner', 'Blocker', 'Feedback'];
    const map = mapHeaders(rawHeaders);

    expect(map.name).toBe('applicant_name');
    expect(map.role).toBe('Job Title');
    expect(map.department).toBe('Dept');
    expect(map.stage).toBe('Status');
    expect(map.lastActivityDate).toBe('Last Updated');
    expect(map.hiringManager).toBe('HM');
    expect(map.recruiter).toBe('Talent Partner');
    expect(map.nextStepOwner).toBe('Blocker');
    expect(map.notes).toBe('Feedback');
  });

  it('parses a complete CSV snippet with quotes and commas', () => {
    const csv = `Candidate ID,Name,Role,Department,Stage,Last Activity,Hiring Manager,Recruiter,Next Step Owner,Notes
CAND-001,"Smith, John",Principal Architect,Infra,Offer Extended,2026-03-20,Dan Miller,Jessica Alba,Recruiter,"Candidate has competing offer, needs fast reply"
CAND-002,Jane Doe,Frontend Eng,UI,Screening,2026-03-22,Sarah J,David O,Candidate,"Sent email, waiting on reply"`;

    const result = parseHiringBoardCSV(csv, new Date('2026-03-25'));
    expect(result.candidates.length).toBe(2);
    expect(result.candidates[0].name).toBe('Smith, John');
    expect(result.candidates[0].canonicalStage).toBe('Offer Extended');
    expect(result.candidates[0].notes).toContain('competing offer');
  });
});
