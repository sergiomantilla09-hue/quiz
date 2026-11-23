(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = 'quiz.pliego.project.v1';
  const GENERATED_KEY = STORAGE_KEY + '.generated';
  const DEFAULT_QUESTION_COUNT = 20;
  function questionCount(){return Number($('questionCount')?.value||DEFAULT_QUESTION_COUNT);}
  const LETTER_WIDTH_IN = 8.5;
  const LETTER_HEIGHT_IN = 11;
  const state = { questions:[], versions:[], selectedVersion:0, logoData:'', parsed:false, generated:false, parsedWarnings:[], printMode:'all' };
  let generationRevision=0;
  let originalKeysDraft=null;
  const headerFields = ['institution','subject','grade','assessment','period','teacher','date','headerGroup','instructions'];
  const random = (arr) => { const a = arr.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cleanText = (s) => String(s ?? '').replace(/\r/g,'').replace(/[\t ]+$/gm,'').trim();
  const formatText = (s) => escapeHtml(s).replace(/[\t ]*\n[\t ]*/g,' ');
  function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove('show'),2800);}
  function getHeader(){const o={};headerFields.forEach(id=>o[id]=$(id).value.trim());return o;}
  function setHeader(h={}){headerFields.forEach(id=>{if(h[id]!==undefined)$(id).value=h[id];});}
  function projectSnapshot(){return{header:getHeader(),source:$('sourceText').value,questions:state.questions,preamble:state.preamble||[],versionCount:$('versionCount').value,questionCount:$('questionCount').value,columns:$('columns').value,fontMode:$('fontMode').value,optionLayout:$('optionLayout').value,shuffleQuestions:$('shuffleQuestions').checked,shuffleOptions:$('shuffleOptions').checked,includeQuiz:$('includeQuiz').checked,logoData:state.logoData};}
  function showSavedTime(value){if(Number.isFinite(value))$('lastSaved').textContent=`Último guardado: ${new Date(value).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}`;}
  function saveDraft(){try{const draft={...projectSnapshot(),savedAt:Date.now()};localStorage.setItem(STORAGE_KEY,JSON.stringify(draft));showSavedTime(draft.savedAt);}catch(e){/* local storage can be full; the app remains usable */}}
  function generationSignature(){return JSON.stringify({source:$('sourceText').value,header:getHeader(),logo:[state.logoData.length,state.logoData.slice(0,64),state.logoData.slice(-64)],settings:['versionCount','questionCount','columns','fontMode','optionLayout'].map(id=>$(id).value),toggles:['shuffleQuestions','shuffleOptions','includeQuiz'].map(id=>$(id).checked)});}
  function saveGeneratedState(){
    if(!state.generated)return;
    const versions=state.versions.map(({label,index,groups,questions,openQuestions,bankCount,selectedCount})=>({label,index,groups,questions,openQuestions,bankCount,selectedCount}));
    try{localStorage.setItem(GENERATED_KEY,JSON.stringify({signature:generationSignature(),id:state.variantSetId,versions}));}
    catch(error){toast('No se pudo conservar la composición en este navegador. Guarda el proyecto antes de salir.');}
  }
  function applyProject(d){
    setHeader(d.header||{});$('sourceText').value=d.source||'';$('versionCount').value=d.versionCount||5;$('questionCount').value=d.questionCount||20;$('columns').value=d.columns||2;$('fontMode').value=d.fontMode||'auto';$('optionLayout').value=d.optionLayout||'list';$('shuffleQuestions').checked=d.shuffleQuestions!==false;$('shuffleOptions').checked=d.shuffleOptions!==false;$('includeQuiz').checked=d.includeQuiz!==false;
    state.logoData=d.logoData||'';$('logoFile').value='';showLogo(state.logoData||window.SIGA_PLIEGO_DOCUMENTS.defaultLogo);
    state.questions=Array.isArray(d.questions)?d.questions:[];state.preamble=Array.isArray(d.preamble)?d.preamble:[];state.parsed=state.questions.length>0;state.parsedWarnings=[];setWarnings([]);const repaired=repairLegacyOpenPassages(d.source||'');renderReview();invalidateGenerated(false);updateButtons();countSource();return repaired;
  }
  function restoreDraft(){try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return;const draft=JSON.parse(raw);if(applyProject(draft))saveDraft();else showSavedTime(draft.savedAt);}catch(e){}}
  function repairLegacyOpenPassages(source){
    if(!source||state.questions.length<2)return false;
    const parsed=parseMaterial(source).questions;if(parsed.length!==state.questions.length)return false;
    let repaired=false;
    for(let i=0;i<parsed.length-1;i++){
      const previous=state.questions[i],next=state.questions[i+1],correct=parsed[i];
      if(!previous.isOpen||!next.isOpen||!correct.stem.startsWith(previous.stem+'\n'))continue;
      const moved=correct.stem.slice(previous.stem.length+1).trim();
      if(!moved||next.context?.trim()!==moved)continue;
      previous.stem=correct.stem;previous.hasOwnPassage=true;next.context='';repaired=true;
    }
    return repaired;
  }
  function validProject(d){
    return d&&typeof d==='object'&&!Array.isArray(d)&&d.header&&typeof d.header==='object'&&headerFields.every(id=>typeof d.header[id]==='string')&&typeof d.source==='string'&&d.source.length<=2000000&&Array.isArray(d.questions)&&d.questions.length<=1000&&d.questions.every(q=>q&&typeof q.stem==='string'&&Array.isArray(q.options)&&q.options.length<=4&&q.options.every(o=>o&&'ABCD'.includes(o.uid)&&typeof o.text==='string'))&&Array.isArray(d.preamble)&&d.preamble.every(p=>typeof p==='string')&&(!d.logoData||typeof d.logoData==='string'&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(d.logoData))&&['20','30'].includes(String(d.questionCount))&&['1','2'].includes(String(d.columns))&&['compact','auto','normal','large'].includes(String(d.fontMode))&&['list','2x2'].includes(String(d.optionLayout))&&Number.isInteger(Number(d.versionCount))&&Number(d.versionCount)>=1&&Number(d.versionCount)<=(Number(d.questionCount)===20?5:20)&&['shuffleQuestions','shuffleOptions','includeQuiz'].every(key=>typeof d[key]==='boolean');
  }
  function saveProjectFile(){
    const payload=JSON.stringify({format:'siga-pliego-project',version:1,project:projectSnapshot()});
    const blob=new Blob([payload],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    const name=getHeader().assessment.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,60)||'examen';
    link.href=url;link.download=`PLIEGO-${name}.pliego.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);toast('Proyecto descargado.');
  }
  async function importProjectFile(file){
    if(!file)return;
    if(file.size>10*1024*1024){toast('El archivo del proyecto supera 10 MB.');return;}
    try{
      const envelope=JSON.parse(await file.text());
      if(envelope?.format!=='siga-pliego-project'||envelope.version!==1||!validProject(envelope.project))throw Error('Formato de proyecto no válido.');
      const load=()=>{applyProject(envelope.project);saveDraft();toast('Proyecto importado.');};
      if($('sourceText').value.trim()||state.questions.length)showConfirm('Importar proyecto','El archivo reemplazará el proyecto abierto. Guarda una copia antes de continuar si deseas conservarlo.',load);
      else load();
    }catch(e){toast('No se pudo importar: '+e.message);}
  }
  function showLogo(data){const wrap=$('logoPreviewWrap');wrap.innerHTML=data?`<img class="logo-preview" alt="Logo" src="${data}">`:'<div class="logo-placeholder">＋</div>';}
  function countSource(){const v=$('sourceText').value;$('sourceCount').textContent=`${v.length.toLocaleString('es-CO')} caracteres`+(v.trim()?` · ${v.split(/\n\s*\n/).filter(Boolean).length} bloques aprox.`:'');}
  function parseQuestionStart(line){const m=line.match(/^\s*(?:PREGUNTA\s*)?(\d{1,3})\s*[.)\]:-]\s*(\S.*)$/i);return m?{number:Number(m[1]),text:m[2]}:null;}
  function parseOption(line){const m=line.match(/^\s*(?:\(([A-D])\)|\[([A-D])\]|([A-D])[).:\-])\s*(\S.*)$/i);if(!m)return null;return{letter:(m[1]||m[2]||m[3]).toUpperCase(),text:m[4]};}
  function isPassageHeading(line){return /^(?:LECTURA(?:\s*(?:BASE|COMPRENSIVA|\d+|N[º°]\s*\d+))?|TEXTO(?:\s*(?:BASE|\d+|N[º°]\s*\d+))?|FRAGMENTO|CONTEXTO|LEE\s+(?:EL|LA|LOS|LAS|EL\s+SIGUIENTE)|OBSERVA|ANALIZA\s+(?:EL|LA|LOS|LAS)|CASO\s+(?:CL[IÍ]NICO|BASE|\d+)|SITUACI[ÓO]N\s+(?:BASE|PROBLEMA)|GR[AÁ]FICA|TABLA|IMAGEN)\b/i.test(line.trim());}
  function readKeyLine(line){const m=line.match(/^\s*(?:CLAVE(?:\s+DE\s+RESPUESTA)?|RESPUESTA(?:\s+CORRECTA)?|CORRECTA|SOLUCI[ÓO]N)\s*[:=\-]\s*([A-D])\b\s*$/i);return m?m[1].toUpperCase():null;}
  function cleanMarkedOption(text){let t=text;let marked=false;const patterns=[/\s*\[(?:CORRECTA|RESPUESTA)\]\s*$/i,/\s*\((?:CORRECTA|RESPUESTA)\)\s*$/i,/\s*(?:✓|✔|✅)\s*$/u,/^\s*\*\s*/];for(const p of patterns){if(p.test(t)){marked=true;t=t.replace(p,'').trim();}}return{text:t,marked};}
  function parseMaterial(raw){
    const lines=cleanText(raw).split('\n').map(x=>x.trim()).filter(Boolean);
    const questions=[];const warnings=[];let current=null;let activeContext='';let activeGroup='';let groupCounter=0;let preFirst=[];let beforeFirst=true;let preamble=[];
    function flush(){if(current){current.stem=current.stem.trim();current.options=current.options.filter(o=>o.text.trim());current.isOpen=current.options.length===0;if(current.stem||current.options.length)questions.push(current);current=null;}}
    for(const line of lines){
      const qStart=parseQuestionStart(line);
      if(qStart){
        const ownOpenPassage=current&&current.options.length===0&&current.hasOwnPassage;
        flush();
        if(ownOpenPassage){activeContext='';activeGroup='';}
        let contextForQuestion=activeContext;
        if(beforeFirst){
          const pre=preFirst.join('\n');
          const combined=[activeContext,pre].filter(Boolean).join('\n');
          const looksLikeReading=!!activeGroup||pre.length>135||/lee el siguiente|responde las preguntas|lectura|texto base|fragmento/i.test(pre);
          if(looksLikeReading)contextForQuestion=combined;
          else if(pre) preamble.push(pre);
          preFirst=[];
        }
        beforeFirst=false;if(!activeGroup)activeGroup=`g${++groupCounter}`;
        current={id:`q${questions.length+1}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,sourceNumber:Number(qStart.number),stem:qStart.text,options:[],context:contextForQuestion,groupId:activeGroup};continue;
      }
      if(isPassageHeading(line)){
        if(current&&current.options.length===0){current.stem+='\n'+line;current.hasOwnPassage=true;continue;}
        flush();activeContext=line;activeGroup=`g${++groupCounter}`;continue;
      }
      const option=parseOption(line);
      if(option){
        if(!current){warnings.push(`Se encontró la opción ${option.letter} sin una pregunta anterior.`);continue;}
        const marked=cleanMarkedOption(option.text);current.options.push({uid:option.letter,text:marked.text});continue;
      }
      const key=readKeyLine(line);
      if(key&&current){continue;}
      if(current){
        if(current.options.length){
          const lastOption=current.options[current.options.length-1];
          lastOption.text+=(lastOption.text?' ':'')+line;
        }else current.stem+=(current.stem?'\n':'')+line;
      }else if(beforeFirst){preFirst.push(line);}
      else{
        activeContext+=(activeContext?'\n':'')+line;
        if(!activeGroup)activeGroup=`g${++groupCounter}`;
      }
    }
    flush();
    if(beforeFirst&&preFirst.length)preamble.push(preFirst.join('\n'));
    questions.forEach((q,i)=>{
      q.sourceNumber=q.sourceNumber||i+1;
      const order=['A','B','C','D'];q.options.sort((a,b)=>order.indexOf(a.uid)-order.indexOf(b.uid));
      if(q.isOpen)return;
      if(new Set(q.options.map(o=>o.uid)).size!==q.options.length)warnings.push(`La pregunta ${q.sourceNumber} tiene letras de opción repetidas.`);
      if(q.options.length!==4)warnings.push(`La pregunta ${q.sourceNumber} tiene ${q.options.length} opciones; se esperaban cuatro (A–D).`);
    });
    if(!questions.length)warnings.push('No se identificaron preguntas numeradas. Comprueba que cada enunciado comience con 1., 2., 3., etc.');
    return{questions,preamble,warnings};
  }
  function renderReview(){
    const list=$('reviewList');list.innerHTML='';
    state.questions.forEach((q,i)=>{
      const card=document.createElement('div');card.className='q-review';
      const letters=['A','B','C','D'];
      const optionsHtml=letters.map((l,j)=>{const o=q.options.find(x=>x.uid===l);return`<div class="option-edit"><b>${l}.</b><input data-q="${i}" data-option="${j}" value="${escapeHtml(o?.text||'')}" placeholder="Opción ${l}"></div>`;}).join('');
      const open=q.isOpen||q.options.length===0;
      card.innerHTML=`<div class="q-review-top"><span class="q-number">PREGUNTA ${String(i+1).padStart(2,'0')} · BASE ${q.sourceNumber}</span><span class="small">${open?'Respuesta abierta':q.context?'Lectura compartida':'Pregunta independiente'}</span></div><textarea data-q="${i}" data-stem="1" aria-label="Enunciado">${escapeHtml(q.stem)}</textarea>${open?'':`<div class="options-edit">${optionsHtml}</div><label class="pliego-key-select">Clave original <select data-q="${i}" data-correct="1" aria-label="Respuesta correcta de la pregunta ${i+1}"><option value="">Por definir</option>${letters.map(l=>`<option value="${l}" ${q.correct===l?'selected':''}>${l}</option>`).join('')}</select></label>`}`;
      list.appendChild(card);
    });
    list.querySelectorAll('textarea[data-stem]').forEach(el=>el.addEventListener('input',()=>{state.questions[+el.dataset.q].stem=el.value;invalidateGenerated();saveDraft();}));
    list.querySelectorAll('select[data-correct]').forEach(el=>el.addEventListener('change',()=>{setOriginalAnswer(state.questions[+el.dataset.q],el.value);updateOriginalKeyProgress();saveDraft();saveGeneratedState();}));
    list.querySelectorAll('input[data-option]').forEach(el=>el.addEventListener('input',()=>{const q=state.questions[+el.dataset.q],uid=['A','B','C','D'][+el.dataset.option];let option=q.options.find(o=>o.uid===uid);if(!option){option={uid,text:''};q.options.push(option);}option.text=el.value;q.options.sort((a,b)=>'ABCD'.indexOf(a.uid)-'ABCD'.indexOf(b.uid));invalidateGenerated();saveDraft();}));
    $('reviewCount').textContent=String(state.questions.length);
    updateQuizWarning();
  }
  function updateMixMetric(){const metric=$('metricShuffle');if(metric)metric.textContent=$('shuffleOptions').checked?'Activa':'No';}
  function setWarnings(warnings){const el=$('parseWarnings');if(warnings.length){el.textContent=warnings.join(' ');el.classList.remove('hidden');}else{el.classList.add('hidden');}}
  function validateBeforeGenerate(){
    const questions=state.questions,mcQuestions=multipleChoiceQuestions();
    if(!questions.length)return'Primero analiza el material base.';
    if(mcQuestions.length<questionCount())return`El banco contiene ${mcQuestions.length} preguntas A–D y ${openQuestions().length} abiertas. Se necesitan al menos ${questionCount()} de selección múltiple.`;
    if(questions.some(q=>!q.stem.trim()))return'Hay preguntas sin enunciado. Completa todos los enunciados antes de continuar.';
    if(mcQuestions.some(q=>q.options.length!==4||new Set(q.options.map(o=>o.uid)).size!==4||!['A','B','C','D'].every(l=>q.options.some(o=>o.uid===l))||q.options.some(o=>!o.text.trim())))return'Todas las preguntas de selección múltiple deben tener cuatro opciones A–D completas, sin letras repetidas.';
    const count=Number($('versionCount').value),max=questionCount()===20?5:20;if(!Number.isInteger(count)||count<1||count>max)return`La cantidad de versiones debe estar entre 1 y ${max}.`;if(count>1&&!$('shuffleQuestions').checked&&!$('shuffleOptions').checked)return'Activa al menos una mezcla para que las versiones sean realmente diferentes.';
    return'';
  }
  function multipleChoiceQuestions(){return state.questions.filter(q=>!q.isOpen&&q.options.length>0);}
  function openQuestions(){return state.questions.filter(q=>q.isOpen||q.options.length===0);}
  function setOriginalAnswer(question,answer){
    question.correct=answer;
    for(const version of state.versions){
      const selected=version.questions.find(item=>item.id===question.id);
      if(selected)selected.correct=answer;
      for(const group of version.groups){const item=group.questions.find(candidate=>candidate.id===question.id);if(item)item.correct=answer;}
    }
    const index=state.questions.indexOf(question),review=$(`reviewList`)?.querySelector(`select[data-q="${index}"][data-correct]`);
    if(review)review.value=answer;
  }
  function updateOriginalKeyProgress(){
    const questions=multipleChoiceQuestions(),defined=questions.filter(q=>['A','B','C','D'].includes(q.correct)).length;
    $('originalKeysBtn').disabled=!questions.length;$('originalKeyProgress').textContent=`${defined}/${questions.length}`;
  }
  function updateOriginalKeysCount(){
    if(!originalKeysDraft)return;
    const questions=multipleChoiceQuestions(),defined=questions.filter(q=>originalKeysDraft.get(q.id)).length;
    $('originalKeysCount').textContent=`${defined} de ${questions.length} definidas`;
  }
  function openOriginalKeys(){
    const questions=multipleChoiceQuestions();if(!questions.length){toast('Analiza primero las preguntas de selección múltiple.');return;}
    originalKeysDraft=new Map(questions.map(q=>[q.id,q.correct||'']));
    $('originalKeysIntro').textContent=`Banco original · ${questions.length} preguntas A–D`;
    $('originalKeysList').innerHTML=questions.map((q,index)=>`<div class="original-key-row" data-index="${index}"><span class="original-key-number">${String(q.sourceNumber).padStart(2,'0')}</span><span class="original-key-stem" title="${escapeHtml(q.stem)}">${escapeHtml(q.stem)}</span><div class="original-key-options" role="group" aria-label="Pregunta original ${q.sourceNumber}">${['A','B','C','D'].map(letter=>`<button type="button" data-index="${index}" data-letter="${letter}" aria-label="Pregunta original ${q.sourceNumber}, opción ${letter}" aria-pressed="${q.correct===letter}">${letter}</button>`).join('')}</div></div>`).join('');
    updateOriginalKeysCount();$('originalKeysModal').classList.add('open');$('originalKeysList').querySelector('button')?.focus();
  }
  function closeOriginalKeys(){originalKeysDraft=null;$('originalKeysModal').classList.remove('open');$('originalKeysBtn').focus();}
  function saveOriginalKeys(){
    if(!originalKeysDraft)return;
    for(const question of multipleChoiceQuestions())setOriginalAnswer(question,originalKeysDraft.get(question.id)||'');
    updateOriginalKeyProgress();saveDraft();saveGeneratedState();
    if(state.generated)$('pliegoTransferStatus').textContent='Claves originales actualizadas. Prepara las claves en QUIZ para aplicar los cambios.';
    closeOriginalKeys();toast('Claves originales guardadas.');
  }
  function invalidateGenerated(clearSaved=true){generationRevision++;state.generated=false;state.versions=[];if(clearSaved)localStorage.removeItem(GENERATED_KEY);$('pliegoTransferKeys').disabled=true;$('pliegoTransferStatus').textContent='';$('generatedWorkspace').classList.add('hidden');$('emptyWorkspace').classList.remove('hidden');$('printAllBtn').disabled=true;$('downloadAnswerTablesBtn').disabled=true;$('printOneBtn').disabled=true;$('generateBtn').disabled=multipleChoiceQuestions().length<questionCount();updateQuizWarning();}
  function updateQuizWarning(){const count=questionCount(),mcCount=multipleChoiceQuestions().length,openCount=openQuestions().length;const insufficient=state.questions.length>0&&mcCount<count;$('quizWarning').textContent=insufficient?`El banco tiene ${mcCount} preguntas de selección múltiple y ${openCount} abiertas. Añade ${count-mcCount} preguntas A–D para cada versión.`:'';$('quizWarning').classList.toggle('hidden',!insufficient);const info=$('bankInfo');if(info){const enough=mcCount>=count;info.textContent=enough?`Banco: ${mcCount} de selección múltiple para sortear y ${openCount} abiertas. Cada versión incluirá exactamente ${count} cerradas y todas las abiertas al final.`:'';info.classList.toggle('hidden',!enough);}}
  function updateSummary(){$('summaryVersions').textContent=$('versionCount').value||'0';$('summaryQuestions').textContent=String(questionCount());$('summaryColumns').textContent=$('columns').value;}
  function updateButtons(){const max=questionCount()===20?5:20;$('versionCount').max=max;if(Number($('versionCount').value)>max)$('versionCount').value=max;const ok=multipleChoiceQuestions().length>=questionCount();$('generateBtn').disabled=!ok;updateQuizWarning();updateMixMetric();updateSummary();updateOriginalKeyProgress();}
  function parseAndReview(){const raw=$('sourceText').value;if(!raw.trim()){toast('Pega primero el material de preguntas.');return;}const parsed=parseMaterial(raw);state.questions=parsed.questions;state.parsedWarnings=parsed.warnings;state.parsed=true;state.preamble=parsed.preamble||[];setWarnings(parsed.warnings);renderReview();updateButtons();invalidateGenerated();saveDraft();if(parsed.questions.length){selectStep(3);toast(`Se identificaron ${parsed.questions.length} preguntas.`);}else toast('No se identificaron preguntas. Revisa el formato.');}
  function groupQuestions(list,shuffleQ){
    const groups=[];const by=new Map();list.forEach(q=>{const id=q.groupId||`single_${q.id}`;if(!by.has(id)){const g={id,context:q.context||'',questions:[]};by.set(id,g);groups.push(g);}by.get(id).questions.push({...q,options:q.options.map(o=>({...o}))});});
    return groups.flatMap(g=>{const qs=shuffleQ?random(g.questions):g.questions;return[{...g,questions:qs}];});
  }
  function createVersion(index){
    const label=String.fromCharCode(65+index);
    // Draw a fresh, independent sample of the configured question count for this version.
    // Keep the selected items in source order when question shuffling is disabled.
    const targetCount=questionCount();
    const drawn=random(multipleChoiceQuestions()).slice(0,targetCount);
    const selectedIds=new Set(drawn.map(q=>q.id));
    const selected=$('shuffleQuestions').checked?drawn:multipleChoiceQuestions().filter(q=>selectedIds.has(q.id));
    let groups=groupQuestions(selected,$('shuffleQuestions').checked);
    if($('shuffleQuestions').checked)groups=random(groups);
    const ordered=[];groups.forEach(g=>g.questions.forEach(q=>{let opts=q.options.map(o=>({...o}));if($('shuffleOptions').checked)opts=random(opts);ordered.push({...q,options:opts});}));
    return{label,index,groups,questions:ordered,openQuestions:openQuestions().map(q=>({...q,options:[]})),bankCount:state.questions.length,selectedCount:ordered.length};
  }
  function splitQuestionStem(value){
    const sentences=String(value||'').trim().split(/(?<=[;.!?])\s+/u).filter(Boolean),chunks=[];let current='';
    for(const sentence of sentences){
      let part='';
      for(const word of sentence.split(/\s+/)){
        const next=part?part+' '+word:word;
        if(next.length>105&&part){if(current)chunks.push(current);current=part;part=word;}else part=next;
        if(current.length>115){chunks.push(current);current='';}
      }
      if(part){const next=current?current+' '+part:part;if(next.length>120&&current){chunks.push(current);current=part;}else current=next;}
      if(current.length>120){chunks.push(current);current='';}
    }
    if(current)chunks.push(current);
    return chunks.length?chunks:[''];
  }
  function buildBlocks(version){
    const blocks=[];let number=0;
    (state.preamble||[]).forEach(text=>blocks.push({type:'context',text,label:'INDICACIÓN GENERAL'}));
    version.groups.forEach(group=>{
      if(group.context){blocks.push({type:'context',text:group.context,groupId:group.id,label:'LECTURA / CONTEXTO'});}
      group.questions.forEach(q=>{
        number++;const qv=version.questions.find(x=>x.id===q.id);const obj=qv||q;
        splitQuestionStem(obj.stem).forEach((stem,index)=>blocks.push({type:'question-start',number:index===0?number:'',stem,groupId:group.id}));
        const optionSize=$('optionLayout').value==='list'?1:2;
        for(let i=0;i<obj.options.length;i+=optionSize)blocks.push({type:'question-options',number,options:obj.options.slice(i,i+optionSize).map((option,index)=>({...option,index:i+index})),groupId:group.id});
      });
    });
    let lastOpenGroup=null;
    (version.openQuestions||[]).forEach(q=>{
      const groupId=q.groupId||`open_${q.id}`;
      if(q.context&&groupId!==lastOpenGroup)blocks.push({type:'context',text:q.context,groupId,label:'LECTURA / CONTEXTO'});
      number++;
      let first=true;
      for(const line of String(q.stem||'').split('\n').map(text=>text.trim()).filter(Boolean)){
        if(/^_{8,}$/.test(line)){blocks.push({type:'open-answer-rule',groupId});continue;}
        splitQuestionStem(line).forEach(stem=>{blocks.push({type:'question-start',number:first?number:'',stem,groupId,open:true});first=false;});
      }
      lastOpenGroup=groupId;
    });
    if($('includeQuiz').checked)blocks.push({type:'quiz-card',quizSource:version.cardSource});
    return blocks;
  }
  function renderQuizInlineTable(sourceOverride){
    const count=questionCount();
    const is20=count===20;
    const src=sourceOverride||(is20?'../assets/plantilla_quiz_20.svg':'../assets/plantilla_quiz_30.svg');
    const height=is20?1312:1700;
    // Use the exact SVG artwork supplied by the user and used by the QUIZ OMR reader.
    // Its original viewBox and fiducial/bubble coordinates must never be redrawn or cropped.
    return `<div class="quiz-exact-wrap measure-block" aria-label="Hoja original QUIZ de ${count} preguntas"><img class="quiz-exact-svg" src="${src}" width="1199" height="${height}" alt="Hoja óptica QUIZ original de ${count} preguntas" loading="eager" decoding="sync"></div>`;
  }
  function renderBlock(block){
    if(block.type==='context')return`<div class="context-block measure-block"><div class="context-label">${escapeHtml(block.label)}</div>${formatText(block.text)}</div>`;
    if(block.type==='quiz-card')return renderQuizInlineTable(block.quizSource);
    if(block.type==='open-answer-rule')return'<div class="open-answer-rule measure-block" aria-hidden="true"></div>';
    if(block.type==='question-options'){
      const options=block.options.map(o=>`<div class="q-option"><b>${'ABCD'[o.index]})</b><span>${formatText(o.text)}</span></div>`).join('');
      return`<div class="q-option-fragment measure-block"><div class="q-options q-options-fragment ${$('optionLayout').value==='list'?'list':''}">${options}</div></div>`;
    }
    return`<article class="q-block ${block.number?'':'q-continuation'}${block.open?' open-question':''} measure-block"><div class="q-head"><span class="q-no">${block.number?block.number+'.':''}</span><div class="q-stem">${formatText(block.stem)}</div></div></article>`;
  }
  function pageHeader(version,pageNo,header){
    return window.SIGA_PLIEGO_DOCUMENTS.pageHeader(version,pageNo,header,state.logoData);
  }
  function measureAndPaginate(blocks,version,header,fontSize,columns){
    const host=$('measureHost');host.innerHTML='';host.style.width=columns===2?'3.69in':'7.64in';host.style.setProperty('--qfont',fontSize+'pt');host.style.setProperty('--lineheight','1.16');
    blocks.forEach(b=>{const wrap=document.createElement('div');wrap.innerHTML=renderBlock(b);const node=wrap.firstElementChild;node.style.fontSize='var(--qfont)';host.appendChild(node);b._height=node.getBoundingClientRect().height+0.5;});
    const capacities=new Map();
    const pageUsable=(pageNo)=>{
      const key=pageNo===0?0:1;
      if(!capacities.has(key))capacities.set(key,Math.floor(window.SIGA_PLIEGO_DOCUMENTS.pageCapacity(host,pageHeader(version,pageNo,header),columns)*.93));
      return capacities.get(key);
    };
    const maxPages=[];let start=0;let pageNo=0;
    while(start<blocks.length){
      const cap=pageUsable(pageNo);let bestEnd=start;let bestSplit=start;let bestDiff=Infinity;let total=0;
      const sums=[0];for(let i=start;i<blocks.length;i++)sums.push(sums[sums.length-1]+blocks[i]._height);
      const feasible=[];
      for(let end=start+1;end<=blocks.length;end++){
        total=sums[end-start];if(columns===1){if(total<=cap)bestEnd=end;else break;continue;}
        if(total>2*cap+1)break;
        let local=null;
        for(let split=start+1;split<end;split++){
          const left=sums[split-start],right=total-left;
          if(left<=cap+1&&right<=cap+1){const diff=Math.abs(left-right);if(!local||diff<local.diff)local={split,diff};}
        }
        if(end===start+1&&sums[end-start]<=cap+1)local={split:end,diff:0};
        if(local){bestEnd=end;bestSplit=local.split;bestDiff=local.diff;feasible.push({end,...local});}
      }
      if(columns===1){if(bestEnd===start)bestEnd=start+1;maxPages.push({blocks:blocks.slice(start,bestEnd),split:bestEnd});start=bestEnd;}
      else{
        const chosen=feasible[feasible.length-1];
        if(chosen){bestEnd=chosen.end;bestSplit=chosen.split;let choice=chosen;for(let ix=feasible.length-1;ix>=0;ix--){const f=feasible[ix];if(f.end===bestEnd&&f.diff<choice.diff)choice=f;}bestSplit=choice.split;}
        if(bestEnd===start){bestEnd=start+1;bestSplit=start+1;}
        maxPages.push({blocks:blocks.slice(start,bestEnd),split:bestSplit-start});start=bestEnd;
      }
      pageNo++;if(pageNo>100)break;
    }
    return maxPages;
  }
  function paginateBest(version,header){
    const blocks=buildBlocks(version);const columns=Number($('columns').value);
    const fontSize={compact:8.4,auto:9.4,normal:9.8,large:11}[$('fontMode').value]||9.4;
    const pages=measureAndPaginate(blocks,version,header,fontSize,columns);
    version.pageCount=pages.length;version.fontSize=fontSize;version.columns=columns;return pages;
  }
  function renderVersionPages(version){
    const header=getHeader();const pages=paginateBest(version,header);const colCount=Number($('columns').value);const pageMarkup=[];
    pages.forEach((page,i)=>{
      let columnsHtml='';if(colCount===1){columnsHtml=`<div class="paper-columns" style="grid-template-columns:1fr"><div class="paper-column">${page.blocks.map(renderBlock).join('')}</div></div>`;}else{const split=page.split;const left=page.blocks.slice(0,split),right=page.blocks.slice(split);columnsHtml=`<div class="paper-columns"><div class="paper-column">${left.map(renderBlock).join('')}</div><div class="paper-column">${right.map(renderBlock).join('')}</div></div>`;}
      pageMarkup.push(`<section class="print-page exam-page" style="--qfont:${version.fontSize}pt;--lineheight:1.16">${pageHeader(version,i,header)}${columnsHtml}<div class="paper-footer">${escapeHtml(header.subject||'Evaluación')} · Página ${i+1} de ${pages.length}</div></section>`);
    });
    version.pagesHtml=pageMarkup;return pageMarkup;
  }
  function showGeneratedWorkspace(){
    const count=state.versions.length;
    $('emptyWorkspace').classList.add('hidden');$('generatedWorkspace').classList.remove('hidden');$('printAllBtn').disabled=false;$('downloadAnswerTablesBtn').disabled=false;$('printOneBtn').disabled=false;$('pliegoTransferKeys').disabled=false;
    $('metricQuestions').textContent=state.questions.length;$('metricPerExam').textContent=questionCount();$('metricVersions').textContent=count;$('metricPages').textContent=state.versions.reduce((n,v)=>n+v.pageCount,0);updateMixMetric();
    $('versionTabs').innerHTML=state.versions.map((v,i)=>`<button class="version-tab ${i===0?'active':''}" data-version="${i}">VERSIÓN ${v.label}</button>`).join('');$('versionTabs').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>selectVersion(+b.dataset.version)));
    selectVersion(0);$('workspaceSub').textContent=`${count} versiones · ${questionCount()} preguntas de selección múltiple + ${openQuestions().length} abiertas por examen.`;
    $('printAllBtn').textContent='Descargar PDF · Todas ('+count+')';
  }
  async function restoreGeneratedState(){
    try{
      const saved=JSON.parse(localStorage.getItem(GENERATED_KEY)||'null');
      if(!saved||saved.signature!==generationSignature()||!window.SIGA_QUIZ_VARIANTS.newId||!Array.isArray(saved.versions)||!saved.versions.length||saved.versions.length>20||!/^[0-9A-F]{8}$/.test(saved.id))return;
      const response=await fetch('../assets/plantilla_quiz_'+questionCount()+'.svg');if(!response.ok)return;
      const base=await response.text();if(saved.signature!==generationSignature())return;
      state.variantSetId=saved.id;state.versions=saved.versions;
      for(const version of state.versions){
        if(!version||!['A','B','C','D','E'].includes(version.label)||!Array.isArray(version.questions)||!Array.isArray(version.groups)||!Array.isArray(version.openQuestions))throw Error('Composición guardada inválida.');
        const header=getHeader();version.cardSource='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(window.SIGA_QUIZ_VARIANTS.svg(base,state.variantSetId,version.label,{questionCount:questionCount(),subject:header.subject+(header.grade?' · '+header.grade:''),label:header.assessment}));
        renderVersionPages(version);
      }
      state.generated=true;showGeneratedWorkspace();
    }catch(error){state.generated=false;state.versions=[];localStorage.removeItem(GENERATED_KEY);}
  }
  function selectVersion(index){state.selectedVersion=index;document.querySelectorAll('.version-tab').forEach((el,i)=>el.classList.toggle('active',i===index));const v=state.versions[index];if(!v)return;$('previewStack').innerHTML=v.pagesHtml.join('');$('previewHelp').textContent=`Versión ${v.label} · ${v.pageCount} página(s) · ${questionCount()} de selección múltiple + ${v.openQuestions.length} abiertas${$('includeQuiz').checked?' · tabla QUIZ integrada al final':''} · Letra ${v.fontSize} pt · Papel carta.`;fitPreview();}
  function fitPreview(){const stack=$('previewStack');if(!stack)return;const available=Math.min(stack.clientWidth,816);const scale=Math.min(1,available/(8.5*96));stack.querySelectorAll('.print-page').forEach(p=>{p.style.transform=`scale(${scale})`;p.style.transformOrigin='top center';p.style.marginBottom=`${-11*96*(1-scale)}px`;});}
  async function generate(){
    const err=validateBeforeGenerate();if(err){toast(err);return;}
    const request=++generationRevision;let base='';$('generateBtn').disabled=true;
    try{const response=await fetch('../assets/plantilla_quiz_'+questionCount()+'.svg');if(!response.ok)throw Error('No se pudo cargar la tarjeta QUIZ.');base=await response.text();}catch(error){toast(error.message);$('generateBtn').disabled=false;return;}
    if(request!==generationRevision)return;
    state.variantSetId=window.SIGA_QUIZ_VARIANTS.newId();
    const count=Number($('versionCount').value);state.versions=[];const signatures=new Set();for(let i=0;i<count;i++){let v=null;for(let attempt=0;attempt<80;attempt++){const candidate=createVersion(i);const signature=candidate.questions.map(q=>q.id+':'+q.options.map(o=>o.uid).join('')).join('|');if(!signatures.has(signature)||attempt===79){v=candidate;signatures.add(signature);break;}}if(base){const h=getHeader();v.cardSource='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(window.SIGA_QUIZ_VARIANTS.svg(base,state.variantSetId,v.label,{questionCount:questionCount(),subject:h.subject+(h.grade?' · '+h.grade:''),label:h.assessment}));}renderVersionPages(v);state.versions.push(v);}state.generated=true;state.selectedVersion=0;
    showGeneratedWorkspace();toast(`Se generaron ${count} versiones con ${questionCount()} preguntas de selección múltiple y ${openQuestions().length} abiertas.`);saveDraft();saveGeneratedState();
    $('generateBtn').disabled=false;
  }
  $('pliegoTransferKeys').addEventListener('click',()=>{
    if(!state.generated)return;
    const keys=Object.fromEntries(window.SIGA_QUIZ_VARIANTS.types.map(type=>{const v=state.versions.find(item=>item.label===type);return[type,v?v.questions.map(q=>{const index=q.options.findIndex(o=>o.uid===q.correct);return index<0?'':'ABCD'[index];}):Array(questionCount()).fill('')];}));
    const mapping={questionCount:questionCount(),types:Object.fromEntries(window.SIGA_QUIZ_VARIANTS.types.map(type=>{const v=state.versions.find(item=>item.label===type);return[type,v?v.questions.map(q=>({id:q.id,options:q.options.map(o=>o.uid).join('')})):[]];}))};
    const sourceKey=keys.A.slice();
    const bundle=questionCount()===20?{id:state.variantSetId,name:(getHeader().assessment||'Evaluación PLIEGO').slice(0,100),keys,mapping,sourceKey}:{id:state.variantSetId,name:(getHeader().assessment||'Evaluación PLIEGO').slice(0,100),keys:Object.fromEntries(window.SIGA_QUIZ_VARIANTS.types.map(type=>[type,Array(20).fill('')])),keys30:keys,mapping,sourceKey};
    try {
      sessionStorage.setItem('quiz.pliego.pending-variants',JSON.stringify(bundle));
      location.assign('../index.html?v=18#key');
    } catch(error) { toast('No se pudieron preparar las claves. '+error.message); }
  });
  async function downloadAll(){
    if(!state.generated)return;const button=$('printAllBtn'),label=button.textContent;button.disabled=true;button.textContent='Preparando PDF...';
    try{await window.SIGA_QUIZ_DOWNLOAD_PDF(state.versions.flatMap(v=>v.pagesHtml),'PLIEGO-'+state.versions.map(v=>v.label).join('-')+'.pdf');}catch(error){toast('No se pudo descargar el PDF. '+error.message);}finally{button.disabled=!state.generated;button.textContent=label;}
  }
  async function downloadAnswerTables(){
    if(!state.generated)return;const button=$('downloadAnswerTablesBtn'),label=button.textContent;button.disabled=true;button.textContent='Preparando tablas...';
    try{const pages=state.versions.map(version=>`<section class="print-page exam-page" style="display:grid;place-items:center;padding:.38in .43in .35in">${renderQuizInlineTable(version.cardSource)}</section>`);await window.SIGA_QUIZ_DOWNLOAD_PDF(pages,'QUIZ-tablas-'+state.versions.map(v=>v.label).join('-')+'.pdf');}catch(error){toast('No se pudieron descargar las tablas QUIZ. '+error.message);}finally{button.disabled=!state.generated;button.textContent=label;}
  }
  function preparePrint(mode){if(!state.generated){toast('Genera las versiones antes de imprimir.');return;}const root=$('printRoot');root.className='';root.innerHTML='';let html='';if(mode==='all'){state.versions.forEach(v=>html+=v.pagesHtml.join(''));}else{const v=state.versions[state.selectedVersion];html=v.pagesHtml.join('');}root.innerHTML=html;root.classList.remove('hidden');root.classList.remove('keys-print');window.print();setTimeout(()=>{root.innerHTML='';root.classList.add('hidden');},1200);}
  function showConfirm(title,text,action){$('modalTitle').textContent=title;$('modalText').textContent=text;$('confirmModal').classList.add('open');$('modalConfirm').onclick=()=>{$('confirmModal').classList.remove('open');action();};$('modalCancel').onclick=()=>$('confirmModal').classList.remove('open');}
  function newProject(){showConfirm('Crear un proyecto nuevo','Se borrará el material y las versiones generadas de esta sesión. El encabezado puede volver a configurarse.',()=>{state.questions=[];state.preamble=[];state.parsedWarnings=[];state.versions=[];state.parsed=false;state.generated=false;state.logoData='';$('logoFile').value='';$('sourceText').value='';setWarnings([]);$('reviewList').replaceChildren();$('reviewCount').textContent='0';$('bankInfo').classList.add('hidden');$('quizWarning').classList.add('hidden');$('generatedWorkspace').classList.add('hidden');$('emptyWorkspace').classList.remove('hidden');$('printAllBtn').disabled=true;$('downloadAnswerTablesBtn').disabled=true;$('printOneBtn').disabled=true;$('generateBtn').disabled=true;showLogo(window.SIGA_PLIEGO_DOCUMENTS.defaultLogo);localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(GENERATED_KEY);$('lastSaved').textContent='';countSource();updateButtons();selectStep(1);toast('Proyecto nuevo listo.');});}
  function selectStep(step){
    document.querySelectorAll('.pliego-step').forEach(button=>{const active=Number(button.dataset.step)===step;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',String(active));});
    document.querySelectorAll('.step-panel').forEach((panel,index)=>panel.classList.toggle('is-active',index+1===step));
  }
  function printModeKeyListener(){window.addEventListener('afterprint',()=>{const root=$('printRoot');root.innerHTML='';root.className='hidden';});}
  // Events
  $('sourceText').addEventListener('input',()=>{countSource();state.questions=[];state.preamble=[];state.parsed=false;$('reviewList').replaceChildren();$('reviewCount').textContent='0';$('parseWarnings').classList.add('hidden');$('bankInfo').classList.add('hidden');invalidateGenerated();updateButtons();saveDraft();});
  headerFields.forEach(id=>$(id).addEventListener('input',()=>{saveDraft();if(state.generated){invalidateGenerated();}}));
  ['versionCount','questionCount','columns','fontMode','optionLayout','shuffleQuestions','shuffleOptions','includeQuiz'].forEach(id=>$(id).addEventListener('change',()=>{saveDraft();invalidateGenerated();updateButtons();updateMixMetric();}));
  $('versionCount').addEventListener('input',updateSummary);
  $('parseBtn').addEventListener('click',parseAndReview);$('reparseBtn').addEventListener('click',parseAndReview);$('generateBtn').addEventListener('click',generate);$('printAllBtn').addEventListener('click',downloadAll);$('downloadAnswerTablesBtn').addEventListener('click',downloadAnswerTables);$('printOneBtn').addEventListener('click',()=>preparePrint('one'));$('resetBtn').addEventListener('click',newProject);
  $('originalKeysBtn').addEventListener('click',openOriginalKeys);$('originalKeysSave').addEventListener('click',saveOriginalKeys);$('originalKeysCancel').addEventListener('click',closeOriginalKeys);$('originalKeysClose').addEventListener('click',closeOriginalKeys);
  $('originalKeysList').addEventListener('click',event=>{const button=event.target.closest('button[data-letter]');if(!button||!originalKeysDraft)return;const question=multipleChoiceQuestions()[Number(button.dataset.index)];if(!question)return;const answer=originalKeysDraft.get(question.id)===button.dataset.letter?'':button.dataset.letter;originalKeysDraft.set(question.id,answer);button.parentElement.querySelectorAll('button').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.letter===answer)));updateOriginalKeysCount();});
  $('originalKeysModal').addEventListener('click',event=>{if(event.target===$('originalKeysModal'))closeOriginalKeys();});document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('originalKeysModal').classList.contains('open'))closeOriginalKeys();});
  document.querySelectorAll('.pliego-step').forEach(button=>button.addEventListener('click',()=>selectStep(Number(button.dataset.step))));
  $('appShell').querySelector('.pliego-steps').addEventListener('keydown',event=>{const buttons=[...document.querySelectorAll('.pliego-step')],index=buttons.indexOf(document.activeElement);if(index<0)return;const next=event.key==='ArrowRight'?(index+1)%4:event.key==='ArrowLeft'?(index+3)%4:event.key==='Home'?0:event.key==='End'?3:-1;if(next<0)return;event.preventDefault();buttons[next].focus();selectStep(next+1);});
  $('saveProjectBtn').addEventListener('click',saveProjectFile);$('importProjectBtn').addEventListener('click',()=>$('projectFile').click());$('projectFile').addEventListener('change',e=>{const file=e.target.files?.[0];e.target.value='';importProjectFile(file);});
  $('logoFile').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>2*1024*1024){toast('El logo no debe superar 2 MB.');e.target.value='';return;}const reader=new FileReader();reader.onload=()=>{state.logoData=reader.result;showLogo(state.logoData);saveDraft();if(state.generated)invalidateGenerated();};reader.readAsDataURL(f);});
  $('removeLogo').addEventListener('click',()=>{state.logoData='';$('logoFile').value='';showLogo(window.SIGA_PLIEGO_DOCUMENTS.defaultLogo);saveDraft();if(state.generated)invalidateGenerated();});
  window.addEventListener('resize',fitPreview);printModeKeyListener();
  restoreDraft();if(!state.logoData)showLogo(window.SIGA_PLIEGO_DOCUMENTS.defaultLogo);countSource();updateButtons();restoreGeneratedState();
  if('serviceWorker' in navigator){navigator.serviceWorker.getRegistration(location.href).then(registration=>{if(registration?.scope===new URL('./',location.href).href)registration.unregister();}).catch(()=>{});}
})();
