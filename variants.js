(() => {
  'use strict';
  const types = Object.freeze(['A','B','C','D','E']);
  const validId = value => typeof value === 'string' && /^[0-9A-F]{8}$/.test(value);
  const key = (values,count=20) => Array.from({length:count},(_,i)=>['A','B','C','D'].includes(values?.[i])?values[i]:'');
  function newId() { return [...crypto.getRandomValues(new Uint8Array(4))].map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase(); }
  function normalizeMapping(value) {
    if(!value)return null;
    const count=value.questionCount;
    if(![20,30].includes(count)||!value.types||typeof value.types!=='object')return null;
    const mapped={};
    for(const type of types){
      const rows=value.types[type];
      if(!Array.isArray(rows)||![0,count].includes(rows.length)||(type==='A'&&rows.length!==count))return null;
      const ids=new Set();
      mapped[type]=[];
      for(const row of rows){
        if(!row||typeof row.id!=='string'||!/^q[a-z0-9_]{1,79}$/i.test(row.id)||typeof row.options!=='string'||!/^[A-D]{4}$/.test(row.options)||new Set(row.options).size!==4||ids.has(row.id))return null;
        ids.add(row.id);mapped[type].push({id:row.id,options:row.options});
      }
    }
    return {questionCount:count,types:mapped};
  }
  function normalizeBundle(value) {
    if (!value || !validId(value.id) || !value.keys || typeof value.keys !== 'object') return null;
    const keys30=value.keys30&&typeof value.keys30==='object'?value.keys30:value.keysByCount?.[30]||{};
    const mapping=normalizeMapping(value.mapping);
    if(value.mapping&&!mapping)return null;
    const sourceKey=value.sourceKey;
    if(sourceKey!=null&&(!mapping||!Array.isArray(sourceKey)||sourceKey.length!==mapping.questionCount||sourceKey.some(answer=>!['','A','B','C','D'].includes(answer))))return null;
    return {id:value.id,name:String(value.name || 'Evaluación').slice(0,100),keys:Object.fromEntries(types.map(t=>[t,key(value.keys[t],20)])),keys30:Object.fromEntries(types.map(t=>[t,key(keys30[t],30)])),mapping,sourceKey:sourceKey?sourceKey.slice():null};
  }
  function propagateFromA(bundle,count,index,answer){
    const mapping=bundle?.mapping;
    if(mapping?.questionCount!==count||!['','A','B','C','D'].includes(answer))return 0;
    const source=mapping.types.A[index];if(!source)return 0;
    const original=answer?source.options['ABCD'.indexOf(answer)]:'';
    const keys=count===20?bundle.keys:bundle.keys30;
    let changed=0;
    for(const type of types.slice(1)){
      const target=mapping.types[type].findIndex(row=>row.id===source.id);
      if(target<0)continue;
      const mapped=original?'ABCD'[mapping.types[type][target].options.indexOf(original)]:'';
      keys[type][target]=mapped;changed++;
    }
    return changed;
  }
  function payload(id,type,count=20) {
    if (!validId(id) || !types.includes(type) || ![20,30].includes(count)) throw Error('Identificador de prueba no valido.');
    return `SG${count}:${id}:${type}`;
  }
  function parse(value) { const m=/^SG(20|30):([0-9A-F]{8}):([A-E])$/.exec(value); return m?{questionCount:Number(m[1]),id:m[2],type:m[3]}:null; }
  function svg(source,id,type,settings={}) {
    const data=payload(id,type,settings.questionCount||20), xml=new DOMParser().parseFromString(source,'image/svg+xml');
    if(xml.querySelector('parsererror'))throw Error('No se pudo leer la tarjeta de respuestas.');
    const subject=xml.querySelector('#sheetSubjectLine');
    if(subject){subject.setAttribute('x','678');subject.setAttribute('font-size','23');if(settings.subject)subject.textContent=String(settings.subject).slice(0,64);}
    xml.querySelector('rect[x="438"][y="238"]')?.setAttribute('width','480');
    if(settings.label)xml.querySelector('#sheetTypeLabel').textContent=String(settings.label).slice(0,18);
    const code=qrcode(1,'Q');code.addData(data,'Alphanumeric');code.make();
    const qr=new DOMParser().parseFromString(code.createSvgTag(6,24),'image/svg+xml').documentElement;
    qr.setAttribute('x','944');qr.setAttribute('y','112');qr.setAttribute('width','174');qr.setAttribute('height','174');
    qr.setAttribute('data-quiz-id',data);qr.setAttribute('aria-label','Identificador de prueba '+type);
    xml.documentElement.append(xml.importNode(qr,true));
    return new XMLSerializer().serializeToString(xml.documentElement);
  }
  function decode(image) {
    const x0=924,y0=100,w=220,h=220,data=new Uint8ClampedArray(w*h*4);
    let dark=0,total=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const from=((y+y0)*image.width+x+x0)*4,to=(y*w+x)*4;
      for(let c=0;c<4;c++)data[to+c]=image.data[from+c];
      if(x>=20&&x<194&&y>=12&&y<118){total++;if(data[to]+data[to+1]+data[to+2]<390)dark++;}
    }
    const result=jsQR(data,w,h,{inversionAttempts:'dontInvert'});
    if(result){const value=parse(result.data);return value?{kind:'identified',...value}:{kind:'invalid'};}
    return dark/total>.025?{kind:'unreadable'}:{kind:'legacy'};
  }
  window.SIGA_QUIZ_VARIANTS=Object.freeze({types,key,newId,normalizeBundle,propagateFromA,payload,parse,svg,decode});
})();
