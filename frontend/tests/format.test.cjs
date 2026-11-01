const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
const source = fs.readFileSync(path.join(__dirname, '../src/utils/format.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
vm.runInNewContext(compiled, { exports: exportsObject, Intl, Date });
const format = exportsObject;

test('airport-local dates agree with airport-local clocks across midnight', () => {
  const arrival = '2026-11-03T16:30:00Z';
  assert.equal(format.clock(arrival, 'Asia/Singapore'), '00:30');
  assert.equal(format.dateLabel(arrival, 'Asia/Singapore'), '04/11/2026');
  assert.equal(format.dateLabel(arrival, 'Asia/Ho_Chi_Minh'), '03/11/2026');
});

test('dates support international offsets and daylight saving without changing the Vietnam default', () => {
  assert.equal(format.dateLabel('2026-11-03T01:00:00Z', 'America/Los_Angeles'), '02/11/2026');
  assert.equal(format.clock('2026-07-01T12:00:00Z', 'America/New_York'), '08:00');
  assert.equal(format.dateLabel('2026-11-03T01:00:00Z'), '03/11/2026');
});
