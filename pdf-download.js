(() => {
  'use strict';
  window.SIGA_QUIZ_DOWNLOAD_PDF = async (pages, filename) => {
    if(!pages.length)throw Error('Primero genera el documento.');
    const host=document.createElement('div');
    host.id='sigaPdfCaptureHost';
    host.style.cssText='position:absolute;left:-20000px;top:0;width:816px;background:white;pointer-events:none;';
    document.body.append(host);
    try {
      await document.fonts.ready;
      const pdf=new window.jspdf.jsPDF({unit:'pt',format:'letter',compress:true});
      const crestImages=new Map();
      const bannerImages=new Map();
      for(let index=0;index<pages.length;index++){
        host.innerHTML=pages[index];
        const page=host.firstElementChild;
        page.style.transform='none';page.style.margin='0';page.style.boxShadow='none';
        await Promise.all([...page.querySelectorAll('img')].map(image=>image.decode()));
        const crest=page.querySelector('.exam-banner .roster-logo');
        if(crest?.naturalWidth&&crest?.naturalHeight){
          const height=crest.getBoundingClientRect().height;
          crest.style.width=`${height*crest.naturalWidth/crest.naturalHeight}px`;
        }
        const pageBounds=page.getBoundingClientRect();
        const crestBounds=crest?.getBoundingClientRect();
        const banner=page.querySelector('.exam-banner');
        let bannerImage;
        if(banner){
          const bounds=banner.getBoundingClientRect();
          const key=`${Math.ceil(bounds.width*3)}x${Math.ceil(bounds.height*3)}`;
          bannerImage=bannerImages.get(key);
          if(!bannerImage){
            const source=new Image();
            const backgroundUrl=/^url\(["']?(.*?)["']?\)$/.exec(getComputedStyle(banner).backgroundImage)?.[1];
            if(!backgroundUrl)throw Error('No se pudo cargar el fondo del encabezado.');
            source.src=backgroundUrl;
            await source.decode();
            const background=document.createElement('canvas');
            background.width=Math.ceil(bounds.width*3);
            background.height=Math.ceil(bounds.height*3);
            background.getContext('2d').drawImage(source,0,0,background.width,background.height);
            bannerImage=background.toDataURL('image/png');
            bannerImages.set(key,bannerImage);
            background.width=background.height=0;
          }
        }
        const canvas=await html2canvas(page,{scale:3,backgroundColor:'#fff',logging:false,useCORS:true,
          ignoreElements:element=>element.matches?.('#sigaPdfCaptureHost .exam-banner .roster-logo')||false,
          onclone:cloned=>{
            if(!bannerImage)return;
            const clone=cloned.querySelector('#sigaPdfCaptureHost .exam-banner');
            clone?.style.setProperty('background-image',`url("${bannerImage}")`,'important');
          }});
        if(index)pdf.addPage('letter');
        pdf.addImage(canvas.toDataURL('image/jpeg',.99),'JPEG',0,0,612,792);
        canvas.width=canvas.height=0;
        if(crestBounds){
          let original=crestImages.get(crest.src);
          if(!original){
            const image=document.createElement('canvas');
            image.width=crest.naturalWidth;image.height=crest.naturalHeight;
            image.getContext('2d').drawImage(crest,0,0);
            original={data:image.toDataURL('image/png'),alias:`exam-crest-${crestImages.size}`};
            crestImages.set(crest.src,original);
            image.width=image.height=0;
          }
          const scale=612/pageBounds.width;
          pdf.addImage(original.data,'PNG',(crestBounds.left-pageBounds.left)*scale,
            (crestBounds.top-pageBounds.top)*scale,crestBounds.width*scale,crestBounds.height*scale,original.alias);
        }
      }
      const url=URL.createObjectURL(pdf.output('blob')),link=document.createElement('a');
      link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),15000);
    }finally{host.remove();}
  };
})();
