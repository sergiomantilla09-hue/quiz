'use strict';

const STORAGE_KEY = 'balbinoScan.data.v1';
const QUESTION_COUNT = 30;
const ROWS_PER_COLUMN = 15;
const MAX_SCORE = 50;
const POINTS_PER_CORRECT = MAX_SCORE / QUESTION_COUNT;
const TEMPLATE = {
  questionCount: QUESTION_COUNT,
  rowsPerColumn: ROWS_PER_COLUMN,
  width: 1199,
  height: 1700,
  markerCenters: {
    tl: { x: 86, y: 67 },
    tr: { x: 1114, y: 65 },
    br: { x: 1114, y: 1603 },
    bl: { x: 86, y: 1603 }
  },
  bubbleXs: [256.8, 344.5, 432.2, 520.2, 785.4, 873.6, 961.8, 1050.9],
  bubbleYs: [516.8, 575.3, 633.2, 691.6, 750.4, 809.1, 867.7, 926.0, 984.7, 1043.6, 1102.1, 1160.6, 1219.1, 1277.6, 1336.1],
  options: ['A', 'B', 'C', 'D']
};
const DEFAULT_ASSESSMENT = 'Recuperación Lengua Castellana · Grado 10.º';

const $ = (id) => document.getElementById(id);
const ui = {
  tabs: [...document.querySelectorAll('.tab')],
  panels: { scan: $('scanPanel'), key: $('keyPanel'), history: $('historyPanel') },
  installBtn: $('installBtn'),
  scanAssessment: $('scanAssessment'), studentName: $('studentName'), studentCourse: $('studentCourse'), studentId: $('studentId'),
  cameraBtn: $('cameraBtn'), galleryBtn: $('galleryBtn'), cameraInput: $('cameraInput'), galleryInput: $('galleryInput'),
  imageStage: $('imageStage'), imageFileName: $('imageFileName'), photoPreview: $('photoPreview'), processBtn: $('processBtn'), removeImage: $('removeImage'),
  scanMessage: $('scanMessage'), resultPanel: $('resultPanel'), resultStudent: $('resultStudent'), resultAssessment: $('resultAssessment'), reviewBadge: $('reviewBadge'),
  scoreValue: $('scoreValue'), scoreDescriptor: $('scoreDescriptor'), correctCount: $('correctCount'), invalidCount: $('invalidCount'), answerRows: $('answerRows'), regradeBtn: $('regradeBtn'), saveResultBtn: $('saveResultBtn'), newScanBtn: $('newScanBtn'),
  keyAssessment: $('keyAssessment'), keyLeft: $('keyLeft'), keyRight: $('keyRight'), keyProgress: $('keyProgress'), saveKeyBtn: $('saveKeyBtn'),
  historyCount: $('historyCount'), historyList: $('historyList'), historyEmpty: $('historyEmpty'), exportCsvBtn: $('exportCsvBtn'), clearHistoryBtn: $('clearHistoryBtn'), toast: $('toast')
};

let store = loadStore();
let currentFile = null;
let currentRead = null;
let currentWarpedPreview = null;
let installPrompt = null;
let toastTimer = null;

function loadStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      assessmentName: typeof parsed.assessmentName === 'string' ? parsed.assessmentName : DEFAULT_ASSESSMENT,
      answerKey: Array.isArray(parsed.answerKey)
        ? [...parsed.answerKey.slice(0, QUESTION_COUNT), ...Array(Math.max(0, QUESTION_COUNT - parsed.answerKey.length)).fill('')].map(v => TEMPLATE.options.includes(v) ? v : '')
        : Array(QUESTION_COUNT).fill(''),
      results: Array.isArray(parsed.results) ? parsed.results : []
    };
  } catch {
    return { assessmentName: DEFAULT_ASSESSMENT, answerKey: Array(QUESTION_COUNT).fill(''), results: [] };
  }
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
  catch { showToast('No fue posible guardar en este dispositivo.'); }
}
function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 2600);
}
function showMessage(message, kind = 'info') {
  ui.scanMessage.textContent = message;
  ui.scanMessage.className = `message ${kind}`;
  ui.scanMessage.hidden = false;
}
function clearMessage() { ui.scanMessage.hidden = true; ui.scanMessage.textContent = ''; }

function switchTab(tab) {
  ui.tabs.forEach(button => button.classList.toggle('active', button.dataset.tab === tab));
  Object.entries(ui.panels).forEach(([name, panel]) => {
    panel.hidden = name !== tab;
    panel.classList.toggle('active-panel', name === tab);
  });
  if (tab === 'key') renderKeyEditor();
  if (tab === 'history') renderHistory();
}
ui.tabs.forEach(button => button.addEventListener('click', () => switchTab(button.dataset.tab)));

function renderKeyEditor() {
  ui.keyAssessment.value = store.assessmentName;
  ui.keyLeft.innerHTML = '';
  ui.keyRight.innerHTML = '';
  store.answerKey.forEach((answer, index) => {
    const row = document.createElement('div');
    row.className = 'key-row';
    const number = document.createElement('span');
    number.className = 'key-number';
    number.textContent = String(index + 1).padStart(2, '0');
    const options = document.createElement('div');
    options.className = 'key-options';
    TEMPLATE.options.forEach(letter => {
      const label = document.createElement('label');
      label.className = 'key-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `key-q-${index + 1}`;
      input.value = letter;
      input.checked = answer === letter;
      input.setAttribute('aria-label', `Pregunta ${index + 1}, opción ${letter}`);
      input.addEventListener('change', () => {
        store.answerKey[index] = letter;
        updateKeyProgress();
      });
      const text = document.createElement('span');
      text.textContent = letter;
      label.append(input, text);
      options.appendChild(label);
    });
    row.append(number, options);
    (index < ROWS_PER_COLUMN ? ui.keyLeft : ui.keyRight).appendChild(row);
  });
  updateKeyProgress();
}
function updateKeyProgress() {
  const completed = store.answerKey.filter(Boolean).length;
  ui.keyProgress.textContent = `${completed} de ${QUESTION_COUNT} definidas`;
  ui.keyProgress.style.color = completed === QUESTION_COUNT ? 'var(--green)' : 'var(--muted)';
}
ui.saveKeyBtn.addEventListener('click', () => {
  const title = ui.keyAssessment.value.trim() || DEFAULT_ASSESSMENT;
  store.assessmentName = title;
  persist();
  ui.scanAssessment.value = title;
  if (currentRead) renderResult();
  showToast(store.answerKey.every(Boolean) ? 'Clave guardada. Ya puedes calificar.' : 'Clave guardada parcialmente. Completa las ${QUESTION_COUNT} para calcular la nota.');
});

function resetScan() {
  currentFile = null;
  currentRead = null;
  currentWarpedPreview = null;
  ui.cameraInput.value = '';
  ui.galleryInput.value = '';
  ui.photoPreview.removeAttribute('src');
  ui.imageStage.hidden = true;
  ui.resultPanel.hidden = true;
  clearMessage();
  ui.studentName.value = '';
  ui.studentCourse.value = '';
  ui.studentId.value = '';
}
ui.cameraBtn.addEventListener('click', () => ui.cameraInput.click());
ui.galleryBtn.addEventListener('click', () => ui.galleryInput.click());
ui.cameraInput.addEventListener('change', handleFileSelect);
ui.galleryInput.addEventListener('change', handleFileSelect);
ui.removeImage.addEventListener('click', () => {
  currentFile = null;
  ui.cameraInput.value = '';
  ui.galleryInput.value = '';
  ui.imageStage.hidden = true;
  ui.resultPanel.hidden = true;
  currentRead = null;
  currentWarpedPreview = null;
  clearMessage();
});
function handleFileSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showMessage('Selecciona una fotografía en formato JPG, PNG o HEIC compatible con el navegador.', 'error');
    return;
  }
  currentFile = file;
  currentRead = null;
  ui.resultPanel.hidden = true;
  ui.imageFileName.textContent = file.name || 'Fotografía seleccionada';
  ui.photoPreview.src = URL.createObjectURL(file);
  ui.imageStage.hidden = false;
  clearMessage();
}
ui.processBtn.addEventListener('click', processCurrentImage);

async function processCurrentImage() {
  if (!currentFile) return showMessage('Primero toma una fotografía o selecciona una imagen.', 'error');
  ui.processBtn.disabled = true;
  ui.processBtn.textContent = 'Analizando tarjeta…';
  clearMessage();
  try {
    const source = await loadImageData(currentFile);
    const markers = detectMarkers(source.data, source.width, source.height);
    const warped = warpToTemplate(source.data, source.width, source.height, markers);
    currentWarpedPreview = warped;
    const answers = readAnswerBubbles(warped.data, warped.width, warped.height);
    currentRead = {
      answers,
      sourceName: currentFile.name || 'Fotografía',
      detectedAt: new Date().toISOString(),
      manuallyChanged: false
    };
    renderResult();
    showMessage('Tarjeta reconocida. Revisa las marcas señaladas antes de guardar el resultado.', 'success');
    ui.resultPanel.hidden = false;
    ui.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    console.error(error);
    showMessage(error && error.message ? error.message : 'No se pudo leer la tarjeta. Intenta con una foto más nítida y vertical.', 'error');
  } finally {
    ui.processBtn.disabled = false;
    ui.processBtn.innerHTML = `Leer las ${QUESTION_COUNT} respuestas <span>→</span>`;
  }
}

async function loadImageData(file) {
  let bitmap;
  try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch { bitmap = await createImageBitmap(file); }
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  return { width, height, data: ctx.getImageData(0, 0, width, height).data };
}

function detectMarkers(rgba, width, height) {
  const minDim = Math.min(width, height);
  if (minDim < 260) throw new Error('La fotografía tiene muy poca resolución. Acércate para que la tarjeta ocupe buena parte de la imagen.');
  const gray = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) gray[i] = Math.round(.299 * rgba[p] + .587 * rgba[p + 1] + .114 * rgba[p + 2]);

  const regions = {
    tl: { x0: 0, x1: Math.floor(width * .34), y0: 0, y1: Math.floor(height * .32), expected: [0.072, 0.051] },
    tr: { x0: Math.floor(width * .66), x1: width, y0: 0, y1: Math.floor(height * .32), expected: [0.929, 0.050] },
    bl: { x0: 0, x1: Math.floor(width * .34), y0: Math.floor(height * .68), y1: height, expected: [0.072, 0.943] },
    br: { x0: Math.floor(width * .66), x1: width, y0: Math.floor(height * .68), y1: height, expected: [0.929, 0.943] }
  };
  const found = {};
  for (const [key, region] of Object.entries(regions)) {
    const candidate = findSquareComponent(gray, width, height, region, minDim);
    if (!candidate) throw new Error(`No encuentro el marcador de la esquina ${cornerName(key)}. Asegúrate de que los cuatro cuadrados negros aparezcan completos en la foto.`);
    found[key] = candidate;
  }
  const ordered = [found.tl, found.tr, found.br, found.bl];
  const points = ordered.map(point => ({ x: point.x, y: point.y }));
  const area = polygonArea(points);
  if (area < width * height * .08) throw new Error('Los marcadores aparecen demasiado juntos. Fotografía la tarjeta completa, sin recortarla.');
  return found;
}
function cornerName(key) { return ({ tl: 'superior izquierda', tr: 'superior derecha', br: 'inferior derecha', bl: 'inferior izquierda' })[key]; }
function polygonArea(points) {
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    total += a.x * b.y - b.x * a.y;
  }
  return Math.abs(total / 2);
}
function findSquareComponent(gray, width, height, region, minDim) {
  const x0 = Math.max(0, region.x0), y0 = Math.max(0, region.y0);
  const rw = Math.max(1, region.x1 - x0), rh = Math.max(1, region.y1 - y0);
  const visited = new Uint8Array(rw * rh);
  const queue = new Int32Array(rw * rh);
  const minSide = Math.max(14, minDim * .02);
  const maxSide = minDim * .15;
  const minPixels = Math.max(60, width * height * .00012);
  let best = null, bestScore = -Infinity;
  for (let localY = 0; localY < rh; localY++) {
    const absoluteY = y0 + localY;
    for (let localX = 0; localX < rw; localX++) {
      const start = localY * rw + localX;
      if (visited[start]) continue;
      const absoluteX = x0 + localX;
      if (gray[absoluteY * width + absoluteX] >= 132) { visited[start] = 1; continue; }
      let head = 0, tail = 0;
      queue[tail++] = start;
      visited[start] = 1;
      let minX = localX, maxX = localX, minY = localY, maxY = localY, sumX = 0, sumY = 0;
      while (head < tail) {
        const idx = queue[head++];
        const cx = idx % rw, cy = Math.floor(idx / rw);
        const ax = x0 + cx, ay = y0 + cy;
        sumX += ax; sumY += ay;
        if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = cy + dy; if (ny < 0 || ny >= rh) continue;
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = cx + dx; if (nx < 0 || nx >= rw) continue;
            const ni = ny * rw + nx;
            if (visited[ni]) continue;
            visited[ni] = 1;
            if (gray[(y0 + ny) * width + (x0 + nx)] < 132) queue[tail++] = ni;
          }
        }
      }
      const bw = maxX - minX + 1, bh = maxY - minY + 1;
      if (tail < minPixels || bw < minSide || bh < minSide || bw > maxSide || bh > maxSide) continue;
      const ratio = bw / bh;
      if (ratio < .65 || ratio > 1.45) continue;
      const fill = tail / (bw * bh);
      if (fill < .24 || fill > .72) continue;
      const x = sumX / tail, y = sumY / tail;
      const dx = x / width - region.expected[0], dy = y / height - region.expected[1];
      const distance = Math.hypot(dx, dy);
      const score = tail * (1.25 - Math.min(distance * 2.2, .9)) * (1 - Math.abs(1 - ratio));
      if (score > bestScore) {
        bestScore = score;
        best = { x, y, pixels: tail, width: bw, height: bh, fill };
      }
    }
  }
  return best;
}

function solveLinearSystem(matrix, vector) {
  const n = vector.length;
  const a = matrix.map((row, i) => [...row, vector[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (Math.abs(a[pivot][col]) < 1e-10) throw new Error('No pude corregir la perspectiva. Toma la fotografía más de frente.');
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const divisor = a[col][col];
    for (let j = col; j <= n; j++) a[col][j] /= divisor;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let j = 0; j <= n; j++) a[row][j] -= factor * a[col][j];
    }
  }
  return a.map(row => row[n]);
}
function homography(from, to) {
  const matrix = [], vector = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = from[i], { x: u, y: v } = to[i];
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); vector.push(u);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]); vector.push(v);
  }
  const h = solveLinearSystem(matrix, vector);
  return [...h, 1];
}
function warpToTemplate(sourceRGBA, sourceW, sourceH, markers) {
  const ref = TEMPLATE.markerCenters;
  const from = [ref.tl, ref.tr, ref.br, ref.bl];
  const to = [markers.tl, markers.tr, markers.br, markers.bl].map(p => ({ x: p.x, y: p.y }));
  const h = homography(from, to); // inverse map: canonical destination -> photographed source
  const W = TEMPLATE.width, H = TEMPLATE.height;
  const output = new Uint8ClampedArray(W * H * 4);
  for (let y = 0, p = 0; y < H; y++) {
    for (let x = 0; x < W; x++, p += 4) {
      const den = h[6] * x + h[7] * y + 1;
      const sx = (h[0] * x + h[1] * y + h[2]) / den;
      const sy = (h[3] * x + h[4] * y + h[5]) / den;
      const ix = Math.round(sx), iy = Math.round(sy);
      if (ix >= 0 && ix < sourceW && iy >= 0 && iy < sourceH) {
        const q = (iy * sourceW + ix) * 4;
        output[p] = sourceRGBA[q]; output[p + 1] = sourceRGBA[q + 1]; output[p + 2] = sourceRGBA[q + 2]; output[p + 3] = 255;
      } else {
        output[p] = output[p + 1] = output[p + 2] = 255; output[p + 3] = 255;
      }
    }
  }
  return { width: W, height: H, data: output };
}

function readAnswerBubbles(rgba, width, height) {
  const gray = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) gray[i] = Math.round(.299 * rgba[p] + .587 * rgba[p + 1] + .114 * rgba[p + 2]);
  const results = [];
  for (let q = 0; q < QUESTION_COUNT; q++) {
    const row = q % ROWS_PER_COLUMN;
    const xStart = q < ROWS_PER_COLUMN ? 0 : 4;
    const y = TEMPLATE.bubbleYs[row];
    const metrics = [];
    for (let opt = 0; opt < 4; opt++) {
      const x = TEMPLATE.bubbleXs[xStart + opt];
      metrics.push(measureBubble(gray, width, height, x, y));
    }
    const marked = metrics.map((metric, index) => metric.isMarked ? TEMPLATE.options[index] : null).filter(Boolean);
    const uncertain = metrics.some(metric => metric.score >= .15 && !metric.isMarked);
    let status = 'blank', answer = null;
    if (marked.length === 1) {
      answer = marked[0];
      status = metrics[TEMPLATE.options.indexOf(answer)].score < .48 ? 'low' : 'ok';
    } else if (marked.length > 1) {
      status = 'multiple';
    } else if (uncertain) {
      status = 'uncertain';
    }
    results.push({ question: q + 1, answer, marked, metrics, status, manuallyChanged: false });
  }
  return results;
}
function measureBubble(gray, width, height, centerX, centerY) {
  const x0 = Math.round(centerX), y0 = Math.round(centerY);
  let innerSum = 0, innerCount = 0, localValues = [];
  for (let dy = -10; dy <= 10; dy++) {
    const y = y0 + dy; if (y < 0 || y >= height) continue;
    for (let dx = -10; dx <= 10; dx++) {
      const d2 = dx * dx + dy * dy;
      const x = x0 + dx; if (x < 0 || x >= width) continue;
      const value = gray[y * width + x];
      if (d2 <= 81) { innerSum += value; innerCount++; }
    }
  }
  for (let dy = -26; dy <= 26; dy++) {
    const y = y0 + dy; if (y < 0 || y >= height) continue;
    for (let dx = -26; dx <= 26; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 < 441 || d2 > 625) continue;
      const x = x0 + dx; if (x < 0 || x >= width) continue;
      localValues.push(gray[y * width + x]);
    }
  }
  localValues.sort((a, b) => a - b);
  const localMedian = localValues.length ? localValues[Math.floor(localValues.length / 2)] : 245;
  const innerMean = innerSum / Math.max(1, innerCount);
  const delta = localMedian - innerMean;
  let darkCount = 0;
  for (let dy = -10; dy <= 10; dy++) {
    const y = y0 + dy; if (y < 0 || y >= height) continue;
    for (let dx = -10; dx <= 10; dx++) {
      if (dx * dx + dy * dy > 81) continue;
      const x = x0 + dx; if (x < 0 || x >= width) continue;
      if (gray[y * width + x] < localMedian - 40) darkCount++;
    }
  }
  const darkFraction = darkCount / Math.max(1, innerCount);
  const score = .55 * clamp((delta - 18) / 112, 0, 1) + .45 * clamp((darkFraction - .05) / .62, 0, 1);
  return { score, delta, darkFraction, isMarked: delta >= 36 && darkFraction >= .15 && score >= .24 };
}
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function renderResult() {
  if (!currentRead) return;
  const name = ui.studentName.value.trim() || 'Estudiante sin identificar';
  const assessment = ui.scanAssessment.value.trim() || store.assessmentName;
  ui.resultStudent.textContent = name;
  ui.resultAssessment.textContent = `${assessment}${ui.studentCourse.value.trim() ? ` · ${ui.studentCourse.value.trim()}` : ''}`;
  ui.answerRows.innerHTML = '';
  currentRead.answers.forEach((item, index) => {
    const row = document.createElement('tr');
    const number = document.createElement('td'); number.textContent = String(index + 1).padStart(2, '0');
    const answerCell = document.createElement('td');
    const select = document.createElement('select');
    select.className = 'answer-select';
    select.setAttribute('aria-label', `Respuesta leída de la pregunta ${index + 1}`);
    const empty = document.createElement('option'); empty.value = ''; empty.textContent = '—'; select.appendChild(empty);
    TEMPLATE.options.forEach(letter => { const option = document.createElement('option'); option.value = letter; option.textContent = letter; select.appendChild(option); });
    select.value = item.answer || '';
    select.addEventListener('change', () => {
      item.answer = select.value || null;
      item.manuallyChanged = true;
      item.status = 'manual';
      currentRead.manuallyChanged = true;
      renderResult();
    });
    answerCell.appendChild(select);
    const keyCell = document.createElement('td'); keyCell.textContent = store.answerKey[index] || '—';
    const statusCell = document.createElement('td');
    const status = statusFor(item, index);
    statusCell.innerHTML = `<span class="answer-state ${status.className}">${status.text}</span>`;
    row.append(number, answerCell, keyCell, statusCell);
    ui.answerRows.appendChild(row);
  });
  updateScoreDisplay();
}
function statusFor(item, index) {
  const key = store.answerKey[index];
  if (!key) return { text: 'Sin clave', className: 'warn' };
  if (item.status === 'multiple') return { text: 'Doble marca', className: 'warn' };
  if (item.status === 'uncertain' || item.status === 'low') return { text: 'Revisar', className: 'warn' };
  if (!item.answer) return { text: 'Sin respuesta', className: 'bad' };
  if (item.manuallyChanged) return { text: item.answer === key ? 'Ajustada ✓' : 'Ajustada', className: item.answer === key ? 'ok' : 'bad' };
  return item.answer === key ? { text: 'Correcta', className: 'ok' } : { text: 'Incorrecta', className: 'bad' };
}
function updateScoreDisplay() {
  const keyReady = store.answerKey.every(Boolean);
  const answers = currentRead.answers;
  const correct = keyReady ? answers.filter((item, index) => item.answer && item.answer === store.answerKey[index]).length : 0;
  const pending = answers.filter((item, index) => !item.answer || item.status === 'multiple' || item.status === 'uncertain' || item.status === 'low').length;
  const grade = correct * POINTS_PER_CORRECT;
  ui.scoreValue.textContent = keyReady ? grade.toFixed(1) : '—';
  ui.scoreDescriptor.textContent = keyReady ? `${correct} de ${QUESTION_COUNT} respuestas correctas` : 'Configura la clave para obtener la nota';
  ui.correctCount.textContent = `${correct} correctas`;
  ui.invalidCount.textContent = `${pending} por revisar`;
  ui.scoreValue.parentElement.parentElement.style.setProperty('--score-angle', `${keyReady ? (grade / 50) * 360 : 0}deg`);
  const needsReview = pending > 0 || !keyReady;
  ui.reviewBadge.textContent = !keyReady ? 'Falta la clave' : needsReview ? 'Requiere revisión' : 'Lectura completa';
  ui.reviewBadge.className = `review-badge${needsReview ? ' warn' : ''}`;
  ui.saveResultBtn.disabled = !keyReady;
  ui.saveResultBtn.textContent = keyReady ? 'Guardar resultado' : 'Configura la clave primero';
}
ui.regradeBtn.addEventListener('click', () => { renderResult(); showToast('Nota actualizada.'); });
ui.studentName.addEventListener('input', () => { if (currentRead) ui.resultStudent.textContent = ui.studentName.value.trim() || 'Estudiante sin identificar'; });
ui.scanAssessment.addEventListener('input', () => { if (currentRead) ui.resultAssessment.textContent = ui.scanAssessment.value.trim() || store.assessmentName; });
function saveCurrentResult({ askForPending = true, silent = false } = {}) {
  if (!currentRead || !store.answerKey.every(Boolean)) return null;
  const student = ui.studentName.value.trim() || 'Sin identificar';
  const correct = currentRead.answers.filter((item, index) => item.answer && item.answer === store.answerKey[index]).length;
  const pending = currentRead.answers.filter(item => !item.answer || ['multiple', 'uncertain', 'low'].includes(item.status)).length;
  if (pending > 0 && askForPending && !confirm(`Hay ${pending} pregunta(s) sin respuesta o con lectura dudosa. Se contarán como incorrectas si guardas ahora. ¿Deseas guardar la nota?`)) return null;
  const record = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    student,
    course: ui.studentCourse.value.trim(),
    studentId: ui.studentId.value.trim(),
    assessment: ui.scanAssessment.value.trim() || store.assessmentName,
    date: new Date().toISOString(),
    correct,
    score: Number((correct * POINTS_PER_CORRECT).toFixed(1)),
    questionCount: QUESTION_COUNT,
    answers: currentRead.answers.map(item => item.answer || ''),
    key: [...store.answerKey],
    source: currentRead.sourceName,
    needsReview: pending > 0,
    pendingCount: pending
  };
  store.results.unshift(record);
  persist();
  renderHistory();
  if (!silent) showToast(`Resultado guardado: ${record.score.toFixed(1)} / 50`);
  return record;
}
ui.saveResultBtn.addEventListener('click', () => saveCurrentResult({ askForPending: true }));
ui.newScanBtn.addEventListener('click', () => {
  resetScan();
  ui.scanAssessment.value = store.assessmentName;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

function renderHistory() {
  ui.historyList.innerHTML = '';
  ui.historyCount.textContent = `${store.results.length} REGISTROS`;
  ui.historyEmpty.hidden = store.results.length > 0;
  ui.clearHistoryBtn.hidden = store.results.length === 0;
  store.results.forEach(record => {
    const item = document.createElement('div'); item.className = 'history-item';
    const score = document.createElement('div'); score.className = 'history-score'; score.textContent = `${Number(record.score).toFixed(1)}`;
    const info = document.createElement('div'); info.className = 'history-info';
    const title = document.createElement('strong'); title.textContent = record.student;
    const detail = document.createElement('small'); detail.textContent = `${record.assessment} · ${record.course || 'Sin curso'} · ${formatDate(record.date)}`;
    info.append(title, detail);
    const exportOne = document.createElement('button'); exportOne.textContent = 'CSV'; exportOne.setAttribute('aria-label', `Exportar ${record.student}`);
    exportOne.addEventListener('click', () => exportCsv([record], `resultado_${safeFilename(record.student)}.csv`));
    item.append(score, info, exportOne); ui.historyList.appendChild(item);
  });
}
function formatDate(iso) {
  try { return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)); }
  catch { return iso; }
}
function safeFilename(value) { return String(value || 'estudiante').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 40); }
ui.exportCsvBtn.addEventListener('click', () => {
  if (!store.results.length) return showToast('Todavía no hay resultados para exportar.');
  exportCsv(store.results, 'resultados_balbino_scan.csv');
});
function exportCsv(records, filename) {
  const headers = ['Estudiante', 'Curso', 'Identificación', 'Evaluación', 'Fecha', 'Correctas', 'Nota sobre 50', ...Array.from({ length: QUESTION_COUNT }, (_, i) => `P${i + 1}`)];
  const rows = records.map(record => [record.student, record.course, record.studentId, record.assessment, formatDate(record.date), record.correct, Number(record.score).toFixed(1), ...Array.from({ length: QUESTION_COUNT }, (_, i) => (record.answers || [])[i] || '')]);
  const csv = '\ufeff' + [headers, ...rows].map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
  showToast('Archivo CSV preparado.');
}
ui.clearHistoryBtn.addEventListener('click', () => {
  if (!confirm('¿Eliminar todos los resultados guardados en este dispositivo? Esta acción no se puede deshacer.')) return;
  store.results = []; persist(); renderHistory(); showToast('Historial eliminado.');
});

// Initialize application state and controls.
ui.scanAssessment.value = store.assessmentName;
renderKeyEditor();
renderHistory();

// Installable PWA support.
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); installPrompt = event; ui.installBtn.hidden = false;
});
ui.installBtn.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null; ui.installBtn.hidden = true;
});
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(error => console.warn('No se pudo registrar el service worker:', error)));
}

 
// Live guided scanner: detect the four fiducials, capture automatically and show a score dialog.
ui.liveScanBtn = $('liveScanBtn');
ui.liveScanner = $('liveScanner');
ui.closeLiveScannerBtn = $('closeLiveScannerBtn');
ui.liveVideo = $('liveVideo');
ui.liveViewfinder = $('liveViewfinder');
ui.liveLockBadge = $('liveLockBadge');
ui.liveStatus = $('liveStatus');
ui.scoreDialog = $('scoreDialog');
ui.dialogStudent = $('dialogStudent');
ui.dialogScore = $('dialogScore');
ui.dialogCorrect = $('dialogCorrect');
ui.dialogNote = $('dialogNote');
ui.dialogOkBtn = $('dialogOkBtn');

let liveStream = null;
let liveFrameRequest = 0;
let liveLastDetection = 0;
let liveStableFrames = 0;
let liveMarkersReady = false;
let liveCaptureTriggered = false;
let liveBusy = false;
let livePreviewCanvas = null;

function setLiveStatus(message, state = '') {
  if (!ui.liveStatus) return;
  ui.liveStatus.textContent = message;
  ui.liveStatus.className = 'live-status' + (state ? ' ' + state : '');
}
function stopLiveScanner(hide = true) {
  if (liveFrameRequest) cancelAnimationFrame(liveFrameRequest);
  liveFrameRequest = 0;
  liveBusy = false;
  if (liveStream) liveStream.getTracks().forEach(track => track.stop());
  liveStream = null;
  if (ui.liveVideo) {
    ui.liveVideo.pause();
    ui.liveVideo.srcObject = null;
  }
  liveMarkersReady = false;
  liveCaptureTriggered = false;
  liveStableFrames = 0;
  if (ui.liveViewfinder) ui.liveViewfinder.classList.remove('locked');
  if (ui.liveLockBadge) ui.liveLockBadge.textContent = 'Buscando los 4 marcadores';
  if (ui.liveScanBtn) ui.liveScanBtn.disabled = false;
  if (hide && ui.liveScanner) ui.liveScanner.hidden = true;
}
ui.liveScanBtn.addEventListener('click', () => openLiveScanner());
ui.closeLiveScannerBtn.addEventListener('click', () => stopLiveScanner(true));

async function openLiveScanner() {
  clearMessage();
  if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showMessage('La cámara en vivo necesita abrir Quiz desde su dirección HTTPS y permitir el acceso a la cámara.', 'error');
    return;
  }
  if (!store.answerKey.every(Boolean)) {
    showMessage('Antes de escanear, configura las ${QUESTION_COUNT} respuestas correctas en la sección Clave.', 'error');
    switchTab('key');
    return;
  }
  stopLiveScanner(false);
  ui.liveScanner.hidden = false;
  ui.liveScanBtn.disabled = true;
  setLiveStatus('Alinea los cuatro cuadrados negros con las guías.');
  try {
    liveStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1600 },
        height: { ideal: 1800 },
        aspectRatio: { ideal: TEMPLATE.width / TEMPLATE.height }
      }
    });
    ui.liveVideo.srcObject = liveStream;
    await new Promise((resolve, reject) => {
      if (ui.liveVideo.readyState >= 1) return resolve();
      ui.liveVideo.onloadedmetadata = resolve;
      ui.liveVideo.onerror = () => reject(new Error('No se pudo iniciar la vista de cámara.'));
    });
    await ui.liveVideo.play();
    // Move the live camera to the top of the phone viewport so it becomes the main focus.
    requestAnimationFrame(() => ui.liveScanner.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    livePreviewCanvas = document.createElement('canvas');
    livePreviewCanvas.width = 720;
    livePreviewCanvas.height = Math.round(720 * TEMPLATE.height / TEMPLATE.width);
    liveLastDetection = 0;
    liveStableFrames = 0;
    liveMarkersReady = false;
    liveCaptureTriggered = false;
    liveFrameRequest = requestAnimationFrame(liveDetectionLoop);
  } catch (error) {
    console.error('Quiz camera:', error);
    stopLiveScanner(true);
    let message = 'No se pudo abrir la cámara. Revisa los permisos del navegador.';
    if (error && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')) {
      message = 'El navegador no tiene permiso para usar la cámara. Autoriza el acceso y vuelve a intentarlo.';
    } else if (error && error.name === 'NotFoundError') {
      message = 'No se encontró una cámara disponible en este dispositivo.';
    } else if (error && error.name === 'NotReadableError') {
      message = 'La cámara está siendo utilizada por otra aplicación. Ciérrala y vuelve a intentar.';
    }
    showMessage(message, 'error');
  }
}

function drawVideoCoverToCanvas(video, canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const targetW = canvas.width, targetH = canvas.height;
  const sourceW = video.videoWidth, sourceH = video.videoHeight;
  if (!sourceW || !sourceH) throw new Error('La cámara todavía no está lista.');
  const targetRatio = targetW / targetH;
  const sourceRatio = sourceW / sourceH;
  let sx = 0, sy = 0, sw = sourceW, sh = sourceH;
  if (sourceRatio > targetRatio) {
    sw = sourceH * targetRatio;
    sx = (sourceW - sw) / 2;
  } else {
    sh = sourceW / targetRatio;
    sy = (sourceH - sh) / 2;
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);
  return ctx;
}

function liveDetectionLoop(timestamp) {
  if (!liveStream || ui.liveScanner.hidden) return;
  liveFrameRequest = requestAnimationFrame(liveDetectionLoop);
  if (liveBusy || timestamp - liveLastDetection < 220 || ui.liveVideo.readyState < 2) return;

  // Student names are optional; scan continuously after each acknowledged result.
  ui.liveViewfinder.classList.remove('waiting-name');

  liveBusy = true;
  liveLastDetection = timestamp;
  try {
    const ctx = drawVideoCoverToCanvas(ui.liveVideo, livePreviewCanvas);
    const frame = ctx.getImageData(0, 0, livePreviewCanvas.width, livePreviewCanvas.height);
    detectMarkers(frame.data, frame.width, frame.height);
    liveStableFrames += 1;
    if (liveStableFrames >= 3 && !liveCaptureTriggered) {
      liveMarkersReady = true;
      liveCaptureTriggered = true;
      ui.liveViewfinder.classList.add('locked');
      ui.liveLockBadge.textContent = '4 / 4 MARCADORES RECONOCIDOS';
      setLiveStatus('¡Tarjeta reconocida! Capturando automáticamente…', 'ready');
      // Small pause lets the visual lock become visible before taking the still frame.
      setTimeout(() => captureAndGradeLive(), 260);
    } else if (!liveCaptureTriggered) {
      ui.liveViewfinder.classList.remove('locked');
      ui.liveLockBadge.textContent = 'Detectando…';
      setLiveStatus('Reconociendo los cuatro puntos… ' + liveStableFrames + '/3');
    }
  } catch (error) {
    liveStableFrames = 0;
    liveMarkersReady = false;
    liveCaptureTriggered = false;
    ui.liveViewfinder.classList.remove('locked');
    ui.liveLockBadge.textContent = 'Buscando los 4 marcadores';
    setLiveStatus('Alinea la tarjeta completa. Los cuatro cuadrados deben verse dentro de la guía.');
  } finally {
    liveBusy = false;
  }
}

function showScoreDialog(record) {
  ui.dialogStudent.textContent = record.student + (record.course ? ' · ' + record.course : '');
  ui.dialogScore.textContent = Number(record.score).toFixed(1);
  ui.dialogCorrect.textContent = record.correct + ' de ' + QUESTION_COUNT + ' respuestas correctas';
  ui.dialogNote.textContent = record.needsReview
    ? record.pendingCount + ' pregunta(s) vacía(s) o dudosa(s) se contaron como incorrectas. El resultado quedó guardado.'
    : 'Resultado guardado automáticamente en el historial.';
  ui.scoreDialog.hidden = false;
  ui.dialogOkBtn.focus();
}

async function captureAndGradeLive() {
  if (!liveMarkersReady || !liveStream || !ui.liveVideo.videoWidth || !liveCaptureTriggered) return;
  setLiveStatus(`Capturando y leyendo las ${QUESTION_COUNT} respuestas…`);
  try {
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = TEMPLATE.width;
    captureCanvas.height = TEMPLATE.height;
    const captureContext = drawVideoCoverToCanvas(ui.liveVideo, captureCanvas);
    const sourceImage = captureContext.getImageData(0, 0, captureCanvas.width, captureCanvas.height);
    // Re-detect on the full-resolution still frame; never rely only on the live preview lock.
    const markers = detectMarkers(sourceImage.data, sourceImage.width, sourceImage.height);
    const warped = warpToTemplate(sourceImage.data, sourceImage.width, sourceImage.height, markers);
    const answers = readAnswerBubbles(warped.data, warped.width, warped.height);
    currentFile = null;
    currentRead = {
      answers,
      sourceName: 'Cámara en vivo',
      detectedAt: new Date().toISOString(),
      manuallyChanged: false
    };
    ui.imageFileName.textContent = 'Captura realizada desde la cámara guiada';
    ui.photoPreview.src = captureCanvas.toDataURL('image/jpeg', .9);
    ui.imageStage.hidden = false;
    renderResult();
    const record = saveCurrentResult({ askForPending: false, silent: true });
    if (!record) throw new Error('No pude guardar el resultado. Intenta capturar la tarjeta nuevamente.');
    stopLiveScanner(true);
    ui.resultPanel.hidden = true;
    showScoreDialog(record);
  } catch (error) {
    console.error('Quiz live capture:', error);
    liveMarkersReady = false;
    liveCaptureTriggered = false;
    liveStableFrames = 0;
    setLiveStatus(error && error.message ? error.message : 'No se pudo leer la tarjeta. Alinea de nuevo los cuatro marcadores.', 'error');
    if (liveStream && !liveFrameRequest) liveFrameRequest = requestAnimationFrame(liveDetectionLoop);
  }
}

ui.dialogOkBtn.addEventListener('click', async () => {
  ui.scoreDialog.hidden = true;
  currentRead = null;
  currentFile = null;
  currentWarpedPreview = null;
  ui.resultPanel.hidden = true;
  ui.imageStage.hidden = true;
  ui.photoPreview.removeAttribute('src');
  ui.cameraInput.value = '';
  ui.galleryInput.value = '';
  ui.studentName.value = '';
  ui.studentId.value = '';
  clearMessage();
  // Reopen immediately; the next card can be scanned with or without a student name.
  await openLiveScanner();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && liveStream) stopLiveScanner(true);
});
