import fs from 'fs';
import path from 'path';

interface CandidateTemplate {
  name: string;
  email: string;
  role: string;
  dept: string;
  stage: string;
  daysAgo: number;
  hm: string;
  recruiter: string;
  owner: string;
  notes: string;
  tags: string;
}

const FIRST_NAMES = ['Amina', 'Marcus', 'Sophia', 'Devon', 'Liam', 'Zack', 'Elena', 'Tariq', 'Chloe', 'Arjun', 'Maya', 'David', 'Sarah', 'Carlos', 'Fatima'];
const LAST_NAMES = ['Vance', 'Chen', 'Patel', 'Rao', 'Gallagher', 'Meyer', 'Kim', 'Okafor', 'Jenkins', 'Rodriguez', 'Alba', 'Thorne', 'Lin', 'Dupont', 'Rossi'];
const ROLES = [
  { role: 'Staff Backend Engineer', dept: 'Core Platform', stage: 'Offer Extended', sla: 2 },
  { role: 'Senior AI / ML Engineer', dept: 'AI Platform', stage: 'Debrief', sla: 1 },
  { role: 'Product Manager, Growth', dept: 'Growth', stage: 'Technical Interview', sla: 3 },
  { role: 'Lead DevOps / SRE', dept: 'Infrastructure', stage: 'Onsite / Final', sla: 2 },
  { role: 'Engineering Manager', dept: 'Data Platform', stage: 'Take-Home', sla: 3 },
  { role: 'Senior Product Designer', dept: 'Design', stage: 'Screening', sla: 2 },
  { role: 'Security Architect', dept: 'Security', stage: 'Offer Discussion', sla: 2 },
  { role: 'Fullstack Engineer', dept: 'Engineering', stage: 'Applied', sla: 3 },
  { role: 'Mobile Lead (iOS)', dept: 'Mobile', stage: 'Screening', sla: 2 },
  { role: 'Data Scientist', dept: 'Analytics', stage: 'Debrief', sla: 1 },
];

const MANAGERS = ['Marcus Vance', 'Sarah Jenkins', 'Dr. Lisa Cuddy', 'Rachel Green'];
const RECRUITERS = ['Jessica Alba', 'David Ortiz'];

export function generateCustomHiringBoard(rowCount = 12, outputPath = 'my_custom_hiring_board.csv'): string {
  const today = new Date();
  const rows: string[] = [
    'Candidate ID,Name,Email,Role,Department,Stage,Last Activity,Hiring Manager,Recruiter,Next Step Owner,Notes,Tags'
  ];

  for (let i = 1; i <= rowCount; i++) {
    const id = `CAND-${600 + i}`;
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[(i * 3) % LAST_NAMES.length];
    const name = `${first} ${last}`;
    const email = `${first.toLowerCase()}.${last.toLowerCase()}@example.com`;
    const roleDef = ROLES[i % ROLES.length];
    const hm = MANAGERS[i % MANAGERS.length];
    const recruiter = RECRUITERS[i % RECRUITERS.length];

    // Generate days ago: mix of severe stalls (4-12 days) and healthy (1 day)
    let daysAgo = 1;
    let notes = '';
    let tags = '';
    let owner = recruiter;

    if (i === 1) {
      // Emergency Competing Offer
      daysAgo = 3;
      notes = 'Candidate reviewing offer letter. Competing offer from Stripe expires in 24 hours!';
      tags = 'urgent;competing_offer;executive';
      owner = 'Recruiter';
    } else if (i === 2) {
      // Debrief Missing Scorecard
      daysAgo = 4;
      notes = 'Loop completed last week. Waiting on engineering panel to submit scorecards.';
      tags = 'scorecard_pending;bottleneck';
      owner = 'Hiring Manager';
    } else if (i === 3) {
      // Unresponsive Candidate
      daysAgo = 7;
      notes = 'Sent two follow-up scheduling links. Candidate has been unresponsive.';
      tags = 'unresponsive;ghosted';
      owner = 'Candidate';
    } else if (i === 4) {
      // Take Home Stalled
      daysAgo = 5;
      notes = 'GitHub repository submitted for coding assessment. HM needs to assign reviewer.';
      tags = 'take_home_pending';
      owner = 'Hiring Manager';
    } else if (i === 5) {
      // Visa / Competing Offer
      daysAgo = 4;
      notes = 'Verbal offer extended. Needs H-1B transfer approval and competing offer match.';
      tags = 'competing_offer;visa';
      owner = 'Recruiter';
    } else if (i === 6) {
      // Executive referral
      daysAgo = 5;
      notes = 'Executive referral by CEO. Waiting on initial screen scheduling.';
      tags = 'executive_referral;high_priority';
      owner = 'Recruiter';
    } else {
      daysAgo = (i % 6) + 1;
      notes = `Standard pipeline progression for ${roleDef.role}.`;
      tags = 'standard';
      owner = i % 2 === 0 ? 'Hiring Manager' : 'Recruiter';
    }

    const activityDate = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const dateStr = activityDate.toISOString().split('T')[0];

    rows.push(
      `"${id}","${name}","${email}","${roleDef.role}","${roleDef.dept}","${roleDef.stage}","${dateStr}","${hm}","${recruiter}","${owner}","${notes}","${tags}"`
    );
  }

  const csvContent = rows.join('\n');
  const target = path.resolve(process.cwd(), outputPath);
  fs.writeFileSync(target, csvContent, 'utf-8');
  return target;
}

// If run from command line
if (process.argv[1]?.includes('generateCsv')) {
  const count = process.argv[2] ? parseInt(process.argv[2], 10) : 12;
  const out = process.argv[3] || 'my_custom_hiring_board.csv';
  const fullPath = generateCustomHiringBoard(count, out);
  console.log(`\n✓ Generated fresh hiring board CSV with ${count} candidates!`);
  console.log(`📁 File location: ${fullPath}\n`);
}
