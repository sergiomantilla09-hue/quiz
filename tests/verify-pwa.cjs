'use strict';
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { createReadStream, existsSync, statSync, readFileSync } = require('node:fs');
const { resolve, sep, extname } = require('node:path');
const { chromium } = require(process.env.SIGA_PLAYWRIGHT_PATH || 'playwright');
const root = resolve(__dirname, '..');
const count = process.env.QUIZ_COUNT === '30' ? 30 : 20;
const mime = {'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile()) return response.writeHead(404).end();
  response.setHeader('content-type', mime[extname(file)] || 'application/octet-stream');
  createReadStream(file).pipe(response);
});

(async () => {
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const browser = await chromium.launch({ channel:'msedge', headless:true, args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'] });
  try {
    const origin = process.env.QUIZ_LIVE_ORIGIN || 'http://127.0.0.1:' + server.address().port;
    const context = await browser.newContext({viewport:{width:1280,height:900},permissions:['camera'],acceptDownloads:true});
    const page = await context.newPage(), errors = [], missing = [];
    page.on('pageerror', error => errors.push(error.stack || error.message));
    page.on('response', response => {if(response.status()===404)missing.push(response.url());});
    await page.goto(origin + '/index.html?v=20');
    await page.locator('#liveScanBtn').click();
    await page.locator('#scanKeysNotice').waitFor({state:'visible'});
    assert.match(await page.locator('#scanKeysNotice').textContent(),/no se sincronizan automáticamente/);
    const fileChooser=page.waitForEvent('filechooser');
    await page.locator('#scanImportKeysBtn').click();
    await fileChooser;
    await page.getByRole('link',{name:'Montar examen'}).click();
    await page.waitForURL('**/pliego/index.html?v=18');
    const bank=Array.from({length:count},(_,i)=>`${i+1}. Pregunta ficticia ${i+1}.\nA) Alfa\nB) Beta\nC) Gamma\nD) Delta`).join('\n\n');
    await page.locator('#pliegoStep2').click();
    await page.locator('#sourceText').fill(bank);
    await page.locator('#parseBtn').click();
    await page.locator('#pliegoStep4').click();
    await page.locator('#questionCount').selectOption(String(count));
    await page.locator('#versionCount').fill('5');
    await page.locator('#originalKeysBtn').click();
    for(let i=1;i<=count;i++)await page.getByRole('button',{name:`Pregunta original ${i}, opción A`}).click();
    await page.locator('#originalKeysSave').click();
    await page.locator('#generateBtn').click();
    await page.waitForFunction(() => document.getElementById('metricVersions')?.textContent === '5');
    assert.equal(await page.locator('#metricVersions').textContent(),'5');
    const pdfDownload=page.waitForEvent('download');
    await page.locator('#downloadAnswerTablesBtn').click();
    assert.match((await pdfDownload).suggestedFilename(),/QUIZ-tablas-A-B-C-D-E\.pdf/);
    await page.locator('#pliegoTransferKeys').click();
    await page.waitForURL('**/index.html?v=18#key');
    await page.waitForFunction(() => document.getElementById('quizVariantState')?.textContent.includes('Tipo A'));
    assert.equal(await page.locator('#quizType'+count).isChecked(),true);
    const active=await page.evaluate(count=>{const bundle=store.variantSets[store.activeVariantSet];return{id:bundle.id,keys:count===20?bundle.keys:bundle.keys30,mapping:bundle.mapping};},count);
    assert.ok(active.keys.A.every(Boolean));
    assert.equal(active.mapping.questionCount,count);
    for(const type of ['A','B','C','D','E'])assert.equal(active.keys[type].length,count);
    await page.locator('[data-tab="scan"]').click();
    await page.locator('#liveScanBtn').click();
    await page.waitForFunction(() => document.getElementById('liveVideo').srcObject?.getVideoTracks()[0]?.readyState === 'live');
    await page.locator('#closeLiveScannerBtn').click();
    await page.waitForFunction(() => !document.getElementById('liveVideo').srcObject);

    const png=await page.evaluate(async count=>{
      const template=await (await fetch('assets/plantilla_quiz_'+count+'.svg')).text();
      const bundle=store.variantSets[store.activeVariantSet];
      const xml=new DOMParser().parseFromString(window.SIGA_QUIZ_VARIANTS.svg(template,bundle.id,'A',{questionCount:count}),'image/svg+xml');
      const bubbles=[...xml.querySelectorAll('circle.bubble')];
      (count===20?bundle.keys:bundle.keys30).A.forEach((letter,index)=>{
        const target=bubbles[index*4+'ABCD'.indexOf(letter)];
        const mark=xml.createElementNS('http://www.w3.org/2000/svg','circle');
        mark.setAttribute('cx',target.getAttribute('cx'));mark.setAttribute('cy',target.getAttribute('cy'));
        mark.setAttribute('r','13');mark.setAttribute('fill','#080d20');xml.documentElement.append(mark);
      });
      const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(xml.documentElement));
      await image.decode();
      const canvas=document.createElement('canvas');canvas.width=1199;canvas.height=count===20?1312:1700;
      canvas.getContext('2d').drawImage(image,0,0);
      return canvas.toDataURL('image/png').split(',')[1];
    },count);
    await page.locator('#galleryInput').setInputFiles({name:'tarjeta-ficticia.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
    await page.locator('#processBtn').click();
    await page.locator('#resultPanel:not([hidden])').waitFor({timeout:30000});
    assert.match(await page.locator('#scoreValue').textContent(),/50/);
    const manualWrong=[...'ABCD'].find(letter=>letter!==active.keys.A[0]);
    await page.locator('[aria-label="Respuesta leída de la pregunta 1"]').selectOption(manualWrong);
    await page.locator('[aria-label="Respuesta leída de la pregunta 2"]').selectOption('');
    assert.match(await page.locator('#correctionSummary').textContent(),new RegExp(`${count-2} aciertos · 1 errores · 1 sin responder`));
    assert.equal(await page.locator('#correctedSheetPanel').isVisible(),true);
    assert.equal(await page.evaluate(()=>{
      const x=Math.round(TEMPLATE.bubbleXs[0]),y=Math.round(TEMPLATE.bubbleYs[0]),offset=(y*TEMPLATE.width+x)*4;
      return [...currentCorrectionCanvas.getContext('2d').getImageData(x,y,1,1).data].slice(0,3).every((value,i)=>value===currentWarpedPreview.data[offset+i]);
    }),true);
    const correctedPdf=page.waitForEvent('download');
    await page.locator('#downloadCorrectedPdfBtn').click();
    const pdfFile=await correctedPdf;
    assert.match(pdfFile.suggestedFilename(),/QUIZ-hoja-corregida/);
    assert.equal(readFileSync(await pdfFile.path()).subarray(0,4).toString(),'%PDF');
    await page.locator('[aria-label="Respuesta leída de la pregunta 1"]').selectOption(active.keys.A[0]);
    await page.locator('[aria-label="Respuesta leída de la pregunta 2"]').selectOption(active.keys.A[1]);
    const mixed=await page.evaluate(async base64=>{
      const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
      const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
      const keys=gradingKey();
      for(const index of [0,1]){
        ctx.beginPath();ctx.arc(TEMPLATE.bubbleXs['ABCD'.indexOf(keys[index])],TEMPLATE.bubbleYs[index],13,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
      }
      const wrong=[...'ABCD'].find(letter=>letter!==keys[0]);
      ctx.beginPath();ctx.arc(TEMPLATE.bubbleXs['ABCD'.indexOf(wrong)],TEMPLATE.bubbleYs[0],13,0,Math.PI*2);ctx.fillStyle='#080d20';ctx.fill();
      return {png:canvas.toDataURL('image/png').split(',')[1],wrong};
    },png);
    await page.locator('#galleryInput').setInputFiles({name:'tarjeta-con-error-y-vacio.png',mimeType:'image/png',buffer:Buffer.from(mixed.png,'base64')});
    await page.locator('#processBtn').click();
    await page.locator('#resultPanel:not([hidden])').waitFor({timeout:30000});
    assert.deepEqual(await page.evaluate(()=>currentRead.answers.slice(0,2).map(item=>item.answer)),[mixed.wrong,null]);
    assert.match(await page.locator('#correctionSummary').textContent(),new RegExp(`${count-2} aciertos · 1 errores · 1 sin responder`));
    if(process.env.QUIZ_CORRECTION_SCREENSHOT)await page.locator('#correctedSheetPanel').screenshot({path:process.env.QUIZ_CORRECTION_SCREENSHOT});
    await page.evaluate(async base64=>{
      const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
      const drawing=canvas.getContext('2d');drawing.drawImage(image,0,0);
      window.__quizTestCameraCanvas=canvas;
      window.__quizTestCameraTimer=setInterval(()=>drawing.drawImage(image,0,0),50);
      navigator.mediaDevices.getUserMedia=async()=>canvas.captureStream(20);
    },png);
    await page.locator('#liveScanBtn').click();
    try{await page.locator('#scoreDialog:not([hidden])').waitFor({timeout:20000});}
    catch(error){console.log('LIVE_DIAG',await page.evaluate(()=>({status:document.getElementById('liveStatus').textContent,lock:document.getElementById('liveLockBadge').textContent,video:[document.getElementById('liveVideo').videoWidth,document.getElementById('liveVideo').videoHeight],hidden:document.getElementById('liveScanner').hidden,message:document.getElementById('scanMessage').textContent})));throw error;}
    assert.match(await page.locator('#dialogScore').textContent(),/50/);
    assert.equal(await page.locator('#dialogCorrection').isVisible(),true);
    assert.match(await page.locator('#dialogCorrectionSummary').textContent(),new RegExp(`${count} aciertos`));
    assert.equal(await page.locator('#liveScanner').isHidden(),true);
    await page.evaluate(()=>clearInterval(window.__quizTestCameraTimer));
    assert.deepEqual(errors,[]);
    assert.deepEqual(missing,[]);

    const transferBundle=await page.evaluate(()=>store.variantSets[store.activeVariantSet]);
    const phoneContext=await browser.newContext({viewport:{width:390,height:844},permissions:['camera']});
    const phone=await phoneContext.newPage();
    await phone.goto(origin+'/index.html?v=20');
    await phone.locator('#liveScanBtn').click();
    await phone.locator('#scanKeysNotice').waitFor({state:'visible'});
    await phone.locator('#quizVariantKeysFile').setInputFiles({name:'QUIZ-claves.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'siga-quiz-variants',version:1,bundle:transferBundle}))});
    await phone.locator('#scanKeysNotice').waitFor({state:'hidden'});
    assert.equal(await phone.locator('#quizType'+count).isChecked(),true);
    await phone.locator('#liveScanBtn').click();
    await phone.waitForFunction(() => document.getElementById('liveVideo').srcObject?.getVideoTracks()[0]?.readyState === 'live');
    await phone.locator('#closeLiveScannerBtn').click();
    await phoneContext.close();

    await page.goto(origin + '/pliego/index.html?v=18');
    await page.locator('#generatedWorkspace').waitFor({state:'visible'});
    assert.equal(await page.locator('#metricVersions').textContent(),'5');
    await page.locator('#pliegoStep4').click();
    await page.locator('#originalKeysBtn').click();
    await page.getByRole('button',{name:'Pregunta original 1, opción B'}).click();
    await page.locator('#originalKeysSave').click();
    await page.locator('#pliegoTransferKeys').click();
    await page.waitForURL('**/index.html?v=18#key');
    const updated=await page.evaluate(count=>{const bundle=store.variantSets[store.activeVariantSet];return{id:bundle.id,keys:count===20?bundle.keys:bundle.keys30,mapping:bundle.mapping};},count);
    assert.equal(updated.id,active.id);
    for(const type of ['A','B','C','D','E']){
      const position=updated.mapping.types[type].findIndex(row=>row.id.startsWith('q1_'));
      assert.equal(updated.keys[type][position],'ABCD'[updated.mapping.types[type][position].options.indexOf('B')]);
    }

    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker?.controller);
    await context.setOffline(true);
    await page.setViewportSize({width:390,height:844});
    await page.goto(origin + '/pliego/index.html?v=18');
    await page.locator('#pliegoStep4').click();
    await page.locator('#originalKeysBtn').waitFor({state:'visible'});
    assert.equal(await page.locator('.pliego-step:visible').count(),4);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.goto(origin + '/index.html?v=20');
    await page.locator('#liveScanBtn').waitFor({state:'visible'});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    console.log('PASS: PWA '+count+', PLIEGO, cinco claves, cámara, calificación óptica, PDF y acceso sin conexión.');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode=1; server.close(); });
