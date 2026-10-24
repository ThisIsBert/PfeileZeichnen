import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const SOURCE_FILES = [
  'index.js',
  'App.js',
  'components/ControlPanel.js',
  'components/TemplateControls.js',
  'components/ProjectControls.js',
  'components/ShapeParameterControl.js',
  'app/hooks/useEditorHistory.js',
  'app/state/history.js',
  'app/types/arrowModel.js',
  'app/types/shapeParameters.js',
  'app/map/savedArrows.js',
  'app/map/interactions/drag.js',
  'app/io/importGeoJson.js',
  'app/io/projectFile.js',
  'app/map/projectView.js',
  'app/map/lifecycle.js',
  'app/map/templateLayer.js',
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
