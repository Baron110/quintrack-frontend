(() => {
  const MAX=5*1024*1024;
  window.readSupportPdf=async file=>{
    if(file.size>MAX)throw Error('PDF must be 5 MB or smaller.');
    const header=new Uint8Array(await file.slice(0,5).arrayBuffer());
    if(String.fromCharCode(...header)!=='%PDF-')throw Error('This file is not a valid PDF.');
    const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Unable to read PDF.'));reader.readAsDataURL(file);});
    return {name:file.name.slice(0,200),mimeType:'application/pdf',size:file.size,dataUrl:'data:application/pdf;base64,'+dataUrl.split(',')[1]};
  };
  window.createPdfAttachment=(file,load)=>{
    const card=document.createElement('div');card.style.cssText='padding:8px 0;overflow-wrap:anywhere;';
    const title=document.createElement('div');title.textContent='PDF · '+(file.name||'Attachment');title.style.fontWeight='700';card.append(title);
    const size=document.createElement('div');size.textContent=(file.size/1024/1024).toFixed(2)+' MB';size.style.cssText='font-size:11px;opacity:0.7;margin:3px 0;';card.append(size);
    if(file.mimeType!=='application/pdf'||!file.fileId||typeof load!=='function'){size.textContent='Attachment unavailable';return card;}
    function objectUrl(dataUrl){
      if(typeof dataUrl!=='string'||!/^data:application\/pdf;base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl)||dataUrl.length>6990540)throw Error('Invalid PDF');
      const bytes=Uint8Array.from(atob(dataUrl.split(',')[1]),c=>c.charCodeAt(0));
      if(bytes.length>MAX||String.fromCharCode(...bytes.slice(0,5))!=='%PDF-')throw Error('Invalid PDF');
      const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));setTimeout(()=>URL.revokeObjectURL(url),60000);return url;
    }
    let loading=false;
    for(const [label,download]of [['Open PDF',false],['Download',true]]){
      const link=document.createElement('a');link.textContent=label;link.href='#';link.style.cssText='color:inherit;text-decoration:underline;margin-right:12px;font-size:12px;';link.onclick=async event=>{
        event.preventDefault();if(loading)return;loading=true;
        const tab=download?null:window.open('about:blank','_blank');if(tab)tab.opener=null;
        try{
          const data=await load(),url=objectUrl(data.dataUrl);
          if(download){const a=document.createElement('a');a.href=url;a.download=(file.name||'attachment.pdf').replace(/[\\/\x00-\x1f]/g,'_');a.click();}
          else if(tab)tab.location.href=url;
          else throw Error('Allow pop-ups to open the PDF, or choose Download.');
          size.textContent=(file.size/1024/1024).toFixed(2)+' MB';
        }catch(e){if(tab)tab.close();size.textContent=e.message||'Unable to open this PDF.';}
        finally{loading=false;}
      };card.append(link);
    }
    return card;
  };
})();
