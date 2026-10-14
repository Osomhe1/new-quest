import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parseHiringBoardCSV } from '../parser/csvParser.js';
import { evaluateHiringBoard, DEFAULT_SLA_CONFIG, analyzeCandidateStall } from '../analyzer/stallAnalyzer.js';
import { enrichAnalysesWithActions, generateActionPlan } from '../ai/actionPlanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// API: Analyze CSV
app.post('/api/analyze', async (req, res) => {
  try {
    let csvContent = '';
    let customThreshold = undefined;
    let referenceDate = new Date();

    if (typeof req.body === 'string') {
      csvContent = req.body;
    } else if (req.body && typeof req.body.csv === 'string') {
      csvContent = req.body.csv;
      if (req.body.threshold) {
        customThreshold = parseInt(req.body.threshold, 10);
      }
      if (req.body.referenceDate) {
        referenceDate = new Date(req.body.referenceDate);
      }
    }

    if (!csvContent || csvContent.trim() === '') {
      return res.status(400).json({ error: 'No CSV content provided' });
    }

    const parseResult = parseHiringBoardCSV(csvContent, referenceDate);
    const summary = evaluateHiringBoard(
      parseResult.candidates,
      referenceDate,
      DEFAULT_SLA_CONFIG,
      customThreshold,
      parseResult.warnings
    );

    // Enrich top stalled candidates with action plans
    const enrichedAnalyses = await enrichAnalysesWithActions(summary.analyses);
    summary.analyses = enrichedAnalyses;

    res.json({
      success: true,
      summary,
      totalRowsProcessed: parseResult.totalRowsProcessed,
      archivedCount: parseResult.archivedCandidatesCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error processing CSV' });
  }
});

// API: Load sample dataset
app.get('/api/sample/:name', (req, res) => {
  try {
    const filename = `${req.params.name}.csv`;
    const dataPath = path.resolve(process.cwd(), 'data', filename);

    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({ error: `Sample file '${filename}' not found.` });
    }

    const content = fs.readFileSync(dataPath, 'utf-8');
    res.type('text/plain').send(content);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// Serve frontend fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Stall Alerter Web Dashboard live at: http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser to inspect and triage stalled candidates.\n`);
});
