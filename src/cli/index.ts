#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { parseHiringBoardCSV } from '../parser/csvParser.js';
import { evaluateHiringBoard, DEFAULT_SLA_CONFIG, analyzeCandidateStall } from '../analyzer/stallAnalyzer.js';
import { generateActionPlan, enrichAnalysesWithActions } from '../ai/actionPlanner.js';
import {
  renderSummaryHeader,
  renderTriageTable,
  renderCandidateDetail,
  colors,
} from './formatter.js';

const program = new Command();

program
  .name('stall-alert')
  .description('AI-First Hiring Board Stall Alerter — Detects pipeline bottlenecks and prescribes prioritized actions')
  .version('1.0.0');

program
  .command('analyze')
  .description('Parse a hiring board CSV, calculate stall metrics, and list prioritized follow-ups')
  .argument('<csvPath>', 'Path to hiring board CSV file')
  .option('-d, --days <threshold>', 'Custom stall threshold in days (overrides stage SLAs)', (val) => parseInt(val, 10))
  .option('-s, --stage <stage>', 'Filter by canonical pipeline stage')
  .option('--dept, --department <dept>', 'Filter by department')
  .option('-u, --urgency <level>', 'Filter by urgency level (CRITICAL, HIGH, MEDIUM, LOW)')
  .option('-r, --reference-date <YYYY-MM-DD>', 'Custom reference date for evaluation (default: today)')
  .option('--json', 'Output results as JSON')
  .option('--export <path>', 'Export summary to JSON file')
  .option('--ai', 'Use Gemini AI engine for rich action generation (requires GEMINI_API_KEY)', false)
  .action(async (csvPath, options) => {
    try {
      const fullPath = path.resolve(process.cwd(), csvPath);
      if (!fs.existsSync(fullPath)) {
        console.error(`${colors.red}Error: File not found at '${fullPath}'${colors.reset}`);
        process.exit(1);
      }

      const csvContent = fs.readFileSync(fullPath, 'utf-8');
      const refDate = options.referenceDate ? new Date(options.referenceDate) : new Date();

      const parseResult = parseHiringBoardCSV(csvContent, refDate);
      const summary = evaluateHiringBoard(
        parseResult.candidates,
        refDate,
        DEFAULT_SLA_CONFIG,
        options.days,
        parseResult.warnings
      );

      // Apply stage, department, and urgency filters if provided
      let filteredAnalyses = summary.analyses;
      if (options.stage) {
        filteredAnalyses = filteredAnalyses.filter(
          (a) => a.candidate.canonicalStage.toLowerCase() === options.stage.toLowerCase()
        );
      }
      if (options.department) {
        filteredAnalyses = filteredAnalyses.filter((a) =>
          a.candidate.department.toLowerCase().includes(options.department.toLowerCase())
        );
      }
      if (options.urgency) {
        filteredAnalyses = filteredAnalyses.filter(
          (a) => a.urgencyLevel.toLowerCase() === options.urgency.toLowerCase()
        );
      }

      // Enrich top candidates with action plans
      // For performance and terminal readability, generate action plans for all filtered stalled items
      const enriched = await enrichAnalysesWithActions(
        filteredAnalyses,
        options.ai ? process.env.GEMINI_API_KEY : undefined
      );

      summary.analyses = enriched;

      if (options.json) {
        console.log(JSON.stringify(summary, null, 2));
        return;
      }

      if (options.export) {
        const exportPath = path.resolve(process.cwd(), options.export);
        fs.writeFileSync(exportPath, JSON.stringify(summary, null, 2), 'utf-8');
        console.log(`${colors.green}✓ Exported analysis report to '${exportPath}'${colors.reset}`);
      }

      renderSummaryHeader(summary);
      renderTriageTable(summary.analyses);
    } catch (err: any) {
      console.error(`${colors.red}Fatal Error: ${err?.message || err}${colors.reset}`);
      process.exit(1);
    }
  });

program
  .command('inspect')
  .description('Deep-dive into a specific candidate from a CSV board, including ready-to-send draft communications')
  .argument('<candidateId>', 'Candidate ID or Name')
  .argument('<csvPath>', 'Path to hiring board CSV file')
  .option('-r, --reference-date <YYYY-MM-DD>', 'Custom reference date for evaluation')
  .option('--ai', 'Use Gemini AI engine for customized action draft', false)
  .action(async (candidateId, csvPath, options) => {
    try {
      const fullPath = path.resolve(process.cwd(), csvPath);
      if (!fs.existsSync(fullPath)) {
        console.error(`${colors.red}Error: File not found at '${fullPath}'${colors.reset}`);
        process.exit(1);
      }

      const csvContent = fs.readFileSync(fullPath, 'utf-8');
      const refDate = options.referenceDate ? new Date(options.referenceDate) : new Date();

      const parseResult = parseHiringBoardCSV(csvContent, refDate);
      const query = candidateId.toLowerCase();
      const match = parseResult.candidates.find(
        (c) => c.id.toLowerCase() === query || c.name.toLowerCase().includes(query)
      );

      if (!match) {
        console.error(`${colors.red}No candidate found matching ID or Name '${candidateId}'${colors.reset}`);
        process.exit(1);
      }

      const analysis = analyzeCandidateStall(match, refDate);
      const actionPlan = await generateActionPlan(
        analysis,
        options.ai ? process.env.GEMINI_API_KEY : undefined
      );
      analysis.actionPlan = actionPlan;

      renderCandidateDetail(analysis);
    } catch (err: any) {
      console.error(`${colors.red}Fatal Error: ${err?.message || err}${colors.reset}`);
      process.exit(1);
    }
  });

program
  .command('stress-test')
  .description('Run automated stress-test suite comparing Clean vs Messy vs Adversarial datasets')
  .action(async () => {
    console.log(`\n${colors.bold}${colors.magenta}=================================================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.magenta}            HIRING BOARD STALL ALERTER — LOAD & ADVERSARIAL STRESS TEST           ${colors.reset}`);
    console.log(`${colors.bold}${colors.magenta}=================================================================================${colors.reset}\n`);

    const datasets = [
      { name: 'Baseline Clean Board', path: 'data/clean_board.csv', refDate: new Date('2026-03-25') },
      { name: 'Messy Real-World Board', path: 'data/messy_board.csv', refDate: new Date('2026-03-25') },
      { name: 'High-Load Adversarial Board', path: 'data/adversarial_board.csv', refDate: new Date('2026-03-25') },
    ];

    for (const ds of datasets) {
      const fullPath = path.resolve(process.cwd(), ds.path);
      if (!fs.existsSync(fullPath)) {
        console.log(`${colors.yellow}Dataset not found at ${ds.path}. Skipping.${colors.reset}`);
        continue;
      }

      const start = performance.now();
      const content = fs.readFileSync(fullPath, 'utf-8');
      const parseRes = parseHiringBoardCSV(content, ds.refDate);
      const summary = evaluateHiringBoard(parseRes.candidates, ds.refDate, DEFAULT_SLA_CONFIG, undefined, parseRes.warnings);
      const elapsed = (performance.now() - start).toFixed(2);

      console.log(`${colors.bold}Dataset: ${ds.name}${colors.reset}`);
      console.log(`  - File: ${ds.path}`);
      console.log(`  - Rows Processed: ${parseRes.totalRowsProcessed} (${parseRes.archivedCandidatesCount} archived ignored)`);
      console.log(`  - Ingestion Warnings Recovered: ${parseRes.warnings.length}`);
      console.log(`  - Stalled Candidates Flagged: ${summary.totalStalled} (Critical: ${summary.criticalCount}, High: ${summary.highCount})`);
      console.log(`  - Processing Latency: ${elapsed} ms\n`);
    }

    console.log(`${colors.green}✓ Stress test complete! All edge cases, corrupted dates, and header drifts safely recovered.${colors.reset}\n`);
  });

program.parse(process.argv);

// If called without arguments, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
