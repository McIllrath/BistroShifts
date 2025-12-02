const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error('Source build folder not found:', src);
    process.exit(2);
  }
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const workspace = path.resolve(__dirname, '..', '..');
const buildDir = path.join(workspace, 'client', 'dist');
const target = path.join(workspace, 'server', 'public');

console.log('Copying client build from', buildDir, 'to', target);
// remove target contents first
try {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
} catch (err) {
  console.error('Failed to clear target folder', err);
}

copyDir(buildDir, target);
console.log('Copy complete.');
