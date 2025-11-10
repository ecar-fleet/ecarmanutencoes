const fs = require('fs');
const path = require('path');

const pdfjsDir = path.resolve(__dirname, '../node_modules/pdfjs-dist');
const destDir = path.resolve(__dirname, '../public');

function findWorker(startDir) {
  const entries = fs.readdirSync(startDir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(startDir, e.name);
    if (e.isFile() && /^pdf\.worker(.*)\.(js|mjs)$/.test(e.name)) return full;
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
  // copy preserving original filename
  const originalName = path.basename(workerPath);
  const destOriginal = path.join(destDir, originalName);
  fs.copyFileSync(workerPath, destOriginal);
  console.log('Copied', workerPath, 'to', destOriginal);
  // also create a .js fallback (some setups request .mjs, others .js)
  const fallbackName = originalName.replace(/\.mjs$/, '.js');
  const destFallback = path.join(destDir, fallbackName);
  if (!fs.existsSync(destFallback)) {
    fs.copyFileSync(workerPath, destFallback);
    console.log('Also copied to', destFallback);
  }
} catch (err) {
  console.error('Failed to copy pdf worker file:', err);
  process.exit(1);
}
