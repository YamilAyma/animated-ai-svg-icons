const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  red: '\x1b[31m'
};

function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf8' });
  } catch (err) {
    console.error(`${COLORS.red}[ERROR] Command failed: ${command}${COLORS.reset}`);
    console.error(err.stdout || err.stderr || err.message);
    throw err;
  }
}

function atomicCommitIcons() {
  console.log(`${COLORS.bold}${COLORS.cyan}===============================================`);
  console.log(`🚀   Atomic SVG Icon Git Commit Pipeline   🚀`);
  console.log(`===============================================${COLORS.reset}\n`);

  // 1. Get status list
  const statusOutput = runCommand('git status --porcelain -u');
  const lines = statusOutput.split('\n');

  const svgFiles = [];
  const otherFiles = [];

  lines.forEach(line => {
    if (!line.trim()) return;
    
    // Status is first 2 chars, followed by a space and then the file path
    const status = line.substring(0, 2).trim();
    const filePath = line.substring(3).trim();

    if (filePath.endsWith('.svg') && filePath.includes('svg-icons')) {
      svgFiles.push({ path: filePath, status });
    } else {
      otherFiles.push({ path: filePath, status });
    }
  });

  if (svgFiles.length === 0) {
    console.log(`${COLORS.yellow}No new or modified SVG icons found to commit.${COLORS.reset}`);
  } else {
    console.log(`${COLORS.bold}Processing ${svgFiles.length} SVG icon(s) atomically...${COLORS.reset}\n`);

    svgFiles.forEach(file => {
      const filename = path.basename(file.path);
      const iconName = path.basename(file.path, '.svg');
      const relPath = file.path.replace(/\\/g, '/');

      // Stage single file
      console.log(`📦 Staging ${COLORS.green}${relPath}${COLORS.reset}...`);
      runCommand(`git add "${relPath}"`);

      // Determine clean commit message matching standard rules
      let commitMessage = '';
      if (file.status === '??' || file.status === 'A') {
        commitMessage = `feat(icons): add animated ${iconName} icon`;
      } else {
        commitMessage = `refactor(icons): optimize animated ${iconName} icon`;
      }

      // Execute Commit
      console.log(`💾 Committing with message: "${COLORS.bold}${commitMessage}${COLORS.reset}"`);
      runCommand(`git commit -m "${commitMessage}"`);
      console.log(`${COLORS.green}✔ Committed successfully!${COLORS.reset}\n`);
    });
  }

  // 2. Refresh dynamic gallery README.md and commit it
  console.log(`📊 Regenerating showcase gallery in README.md...`);
  runCommand('node scripts/update-readme.js');

  const finalStatusOutput = runCommand('git status --porcelain -u');
  const finalLines = finalStatusOutput.split('\n');
  
  const modifiedReadme = finalLines.find(l => l.includes('README.md'));
  const modifiedScripts = finalLines.filter(l => l.includes('scripts/') && !l.includes('commit-icons.js'));

  if (modifiedReadme) {
    console.log(`\n📝 Staging and committing updated README.md...`);
    runCommand('git add README.md');
    runCommand('git commit -m "docs(gallery): compile dynamic icon showcase in README.md"');
    console.log(`${COLORS.green}✔ README.md committed successfully!${COLORS.reset}`);
  }

  if (modifiedScripts.length > 0) {
    console.log(`\n🛠️ Staging and committing updated repository helper scripts...`);
    modifiedScripts.forEach(line => {
      const filePath = line.substring(3).trim().replace(/\\/g, '/');
      runCommand(`git add "${filePath}"`);
    });
    runCommand('git commit -m "tool(showcase): support animals, plants, and things categories"');
    console.log(`${COLORS.green}✔ Helper scripts committed successfully!${COLORS.reset}`);
  }

  console.log(`\n${COLORS.bold}${COLORS.green}=================== COMPLETE ===================`);
  console.log(`✨ All operations completed successfully!`);
  console.log(`===============================================${COLORS.reset}`);
}

atomicCommitIcons();
