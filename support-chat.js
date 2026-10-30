(() => {
  const el=id=>document.getElementById(id), api=window.API_BASE||'https://quintrack-backend.onrender.com';
  let access=null,isOpen=false,busy=false,polling=false,lastSignature='',expanded=false;
  const panel=el('qt-panel'), form=el('qt-name-form'), msgs=el('qt-msgs');
  const inputStyle='width:100%;border:1px solid #d1d5db;border-radius:8px;padding:8px;font-size:12px;color:#111827;background:white;box-sizing:border-box;';
  for(const [id,placeholder,type] of [['qt-tracking','Tracking number','text'],['qt-phone','Receiver phone including country code','tel']]){
    const input=document.createElement('input');input.id=id;input.placeholder=placeholder;input.type=type;input.style.cssText=inputStyle;form.insertBefore(input,form.firstChild);
  }
  const intro=form.querySelector('p');if(intro)intro.textContent='Enter your tracking number, receiver phone, and name to unlock shipment support.';
  el('qt-inp').maxLength=10000;
  el('qt-tracking').value=new URLSearchParams(location.search).get('t')||'';
  const error=document.createElement('p');error.setAttribute('role','status');error.style.cssText='font-size:12px;color:#b91c1c;margin:0;padding:6px;';form.after(error);
  const reset=document.createElement('button');reset.textContent='Change shipment';reset.style.cssText='padding:6px;font-size:12px;background:#fff;color:#374151;border:0;cursor:pointer;display:none;';form.after(reset);
  function lock(){access=null;sessionStorage.removeItem('qt_shipment_chat');form.style.display='flex';msgs.style.display='none';el('qt-footer').style.display='none';reset.style.display='none';}
  reset.onclick=()=>{lock();msgs.replaceChildren();lastSignature='';};
  async function request(path,method='GET',body){
    const r=await fetch(api+path,{method,headers:{'Content-Type':'application/json',...(access?{'X-Chat-Token':access.token}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const d=await r.json();if(!r.ok){if(r.status===401)lock();throw Error(d.error||'Request failed');}return d;
  }
  function render(chat){
    const signature=JSON.stringify(chat.messages||[]);if(signature===lastSignature)return;
    const atBottom=msgs.scrollHeight-msgs.scrollTop-msgs.clientHeight<80;
    msgs.replaceChildren();
    if(!chat.messages?.length){const welcome=document.createElement('p');welcome.textContent='Your shipment support conversation is ready. Send a message below.';welcome.style.cssText='font-size:12px;color:#6b7280;';msgs.append(welcome);}
    for(const m of chat.messages||[]){
      const bubble=document.createElement('div');bubble.style.cssText='max-width:85%;padding:8px 12px;border-radius:12px;font-size:12px;overflow-wrap:anywhere;'+(m.role==='user'?'align-self:flex-end;background:#111827;color:white;':'align-self:flex-start;background:white;color:#111827;border:1px solid #e5e7eb;');
      if(m.image&&/^data:image\/(jpeg|png|webp);base64,/.test(m.image)){const img=document.createElement('img');img.src=m.image;img.alt='Chat attachment';img.style.cssText='max-width:100%;border-radius:8px;';bubble.append(img);}
      if(m.text){const text=document.createElement('div');text.textContent=m.text;bubble.append(text);}msgs.append(bubble);
    }
    if(atBottom)msgs.scrollTop=msgs.scrollHeight;
    if(!isOpen&&lastSignature){el('qt-badge').style.display='flex';el('qt-badge').textContent='•';}
    lastSignature=signature;
  }
  function showChat(chat){form.style.display='none';msgs.style.display='flex';msgs.style.flexDirection='column';msgs.style.gap='6px';el('qt-footer').style.display='flex';reset.style.display='block';render(chat);}
  window.qtToggle=()=>{isOpen=!isOpen;panel.classList.toggle('open',isOpen);panel.style.display=isOpen?'flex':'none';if(isOpen)el('qt-badge').style.display='none';};
  const normalStyle=panel.style.cssText;
  window.qtExpand=()=>{expanded=!expanded;panel.classList.toggle('full',expanded);panel.style.cssText=expanded?'position:fixed;inset:0;width:100%;height:100%;max-height:none;z-index:9998;display:flex;flex-direction:column;background:white;border-radius:0;':normalStyle;panel.style.display='flex';};
  window.qtUnlock=window.qtStart=async()=>{
    if(busy)return;busy=true;error.textContent='';
    try{
      const d=await request('/api/chat/session','POST',{trackingId:el('qt-tracking').value.trim(),phone:el('qt-phone').value.trim(),userName:el('qt-ni').value.trim(),userEmail:el('qt-ei').value.trim()});
      access={token:d.chatToken,sessionId:d.chat.sessionId,trackingId:d.chat.shipmentId};sessionStorage.setItem('qt_shipment_chat',JSON.stringify(access));lastSignature='';showChat(d.chat);
    }catch(e){error.textContent=e.message;}finally{busy=false;}
  };
  async function send(payload){if(!access)throw Error('Unlock your shipment chat first.');const chat=await request('/api/chat/message','POST',{sessionId:access.sessionId,...payload});render(chat);}
  window.qtSend=async()=>{const text=el('qt-inp').value.trim();if(!text||busy)return;busy=true;error.textContent='';try{await send({text});el('qt-inp').value='';}catch(e){error.textContent=e.message;}finally{busy=false;}};
  window.qtPickImage=async event=>{
    const file=event.target.files[0];event.target.value='';if(!file||busy)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){error.textContent='Choose a JPG, PNG, or WebP image up to 5 MB.';return;}
    busy=true;error.textContent='';
    try{
      const image=await createImageBitmap(file),canvas=document.createElement('canvas'),scale=Math.min(1,900/image.width);canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image.close();await send({image:canvas.toDataURL('image/jpeg',0.75)});
    }catch(e){error.textContent=e.message;}finally{busy=false;}
  };
  async function refresh(){if(!access||polling)return;polling=true;try{const id=access.sessionId;const chat=await request('/api/chat/session/'+encodeURIComponent(id));if(access&&access.sessionId===id){showChat(chat);error.textContent='';}}catch(e){error.textContent=e.message;}finally{polling=false;}}
  // Restore only after all functions and UI bindings exist.
  try{access=JSON.parse(sessionStorage.getItem('qt_shipment_chat')||'null');const tracking=new URLSearchParams(location.search).get('t');if(access&&(!access.token||!access.sessionId||tracking&&access.trackingId!==tracking.trim().toUpperCase())){lock();}}catch{lock();}
  if(access)refresh();
  setInterval(refresh,3000);
})();
