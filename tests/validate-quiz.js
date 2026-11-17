'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');

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
  assert.match(svg, new RegExp('Tarjeta QUIZ de ' + count + ' preguntas'));
  assert.equal([...svg.matchAll(/<rect x="(?:82|610)" y="416" width="490" height="(\d+)"/g)].length, 2);
  assert.equal(new Set([...svg.matchAll(/<rect x="(?:82|610)" y="416" width="490" height="(\d+)"/g)].map(match => match[1])).size, 1);
  const questionNumbers = [...svg.matchAll(/<text x="[^"]+" y="[^"]+" dy="5" class="qnum">(\d+)<\/text>/g)];
  assert.equal(questionNumbers.length, count, 'Números de pregunta no centrados para QUIZ ' + count);
  assert.deepEqual(questionNumbers.map(match => Number(match[1])), Array.from({ length: count }, (_, i) => i + 1));
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

for (const id of ['sheetArea', 'sheetGrade', 'sheetName', 'sheetPreviewSubject', 'downloadPngBtn', 'downloadJpgBtn', 'downloadSvgBtn']) {
  assert.ok(index.includes('id="' + id + '"'), 'Falta control del editor: ' + id);
}
for (const id of ['sheetTypePill', 'sheetTypeLabel', 'sheetSubjectLine']) {
  assert.ok(readSvg(20).includes('id="' + id + '"'), 'Falta campo editable en plantilla 20: ' + id);
  assert.ok(readSvg(30).includes('id="' + id + '"'), 'Falta campo editable en plantilla 30: ' + id);
}
assert.match(app, /function initializeSheetEditor/);
assert.match(app, /function downloadCustomizedSheet/);
assert.match(app, /new XMLSerializer\(\)/);
assert.match(app, /function getSheetEvaluationLabel/);
assert.match(app, /function mergeFrameReads/);
assert.match(app, /LIVE_CAPTURE_FRAME_COUNT = 5/);
assert.match(app, /LIVE_CAPTURE_INTERVAL_MS = 180/);
assert.match(app, /function measureBubble\(rgba/);
assert.match(app, /colorDistance/);
assert.match(app, /downloadCustomizedSheet\('png'\)/);
assert.match(app, /downloadCustomizedSheet\('jpg'\)/);
assert.match(app, /downloadCustomizedSheet\('svg'\)/);
assert.doesNotMatch(app, /sheetEvaluationType|sheetCustomLabelField|sheetCustomLabel|ui\.templateLink/);


// Behavioral OMR tests: synthetic marks on a white sheet, independent of a browser.
function extractFunction(name) {
  const start = app.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, 'No se encontró la función ' + name);
  const end = app.indexOf('\\nfunction ', start + 1);
  return app.slice(start, end === -1 ? app.length : end);
}
const omrSandbox = {
  TEMPLATE: { options: ['A', 'B', 'C', 'D'] },
  QUESTION_COUNT: 20,
  ROWS_PER_COLUMN: 10
};
vm.createContext(omrSandbox);
vm.runInContext([
  extractFunction('clamp'),
  extractFunction('measureBubble'),
  extractFunction('readAnswerBubbles'),
  extractFunction('mergeFrameReads'),
  extractFunction('isPendingAnswer')
].join('\\n'), omrSandbox);

function syntheticBubble(color, mark = 'filled') {
  const width = 80, height = 80, cx = 40, cy = 40;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let p = 0; p < pixels.length; p += 4) {
    pixels[p] = 255; pixels[p + 1] = 255; pixels[p + 2] = 255; pixels[p + 3] = 255;
  }
  if (mark !== 'empty') {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const dx = x - cx, dy = y - cy;
      const inside = mark === 'filled'
        ? dx * dx + dy * dy <= 7 * 7
        : dx * dx + dy * dy <= 9 * 9 && Math.abs(dy - dx * .6) <= 1.5;
      if (inside) {
        const p = (y * width + x) * 4;
        pixels[p] = color[0]; pixels[p + 1] = color[1]; pixels[p + 2] = color[2]; pixels[p + 3] = 255;
      }
    }
  }
  return { pixels, width, height };
}
for (const color of [[20, 20, 20], [20, 75, 220], [220, 35, 35]]) {
  const image = syntheticBubble(color);
  const measured = omrSandbox.measureBubble(image.pixels, image.width, image.height, 40, 40);
  assert.equal(measured.isMarked, true, 'Debe reconocer una burbuja rellena en distintos colores');
}
const slashImage = syntheticBubble([20, 75, 220], 'slash');
const slashMeasurement = omrSandbox.measureBubble(slashImage.pixels, 80, 80, 40, 40);
assert.equal(slashMeasurement.isMarked, false, 'Una línea que cruza la burbuja no debe contarse como relleno');
assert.ok(slashMeasurement.score >= .12, 'Una marca ambigua debe quedar señalada para revisión');

function testFullSheetRead(count, selected) {
  const config = formats[count];
  const template = {
    options: ['A', 'B', 'C', 'D'],
    bubbleXs: [...config.bubbleCenters.leftColumnX, ...config.bubbleCenters.rightColumnX],
    bubbleYs: config.bubbleCenters.rowY
  };
  omrSandbox.TEMPLATE = template;
  omrSandbox.QUESTION_COUNT = count;
  omrSandbox.ROWS_PER_COLUMN = count / 2;
  const width = 1199, height = config.referenceSize.height;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let p = 0; p < pixels.length; p += 4) {
    pixels[p] = 255; pixels[p + 1] = 255; pixels[p + 2] = 255; pixels[p + 3] = 255;
  }
  for (const [question, option, color] of selected) {
    const row = question % (count / 2);
    const xStart = question < count / 2 ? 0 : 4;
    const cx = Math.round(template.bubbleXs[xStart + option]);
    const cy = Math.round(template.bubbleYs[row]);
    for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
      if (dx * dx + dy * dy > 49) continue;
      const p = ((cy + dy) * width + cx + dx) * 4;
      pixels[p] = color[0]; pixels[p + 1] = color[1]; pixels[p + 2] = color[2]; pixels[p + 3] = 255;
    }
  }
  const read = omrSandbox.readAnswerBubbles(pixels, width, height);
  for (const [question, option] of selected) {
    assert.equal(read[question].answer, template.options[option], 'Lectura incorrecta en QUIZ ' + count + ', pregunta ' + (question + 1));
    assert.equal(read[question].status, 'ok');
  }
  assert.equal(read.length, count);
}
testFullSheetRead(20, [[0, 1, [20, 75, 220]], [19, 3, [220, 35, 35]]]);
testFullSheetRead(30, [[0, 2, [20, 20, 20]], [29, 3, [20, 75, 220]]]);

const frameReads = Array.from({ length: 5 }, (_, frameIndex) =>
  Array.from({ length: 20 }, (_, questionIndex) => {
    if (questionIndex === 0) return frameIndex < 4
      ? { answer: 'B', status: 'ok', marked: ['B'], metrics: [] }
      : { answer: null, status: 'blank', marked: [], metrics: [] };
    if (questionIndex === 2) return frameIndex < 3
      ? { answer: 'A', status: 'ok', marked: ['A'], metrics: [] }
      : { answer: null, status: 'blank', marked: [], metrics: [] };
    return { answer: null, status: 'blank', marked: [], metrics: [] };
  })
);
const mergedReads = omrSandbox.mergeFrameReads(frameReads);
assert.equal(mergedReads[0].answer, 'B', 'Cuatro lecturas iguales deben alcanzar consenso');
assert.equal(mergedReads[1].confirmedBlank, true, 'Cinco tomas vacías deben confirmar una omisión');
assert.equal(mergedReads[2].status, 'uncertain', 'Una mayoría insuficiente debe quedar pendiente');
assert.equal(omrSandbox.isPendingAnswer(mergedReads[0]), false);
assert.equal(omrSandbox.isPendingAnswer(mergedReads[1]), false, 'Una omisión confirmada no debe bloquear la nota');
assert.equal(omrSandbox.isPendingAnswer(mergedReads[2]), true);


console.log('Validación QUIZ correcta: formatos 20/30, geometría OMR, claves, lectura por color, falsos positivos, consenso multiframe, omisiones confirmadas y editor/descargas.');
