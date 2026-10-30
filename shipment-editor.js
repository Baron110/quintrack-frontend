(() => {
  const groups={sender:['name','address','city','zip','tel','email'],receiver:['name','address','city','zip','tel','email'],package:['content','qty','weight','from','orderType','shipDate','expDate']};
  const labels={tel:'Phone',zip:'ZIP / postal code',qty:'Quantity',from:'Origin',orderType:'Order type',shipDate:'Ship date',expDate:'Expected delivery',dateRaw:'Date',done:'Completed',active:'Active'};
  let shipment=null;
  function field(parent,label,value,type='text'){
    const wrap=document.createElement('label');wrap.className='block text-xs font-semibold text-gray-500 mb-2';wrap.textContent=label;
    const input=document.createElement(type==='textarea'?'textarea':'input');input.className='fi mt-1';
    if(type!=='textarea')input.type=type;
    if(type==='checkbox'){input.checked=!!value;input.className='ml-2';}else input.value=value??'';
    wrap.append(input);parent.append(wrap);return input;
  }
  function stopRow(stop={}){
    const row=document.createElement('div');row.className='border border-gray-200 rounded-xl p-3 mb-3';row.dataset.stop='true';
    for(const key of ['location','country','type','event','dateRaw','time','done','active']){
      let input;
      if(key==='type'){
        const label=document.createElement('label');label.textContent='Event type';input=document.createElement('select');input.className='fi';
        for(const value of ['pickup','flight','transit','arrival','sort','delivery','delivered']){const option=document.createElement('option');option.value=value;option.textContent=value;input.append(option);}input.value=stop.type||'sort';label.append(input);row.append(label);
      }else input=field(row,labels[key]||key,stop[key]??(key==='country'?'OTHER':''),key==='done'||key==='active'?'checkbox':key==='dateRaw'?'date':'text');
      input.dataset.key=key;
    }
    row.dataset.originalDate=stop.date||'';
    const remove=document.createElement('button');remove.type='button';remove.textContent='Remove stop';remove.className='text-red-600 text-xs';remove.onclick=()=>row.remove();row.append(remove);document.getElementById('editJourney').append(row);
  }
  window.populateShipmentEditor=s=>{
    shipment=s;const root=document.getElementById('editDetails');root.replaceChildren();
    for(const [group,keys] of Object.entries(groups)){
      const section=document.createElement('fieldset');const title=document.createElement('legend');title.textContent=group[0].toUpperCase()+group.slice(1);title.className='font-bold text-gray-900 mb-2';section.append(title);
      for(const key of keys){if(group==='package'&&key==='expDate')continue;const input=field(section,labels[key]||key,s[group]?.[key],key==='email'?'email':key==='shipDate'?'date':'text');input.dataset.path=group+'.'+key;}
      root.append(section);
    }
    const title=document.createElement('h4');title.textContent='Journey stops';title.className='font-bold text-gray-900 my-3';const container=document.createElement('div');container.id='editJourney';root.append(title,container);
    (s.journey||[]).forEach(stopRow);const add=document.createElement('button');add.type='button';add.textContent='+ Add stop';add.className='text-blue-600 font-semibold text-sm';add.onclick=()=>stopRow();root.append(add);
  };
  window.collectShipmentEditor=()=>{
    const result={};for(const group of Object.keys(groups))result[group]={...(shipment[group]||{})};
    document.querySelectorAll('#editDetails [data-path]').forEach(input=>{const [group,key]=input.dataset.path.split('.');result[group][key]=input.value.trim();});
    result.package.expDate=document.getElementById('edit_expdate').value;
    result.journey=[...document.querySelectorAll('#editJourney [data-stop]')].map(row=>{
      const stop={};row.querySelectorAll('[data-key]').forEach(input=>stop[input.dataset.key]=input.type==='checkbox'?input.checked:input.value.trim());
      if(!stop.location)throw Error('Enter a location for every journey stop.');
      stop.country=stop.country.toUpperCase();stop.date=stop.dateRaw?new Date(stop.dateRaw+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):row.dataset.originalDate||'';return stop;
    });return result;
  };
})();
