const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const files = [
  'index.tsx',
  'App.tsx',
  'constants.ts',
  'types.ts',
  'components/ControlPanel.tsx',
  'utils/geometry.ts'
];

function compile(srcPath) {
  const code = fs.readFileSync(srcPath, 'utf8');
  const result = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: srcPath
  });
  let output = result.outputText;
  output = output.replace(/from\s+(['"])(\.\.\/[^'"\n]+|\.\/?[^'"\n]+)\1/g, (m, q, p) => {
    if (!p.startsWith('.') || p.endsWith('.js') || p.endsWith('.json')) {
      return m;
    }
    return `from ${q}${p}.js${q}`;
  });
  const dest = srcPath.replace(/\.tsx?$/, '.js');
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dest, output);
}

files.forEach(compile);
