#!/usr/bin/env node

/**
 * Harness Engineering CLI
 * 
 * Commands:
 *   risk-tier [files...]  - Classify risk tier for files
 *   verify               - Run verification checklist
 *   smoke               - Run smoke tests
 *   pre-pr              - Pre-PR checklist
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const POLICY_FILE = 'risk-policy.json';

// Load risk policy
function loadPolicy() {
  const policyPath = path.join(process.cwd(), POLICY_FILE);
  if (!fs.existsSync(policyPath)) {
    console.warn('Warning: No risk-policy.json found, using defaults');
    return {
      riskTierRules: {
        critical: { paths: ['**/auth*', '**/*.env*'] },
        high: { paths: ['**/routes/**', '**/services/**'] },
        medium: { paths: ['**/components/**', '**/utils/**'] },
        low: { paths: ['**/docs/**', '**/*.md'] }
      }
    };
  }
  return JSON.parse(fs.readFileSync(policyPath, 'utf8'));
}

// Match file against pattern
function matchPattern(file, pattern) {
  const regex = new RegExp(
    '^' + pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '@@DOUBLESTAR@@')
      .replace(/\*/g, '[^/]*')
      .replace(/@@DOUBLESTAR@@/g, '.*') + '$'
  );
  return regex.test(file);
}

// Classify risk tier for files
function classifyRiskTier(files) {
  const policy = loadPolicy();
  const tiers = ['critical', 'high', 'medium', 'low'];
  let highestTier = 'low';
  const fileClassifications = {};

  for (const file of files) {
    let fileTier = 'low';
    for (const tier of tiers) {
      const patterns = policy.riskTierRules[tier]?.paths || [];
      for (const pattern of patterns) {
        if (matchPattern(file, pattern)) {
          if (tiers.indexOf(tier) < tiers.indexOf(fileTier)) {
            fileTier = tier;
          }
        }
      }
    }
    fileClassifications[file] = fileTier;
    if (tiers.indexOf(fileTier) < tiers.indexOf(highestTier)) {
      highestTier = fileTier;
    }
  }

  return { highestTier, fileClassifications };
}

// Run verification checklist
function runVerification() {
  const checks = [
    { name: 'Tests pass', cmd: 'npm test', required: true },
    { name: 'Lint passes', cmd: 'npm run lint', required: false },
    { name: 'Build succeeds', cmd: 'npm run build', required: true },
    { name: 'No console.log in src', cmd: 'grep -r "console.log" src/ || true', check: (out) => !out.trim() },
    { name: 'No TODO in diff', cmd: 'git diff --cached | grep -i "TODO\\|FIXME" || true', check: (out) => !out.trim() },
  ];

  console.log('\n🔍 Running verification checklist...\n');
  const results = [];

  for (const check of checks) {
    process.stdout.write(`  ${check.name}... `);
    try {
      const output = execSync(check.cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      if (check.check) {
        if (check.check(output)) {
          console.log('✅');
          results.push({ name: check.name, passed: true });
        } else {
          console.log('⚠️');
          results.push({ name: check.name, passed: false, warning: true });
        }
      } else {
        console.log('✅');
        results.push({ name: check.name, passed: true });
      }
    } catch (err) {
      if (check.required) {
        console.log('❌');
        results.push({ name: check.name, passed: false, error: err.message });
      } else {
        console.log('⚠️ (optional)');
        results.push({ name: check.name, passed: false, warning: true });
      }
    }
  }

  const failed = results.filter(r => !r.passed && !r.warning);
  console.log('\n' + '─'.repeat(40));
  if (failed.length === 0) {
    console.log('✅ All required checks passed!');
    return true;
  } else {
    console.log(`❌ ${failed.length} required check(s) failed:`);
    failed.forEach(f => console.log(`   - ${f.name}`));
    return false;
  }
}

// Run smoke tests
function runSmoke() {
  console.log('\n🔥 Running smoke tests...\n');
  
  const smokeTests = [
    { name: 'Health check', cmd: 'curl -s http://localhost:3000/health || echo "Server not running"' },
    { name: 'Build', cmd: 'npm run build' },
    { name: 'Unit tests', cmd: 'npm test -- --testPathPattern="unit"' },
  ];

  for (const test of smokeTests) {
    process.stdout.write(`  ${test.name}... `);
    try {
      execSync(test.cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      console.log('✅');
    } catch {
      console.log('❌');
    }
  }
}

// Pre-PR checklist
function prePR() {
  console.log('\n📋 Pre-PR Checklist\n');
  
  // Get changed files
  let changedFiles = [];
  try {
    const diff = execSync('git diff --name-only HEAD~1', { encoding: 'utf8' });
    changedFiles = diff.trim().split('\n').filter(Boolean);
  } catch {
    console.log('Could not get changed files');
    changedFiles = [];
  }

  // Classify risk
  if (changedFiles.length > 0) {
    const { highestTier, fileClassifications } = classifyRiskTier(changedFiles);
    const tierEmoji = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
    
    console.log(`Risk Tier: ${tierEmoji[highestTier]} ${highestTier.toUpperCase()}\n`);
    console.log('Changed files:');
    for (const [file, tier] of Object.entries(fileClassifications)) {
      console.log(`  ${tierEmoji[tier]} ${file}`);
    }
    console.log('');
  }

  // Run verification
  return runVerification();
}

// CLI
const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case 'risk-tier':
    const files = args.length > 0 ? args : ['src/index.js'];
    const { highestTier, fileClassifications } = classifyRiskTier(files);
    console.log(JSON.stringify({ highestTier, files: fileClassifications }, null, 2));
    break;
  
  case 'verify':
    const passed = runVerification();
    process.exit(passed ? 0 : 1);
    break;
  
  case 'smoke':
    runSmoke();
    break;
  
  case 'pre-pr':
    const prePassed = prePR();
    process.exit(prePassed ? 0 : 1);
    break;
  
  default:
    console.log(`
Harness Engineering CLI

Usage:
  node harness.js risk-tier [files...]  - Classify risk tier
  node harness.js verify               - Run verification checklist
  node harness.js smoke                - Run smoke tests
  node harness.js pre-pr               - Pre-PR checklist
    `);
}
