import { readFile } from 'node:fs/promises';

const html = await readFile('index.html', 'utf8');

if (!html.includes('<script type="module" src="./index.js"></script>')) {
  throw new Error('index.html must load the local ES module entrypoint: ./index.js');
}

const importMapMatch = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
if (!importMapMatch) {
  throw new Error('index.html must include an import map for CDN module dependencies.');
}

let importMap;
try {
  importMap = JSON.parse(importMapMatch[1]);
} catch {
  throw new Error('Import map in index.html is not valid JSON.');
}

const imports = importMap?.imports ?? {};
if (typeof imports !== 'object' || imports === null) {
  throw new Error('Import map must contain an "imports" object.');
}

for (const [specifier, target] of Object.entries(imports)) {
  if (typeof target !== 'string' || !/^https:\/\//.test(target)) {
    throw new Error(`Import "${specifier}" must resolve to an explicit CDN https URL.`);
  }
}

console.log(`validate:imports passed for ${Object.keys(imports).length} import-map entries.`);
