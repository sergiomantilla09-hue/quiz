import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const html = readFileSync(join(root, 'index.html'), 'utf8');
const app = readFileSync(join(root, 'app.js'), 'utf8');
const serviceWorker = readFileSync(join(root, '..', 'sw.js'), 'utf8');

new Function(app);
assert.ok(html.includes('app.js?v=18'));
assert.ok(html.includes('Volver a QUIZ'));
assert.ok(html.includes('pliegoStep1') && html.includes('pliegoStep4'));
assert.ok(html.includes('originalKeysBtn'));
assert.ok(app.includes('quiz.pliego.pending-variants'));

assert.ok(html.includes('quiz-exact-svg'));
assert.ok(app.includes('plantilla_quiz_20.svg'));
assert.ok(app.includes('plantilla_quiz_30.svg'));
assert.ok(html.includes('text-align:justify'));
assert.ok(html.includes('.paper-column{min-width:0;display:flex;flex-direction:column;gap:0;overflow:hidden}'));
assert.ok(html.includes('max-width:3.69in'));
assert.ok(app.includes("replace(/[\\t ]*\\n[\\t ]*/g,' ')"));

const cards = [
  ['QUIZ-20-lengua-castellana-recuperacion-10.svg', 1312, 'QUIZ-R20-MOBILE-V1'],
  ['QUIZ-30-lengua-castellana-recuperacion-10.svg', 1700, 'QUIZ-R30-MOBILE-V1']
];

for (const [filename, height, id] of cards) {
  const svg = readFileSync(join(root, 'assets', filename), 'utf8');
  assert.ok(svg.includes(`width="1199" height="${height}" viewBox="0 0 1199 ${height}"`));
  assert.ok(svg.includes('<rect x="50" y="31" width="72" height="72"'));
  assert.ok(svg.includes('<rect x="1078" y="29" width="72" height="72"'));
  assert.ok(svg.includes('cx="256.8" cy="516.8" r="18.2" class="bubble"'));
  assert.ok(svg.includes(id));
}

assert.ok(serviceWorker.includes('pliego/index.html?v=18'));
assert.ok(serviceWorker.includes('assets/plantilla_quiz_20.svg'));
assert.ok(serviceWorker.includes('assets/plantilla_quiz_30.svg'));

console.log('PLIEGO validation passed.');
