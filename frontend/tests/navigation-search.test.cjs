const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function utility(name) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/utils', name + '.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, URL, Date });
  return exports;
}
const { safeNextPath } = utility('navigation');
const { hasReturnConnection, normalizeSearch } = utility('search');

test('post-login destinations reject external, backslash, and control-character network paths', () => {
  for (const input of [null, '', 'https://qa.invalid', '//qa.invalid', '/\\qa.invalid', '/\t/qa.invalid', '/\n/qa.invalid', 'javascript:alert(1)']) assert.equal(safeNextPath(input), '/bookings');
  assert.equal(safeNextPath('/checkout?outbound=42&passengers=2'), '/checkout?outbound=42&passengers=2');
  assert.equal(safeNextPath('/flights?origin=SGN&destination=HAN#results'), '/flights?origin=SGN&destination=HAN#results');
});

test('return flight selection respects the documented one-hour connection across time zones', () => {
  const arrival = '2026-11-03T23:30:00+08:00';
  assert.equal(hasReturnConnection(arrival, '2026-11-03T23:29:59+07:00'), false);
  assert.equal(hasReturnConnection(arrival, '2026-11-03T23:30:00+07:00'), true);
  assert.equal(hasReturnConnection(arrival, '2026-11-04T00:00:00+08:00'), false);
  assert.equal(hasReturnConnection(arrival, '2026-11-04T00:30:00+08:00'), true);
  assert.equal(hasReturnConnection(arrival, 'invalid'), false);
});

test('airport matching keeps Vietnamese normalization for keyboard searches', () => {
  assert.equal(normalizeSearch('  ĐÀ NẴNG  '), 'da nang');
});
