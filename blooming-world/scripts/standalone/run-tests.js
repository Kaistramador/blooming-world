/* Node runner: concatenates data.js + engine.js + test body into one scope. */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const src =
  fs.readFileSync(path.join(dir, 'parts/data.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(dir, 'parts/engine.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(dir, 'test-engine-js.js'), 'utf8')
    .replace(/^require\([^)]*\);\s*$/gm, '');
eval(src);
