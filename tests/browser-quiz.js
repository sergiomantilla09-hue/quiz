'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ acceptDownloads: true, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

  await page.addInitScript(() => {
    if (!sessionStorage.getItem('quiz-e2e-seeded')) {
      localStorage.setItem('balbinoScan.data.v1', JSON.stringify({
        assessmentName: 'Prueba automatizada',
        questionCount: 30,
        answerKeys: { 20: Array(20).fill('B'), 30: Array(30).fill('A') },
        answerKey: Array(30).fill('A'),
        sheetSettings: {
          area: 'Ciencias',
          grade: '9.º',
          evaluationType: 'custom',
          customLabel: 'Plan de apoyo'
        },
        results: []
      }));
      sessionStorage.setItem('quiz-e2e-seeded', '1');
    }
  });

  try {
    process.stdout.write('Browser: abriendo QUIZ\\n');
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-tab="key"]').click();
    assert.equal(await page.locator('#sheetArea').inputValue(), 'Ciencias');
    assert.equal(await page.locator('#sheetGrade').inputValue(), '9.º');
    assert.equal(await page.locator('#sheetName').inputValue(), 'Plan de apoyo', 'Debe migrar la denominación personalizada antigua');

    await page.locator('#sheetArea').fill('Matemáticas');
    await page.locator('#sheetGrade').fill('10-02');
    await page.locator('#sheetName').fill('Recuperación tercer periodo');
    await page.locator('#sheetPresetName').fill('Matemáticas 10-02 · Recuperación');
    await page.locator('#saveSheetPresetBtn').click();
    assert.equal(await page.locator('#sheetPresetSelect option').count(), 2, 'Debe guardar una configuración reutilizable');
    await page.locator('#sheetArea').fill('Historia');
    await page.locator('#sheetPresetSelect').selectOption('0');
    await page.locator('#loadSheetPresetBtn').click();
    assert.equal(await page.locator('#sheetArea').inputValue(), 'Matemáticas', 'Debe restaurar área desde configuración guardada');
    assert.equal(await page.locator('#sheetName').inputValue(), 'Recuperación tercer periodo');
    await page.waitForFunction(() => document.querySelector('#sheetPreviewImage')?.naturalWidth === 1199, null, { timeout: 12000 });
    assert.equal(await page.locator('#sheetPreviewImage').evaluate(img => img.naturalWidth), 1199, 'La vista previa debe usar la plantilla real');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-tab="key"]').click();
    assert.equal(await page.locator('#sheetName').inputValue(), 'Recuperación tercer periodo', 'Los campos deben persistir al recargar');
    await page.waitForFunction(() => document.querySelector('#sheetPreviewImage')?.naturalWidth === 1199, null, { timeout: 12000 });
    assert.equal(await page.locator('#sheetPreviewImage').evaluate(img => img.naturalHeight), 1700, 'La vista previa debe persistir tras recargar');

    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'quiz-browser-'));
    process.stdout.write('Browser: probando PNG 30\\n');
    const png30Download = page.waitForEvent('download', { timeout: 15000 });
    await page.locator('#downloadPngBtn').click();
    const png30 = await png30Download;
    const png30Path = path.join(temp, png30.suggestedFilename());
    await png30.saveAs(png30Path);
    const png30Bytes = fs.readFileSync(png30Path);
    assert.deepEqual([...png30Bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'PNG debe tener firma válida');
    assert.equal(png30Bytes.readUInt32BE(16), 2398, 'PNG debe exportarse al doble de ancho');
    assert.equal(png30Bytes.readUInt32BE(20), 3400, 'QUIZ 30 debe conservar la altura completa a doble resolución');

    process.stdout.write('Browser: probando JPG 30\\n');
    const jpgDownload = page.waitForEvent('download');
    await page.locator('#downloadJpgBtn').click();
    const jpg = await jpgDownload;
    const jpgPath = path.join(temp, jpg.suggestedFilename());
    await jpg.saveAs(jpgPath);
    const jpgBytes = fs.readFileSync(jpgPath);
    assert.deepEqual([...jpgBytes.subarray(0, 3)], [255, 216, 255], 'JPG debe tener firma JPEG válida');
    assert.ok(jpgBytes.length > 10000, 'JPG no debe quedar vacío');

    process.stdout.write('Browser: probando SVG 30\\n');
    const svgDownload = page.waitForEvent('download');
    await page.locator('#downloadSvgBtn').click();
    const svg = await svgDownload;
    const svgPath = path.join(temp, svg.suggestedFilename());
    await svg.saveAs(svgPath);
    const svgText = fs.readFileSync(svgPath, 'utf8');
    assert.match(svgText, /<svg[\s>]/);
    assert.ok(svgText.includes('Recuperación tercer periodo'));
    assert.ok(svgText.includes('Matemáticas · Grado 10-02'));
    assert.ok(svgText.includes('Fecha:'), 'La hoja descargada debe incluir el espacio para fecha');

    process.stdout.write('Browser: cambiando a QUIZ 20\\n');
    await page.locator('label.quiz-type-choice').first().click();
    assert.equal(await page.locator('#quizType20').isChecked(), true);
    await page.waitForFunction(() => document.querySelector('#sheetPreviewImage')?.naturalHeight === 1312, null, { timeout: 12000 });
    process.stdout.write('Browser: probando PNG 20\\n');
    const png20Download = page.waitForEvent('download');
    await page.locator('#downloadPngBtn').click();
    const png20 = await png20Download;
    const png20Path = path.join(temp, png20.suggestedFilename());
    await png20.saveAs(png20Path);
    const png20Bytes = fs.readFileSync(png20Path);
    assert.equal(png20Bytes.readUInt32BE(16), 2398);
    assert.equal(png20Bytes.readUInt32BE(20), 2624, 'QUIZ 20 debe conservar la altura completa a doble resolución');

    assert.deepEqual(errors, [], 'La interfaz no debe producir errores JavaScript');
    process.stdout.write('Prueba de navegador correcta: migración, edición, persistencia, exportación PNG/JPG/SVG y formatos 20/30.\n');
  } finally {
    await context.close();
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
