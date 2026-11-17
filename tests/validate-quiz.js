'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const app = fs.readFileSync('app.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');
const combinedConfig = JSON.parse(fs.readFileSync('CONFIG_TARJETA.json', 'utf8'));
const config20 = JSON.parse(fs.readFileSync('CONFIG_TARJETA_20.json', 'utf8'));

const formats = {
  20: config20,
  30: combinedConfig.formats && combinedConfig.formats['30']
};

function readSvg(count) {
  const path = count === 20 ? 'assets/plantilla_quiz_20.svg' : 'assets/plantilla_quiz_30.svg';
  const svg = fs.readFileSync(path, 'utf8');
  assert.match(svg, new RegExp('QUIZ-R' + count + '-MOBILE-V1'));
  assert.doesNotMatch(svg, /Balbino García|Colegio/i);
  return svg;
}

function bubbleCenters(svg) {
  return [...svg.matchAll(/<circle cx="([^"]+)" cy="([^"]+)" r="18\.2" class="bubble"\/>/g)]
    .map(match => [Number(match[1]), Number(match[2])]);
}

function markerCenters(svg) {
  return [...svg.matchAll(/<rect x="([^"]+)" y="([^"]+)" width="72" height="72" fill="#080d20"\/>/g)]
    .map(match => [Number(match[1]) + 36, Number(match[2]) + 36]);
}

for (const count of [20, 30]) {
  const config = formats[count];
  assert.ok(config, 'Falta configuración para QUIZ ' + count);
  assert.equal(config.scoring.questions, count);
  assert.equal(config.scoring.maximumScore, 50);
  assert.equal(config.bubbleCenters.rowY.length, count / 2);

  const svg = readSvg(count);
  assert.match(svg, new RegExp('width="1199" height="' + config.referenceSize.height + '"'));
  assert.match(svg, new RegExp('<rect width="1199" height="' + config.referenceSize.height + '" fill="#ffffff"'));
  assert.match(svg, new RegExp('Tarjeta vertical de ' + count + ' preguntas'));
  assert.equal([...svg.matchAll(/<rect x="(?:82|610)" y="416" width="490" height="(\d+)"/g)].length, 2);
  assert.equal(new Set([...svg.matchAll(/<rect x="(?:82|610)" y="416" width="490" height="(\d+)"/g)].map(match => match[1])).size, 1);
  const actualBubbles = bubbleCenters(svg);
  assert.equal(actualBubbles.length, count * 4, 'Cantidad de burbujas incorrecta para QUIZ ' + count);

  const xs = [...config.bubbleCenters.leftColumnX, ...config.bubbleCenters.rightColumnX];
  const expectedBubbles = [];
  for (let question = 0; question < count; question++) {
    const row = question % (count / 2);
    const firstX = question < count / 2 ? 0 : 4;
    for (let option = 0; option < 4; option++) {
      expectedBubbles.push([xs[firstX + option], config.bubbleCenters.rowY[row]]);
    }
  }
  assert.deepEqual(actualBubbles, expectedBubbles, 'Coordenadas de burbujas no coinciden para QUIZ ' + count);

  const actualMarkers = markerCenters(svg);
  assert.equal(actualMarkers.length, 4, 'Deben existir cuatro marcadores');
  const m = config.fiducialMarkers;
  assert.deepEqual(actualMarkers, [
    [m.topLeft.x, m.topLeft.y],
    [m.topRight.x, m.topRight.y],
    [m.bottomLeft.x, m.bottomLeft.y],
    [m.bottomRight.x, m.bottomRight.y]
  ], 'Coordenadas de marcadores no coinciden para QUIZ ' + count);

  const expectedCorrectPoints = 50 / count;
  assert.equal(Number((count * expectedCorrectPoints).toFixed(1)), 50);
}

assert.match(app, /const QUESTION_COUNTS = \[20, 30\]/);
assert.match(app, /function changeQuizType/);
assert.match(app, /answerKeys/);
assert.match(app, /function verifySelectedQuizType/);
assert.match(app, /QUIZ_TYPE_MISMATCH/);
assert.match(app, /verifySelectedQuizType\(markers\)/);
assert.match(app, /verifySelectedQuizType\(liveMarkers\)/);
assert.match(app, /let POINTS_PER_CORRECT = MAX_SCORE \/ QUESTION_COUNT/);
assert.match(app, /length: MAX_QUESTION_COUNT/);

assert.match(index, /id="quizType20"/);
assert.match(index, /id="quizType30"/);
assert.match(index, /20 preguntas/);
assert.match(index, /30 preguntas/);
assert.match(app, /plantilla_quiz_20\.svg/);
assert.match(app, /plantilla_quiz_30\.svg/);
assert.match(serviceWorker, /plantilla_quiz_20\.svg/);
assert.match(serviceWorker, /plantilla_quiz_30\.svg/);

console.log('Validación QUIZ correcta: tarjetas 20 y 30, burbujas, marcadores, selector, claves y formatos cruzados.');
