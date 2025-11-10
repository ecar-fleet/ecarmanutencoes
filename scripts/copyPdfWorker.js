const fs = require('fs');
const path = require('path');

const pdfjsDir = path.resolve(__dirname, '../node_modules/pdfjs-dist');
const destDir = path.resolve(__dirname, '../public');
const dest = path.join(destDir, 'pdf.worker.min.js');

function findWorker(startDir) {
  const entries = fs.readdirSync(startDir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(startDir, e.name);
    if (e.isFile() && /^pdf\.worker(.*)\.js$/.test(e.name)) return full;
    if (e.isDirectory()) {
      try {
        const found = findWorker(full);
        if (found) return found;
      } catch (err) {
        // ignore
      }
    }
  }
  return null;
}

if (!fs.existsSync(pdfjsDir)) {
  console.error('pdfjs-dist not found in node_modules. Run `npm install` first.');
  process.exit(1);
}

const workerPath = findWorker(pdfjsDir);
if (!workerPath) {
  console.error('Could not find pdf.worker*.js inside pdfjs-dist. Make sure pdfjs-dist is installed and contains the worker file.');
  process.exit(1);
}

try {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(workerPath, dest);
  console.log('Copied', workerPath, 'to', dest);
} catch (err) {
  console.error('Failed to copy pdf worker file:', err);
  process.exit(1);
}
