// Copies the public pages in legal/ to dist/legal-site for `npm run legal:deploy`.
// Internal files (REVIEWER-NOTES.md) stay out of the deployment.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'legal');
const out = path.join(root, 'dist', 'legal-site');
const EXCLUDE = new Set(['REVIEWER-NOTES.md']);

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(src, out, { recursive: true, filter: (file) => !EXCLUDE.has(path.basename(file)) });
console.log(`Legal site ready in ${path.relative(root, out)}`);
