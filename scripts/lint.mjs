import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const SOURCE_FILES = [
  'index.js',
  'App.js',
  'components/ControlPanel.js',
  'constants.js',
  'types.js',
  'utils/geometry.js',
  'scripts/lint.mjs',
  'scripts/format-check.mjs',
  'scripts/validate-imports.mjs',
];

for (const file of SOURCE_FILES) {
  const source = await readFile(file, 'utf8');
  if (!source.trim()) {
    throw new Error(`Lint failed: ${file} is empty.`);
  }

  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Lint passed for ${SOURCE_FILES.length} files.`);
