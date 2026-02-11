import { readFile } from 'node:fs/promises';

const FILES = [
  'index.html',
  'index.js',
  'App.js',
  'components/ControlPanel.js',
  'constants.js',
  'types.js',
  'utils/geometry.js',
  'README.md',
  'ARCHITECTURE.md',
  'package.json',
  '.github/workflows/static-checks.yml',
  'scripts/lint.mjs',
  'scripts/format-check.mjs',
  'scripts/validate-imports.mjs',
];

const issues = [];

for (const file of FILES) {
  const text = await readFile(file, 'utf8');
  const lines = text.split('\n');

  if (!text.endsWith('\n')) {
    issues.push(`${file}: missing trailing newline`);
  }

  lines.forEach((line, i) => {
    if (/\s+$/.test(line)) {
      issues.push(`${file}:${i + 1}: trailing whitespace`);
    }
    if (/^\t+/.test(line)) {
      issues.push(`${file}:${i + 1}: tab indentation is not allowed`);
    }
  });
}

if (issues.length > 0) {
  console.error('format:check failed with the following issues:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`format:check passed for ${FILES.length} files.`);
