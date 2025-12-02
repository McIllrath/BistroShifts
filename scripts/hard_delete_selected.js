const fs = require('fs');
const path = require('path');

const workspace = path.resolve(__dirname, '..');
const targets = [
  path.join(workspace, 'node_modules'),
  path.join(workspace, 'client', 'node_modules'),
  path.join(workspace, 'server', 'node_modules'),
  path.join(workspace, 'client', 'dist'),
  path.join(workspace, 'client', 'client-dev.log'),
  path.join(workspace, 'server', 'client_dev_out.log'),
  path.join(workspace, 'server', 'client_dev_err.log'),
  path.join(workspace, 'server', 'server_out.log'),
  path.join(workspace, 'server', 'server_err.log'),
  path.join(workspace, 'server', 'server-dev.log'),
  path.join(workspace, 'server', 'server-dev-4001.log'),
  path.join(workspace, 'server', 'e2e-results.json'),
  path.join(workspace, 'run-dev.bat'),
  path.join(workspace, 'cleanup-backups'),
  path.join(workspace, 'client', 'tests'),
  path.join(workspace, 'client', 'playwright.config.js')
];

function remove(target) {
  try {
    if (!fs.existsSync(target)) {
      console.log('Not found:', target);
      return;
    }
    const stat = fs.lstatSync(target);
    if (stat.isDirectory()) {
      fs.rmSync(target, { recursive: true, force: true });
      console.log('Removed directory:', target);
    } else {
      fs.rmSync(target, { force: true });
      console.log('Removed file:', target);
    }
  } catch (err) {
    console.error('Failed to remove', target, err && err.message);
  }
}

for (const t of targets) remove(t);

// remove any top-level *.log files
const topLogs = fs.readdirSync(workspace).filter(f => f.toLowerCase().endsWith('.log'));
for (const f of topLogs) {
  const p = path.join(workspace, f);
  try { fs.rmSync(p, { force: true }); console.log('Removed log:', p); } catch (e) { console.error('Failed to remove log:', p, e && e.message); }
}

console.log('Hard delete script finished.');
