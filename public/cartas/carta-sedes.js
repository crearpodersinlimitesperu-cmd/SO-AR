(function () {
  const base = new URL('.', document.currentScript.src);
  const keys = ['razonSocial', 'identificacionFiscal', 'direccionFiscal', 'correoContacto', 'telefonoContacto'];
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const sedeId = value => {
    const s = normalize(value);
    if (s.includes('quito') || s.startsWith('uio')) return 'quito';
    if (s === 'lim' || s.includes('lima')) return 'lima';
    if (s === 'cue' || s.includes('cuenca')) return 'cuenca';
    if (s === 'gye' || s.includes('guayaquil')) return 'guayaquil';
    if (s === 'med' || s.includes('medellin')) return 'medellin';
    if (s === 'mex' || s === 'cdmx' || s.includes('mexico')) return 'mexico';
    return '';
  };
  document.addEventListener('DOMContentLoaded', async () => {
    const panel = document.createElement('div');
    panel.className = 'no-print max-w-4xl mx-auto mb-4 bg-white p-4 rounded-xl';
    const label = document.createElement('label'); label.textContent = 'Sede de destino: ';
    const select = document.createElement('select'); select.setAttribute('aria-label', 'Sede de destino');
    const empty = document.createElement('option'); empty.value = ''; empty.textContent = 'Seleccionar sede'; select.append(empty);
    const status = document.createElement('p'); status.className = 'text-sm mt-2'; status.setAttribute('role','status');
    label.append(select); panel.append(label, status); document.body.prepend(panel);
    let catalog;
    try { const response = await fetch(new URL('sedes-institucionales.json', base), {cache:'no-store'}); if(!response.ok) throw Error(); catalog = await response.json(); }
    catch { status.textContent = 'No se pudo cargar el directorio de sedes. Recarga antes de generar la carta.'; return; }
    Object.entries(catalog).forEach(([id, data]) => { const option = document.createElement('option'); option.value=id; option.textContent=data.sede; select.append(option); });
    let revision=0;
    async function render() {
      const current=++revision, id=select.value, seed=catalog[id];
      document.getElementById('print-letter').disabled=true;
      const signature=document.getElementById('sede-signature'); signature.replaceChildren();
      if (!seed) {
        document.getElementById('sede-invitation').textContent='Selecciona la sede de destino para completar los responsables de esta invitación.';
        document.getElementById('sede-authority').textContent='A las autoridades migratorias:';
        document.getElementById('sede-city').textContent='[SEDE PENDIENTE]';
        status.textContent='Las cartas antiguas sin sede requieren seleccionarla; no se asume Lima.'; return;
      }
      status.textContent='Consultando los datos de la sede…';
      const data={...seed}; let unavailable=false;
      try {
        const response=await fetch('https://firestore.googleapis.com/v1/projects/centro-operativo-cpsl/databases/(default)/documents/sedes_institucionales/'+id, {cache:'no-store',signal:AbortSignal.timeout(6000)});
        if(response.ok) { const document=await response.json(); keys.forEach(key=>{ if(document.fields?.[key]?.stringValue !== undefined) data[key]=document.fields[key].stringValue; }); }
        else if(response.status!==404) unavailable=true;
      } catch { unavailable=true; }
      if(current!==revision)return;
      const names=seed.gerentes.map(manager=>manager.nombre).join(' y ');
      const complete=keys.every(key=>typeof data[key]==='string' && data[key].trim() && !data[key].includes('['));
      document.getElementById('sede-authority').textContent='A las autoridades migratorias de '+seed.pais+':';
      document.getElementById('sede-city').textContent=seed.ciudad+', '+seed.pais;
      document.getElementById('sede-invitation').textContent=complete
        ? `Por medio de la presente, ${data.razonSocial}, con identificación fiscal ${data.identificacionFiscal} y domicilio en ${data.direccionFiscal}, comercialmente conocida como CREAR Poder Sin Límites, sede ${seed.sede}, emite esta invitación a favor de la siguiente persona:`
        : `Por medio de la presente, ${names}, ${seed.gerentes.length>1?'gerentes responsables':'gerente responsable'} de CREAR Poder Sin Límites, sede ${seed.sede}, presenta${seed.gerentes.length>1?'n':''} esta invitación a favor de la siguiente persona:`;
      seed.gerentes.forEach(manager=>{const name=document.createElement('p');name.className='font-bold text-gray-900 text-lg';name.textContent=manager.nombre;signature.append(name);});
      if(complete) [data.razonSocial, data.identificacionFiscal, data.direccionFiscal, [data.correoContacto,data.telefonoContacto].join(' | ')].forEach(text=>{const line=document.createElement('p');line.className='text-sm text-gray-600';line.textContent=text;signature.append(line);});
      status.textContent=(complete?'Datos institucionales registrados.':'Datos institucionales pendientes: por ahora figuran únicamente los nombres de los gerentes.')+(unavailable?' No se pudo consultar Causa OS; se muestran los datos base disponibles.':'');
      document.getElementById('print-letter').disabled=false;
      const params=new URLSearchParams(location.search);params.set('sede',id);history.replaceState(null,'','?'+params.toString());
      const hotel=document.getElementById('field-hotel');if(/^Hotel Sede /i.test(hotel.textContent))hotel.textContent='[HOSPEDAJE PENDIENTE]';
    }
    select.value=sedeId(new URLSearchParams(location.search).get('sede'));
    select.addEventListener('change',render); await render();
  });
})();
