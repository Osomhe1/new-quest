import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseHiringBoardCSV } from '../src/parser/csvParser.js';
import { evaluateHiringBoard, DEFAULT_SLA_CONFIG } from '../src/analyzer/stallAnalyzer.js';
import { enrichAnalysesWithActions } from '../src/ai/actionPlanner.js';

describe('End-to-End Pipeline Integration', () => {
  const refDate = new Date('2026-03-25');

  it('successfully processes clean_board.csv with zero fatal errors', async () => {
    const filePath = path.resolve(process.cwd(), 'data/clean_board.csv');
    const content = fs.readFileSync(filePath, 'utf-8');

    const parseResult = parseHiringBoardCSV(content, refDate);
    expect(parseResult.candidates.length).toBe(12);
    expect(parseResult.archivedCandidatesCount).toBe(2);

    const summary = evaluateHiringBoard(parseResult.candidates, refDate, DEFAULT_SLA_CONFIG, undefined, parseResult.warnings);
    expect(summary.totalEvaluated).toBe(10);
    expect(summary.totalStalled).toBeGreaterThan(0);

    const enriched = await enrichAnalysesWithActions(summary.analyses);
    expect(enriched[0].actionPlan).toBeDefined();
    expect(enriched[0].actionPlan?.actionSummary.length).toBeGreaterThan(5);
  });

  it('resiliently processes messy_board.csv and catches format warnings', async () => {
    const filePath = path.resolve(process.cwd(), 'data/messy_board.csv');
    const content = fs.readFileSync(filePath, 'utf-8');

    const parseResult = parseHiringBoardCSV(content, refDate);
    expect(parseResult.candidates.length).toBe(10);
    // Should have caught irregular dates and missing date row
    expect(parseResult.warnings.length).toBeGreaterThan(0);

    const summary = evaluateHiringBoard(parseResult.candidates, refDate, DEFAULT_SLA_CONFIG, undefined, parseResult.warnings);
    expect(summary.totalStalled).toBeGreaterThan(0);
    expect(summary.warnings.length).toBe(parseResult.warnings.length);
  });

  it('processes adversarial_board.csv and prioritizes high-risk candidates at the top', async () => {
    const filePath = path.resolve(process.cwd(), 'data/adversarial_board.csv');
    const content = fs.readFileSync(filePath, 'utf-8');

    const parseResult = parseHiringBoardCSV(content, refDate);
    expect(parseResult.candidates.length).toBe(15);

    const summary = evaluateHiringBoard(parseResult.candidates, refDate, DEFAULT_SLA_CONFIG, undefined, parseResult.warnings);
    expect(summary.analyses.length).toBeGreaterThan(0);

    // The top candidate should have a critical urgency level and a competing offer
    const topCandidate = summary.analyses[0];
    expect(topCandidate.urgencyLevel).toBe('CRITICAL');
    expect(topCandidate.detectedRisks.some((r) => r.includes('Competing Offer'))).toBe(true);
  });
});
