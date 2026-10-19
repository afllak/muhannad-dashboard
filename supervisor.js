(function (root) {
  'use strict';
  const SOURCE = 'https://raw.githubusercontent.com/afllak/muhannad-dashboard/hermes/live-state/supervisor.json';
  const states = new Set(['HEALTHY', 'DEGRADED', 'OFFLINE', 'UNKNOWN']);
  const allowed = new Set(['schema_version','integration','generated_at','hermes_status','work_status','bus_health','pending_count','oldest_pending_age_seconds','last_verified_update','last_hermes_message','last_work_response','last_ack','current_workstream','genuine_blocker','pending_review_count','needs_muhannad','decision_summary','decision_options','decision_impact','safely_stopped','notification_status','adapter_freshness','work_idle_wakeup','games_hold']);
  function validate(value) {
    if (!value || value.schema_version !== 1 || value.integration !== 'LOCAL_SUPERVISOR_BUS_PROTOTYPE' || Object.keys(value).some(k => !allowed.has(k))) throw Error('Invalid supervisor projection');
    if (!states.has(value.bus_health) || value.games_hold !== true || typeof value.needs_muhannad !== 'boolean' || !Number.isInteger(value.pending_count) || value.pending_count < 0 || !Number.isInteger(value.pending_review_count)) throw Error('Invalid supervisor state');
    for (const key of ['generated_at','last_verified_update','last_hermes_message','last_work_response','last_ack']) if (value[key] !== null && (typeof value[key] !== 'string' || !Number.isFinite(Date.parse(value[key])))) throw Error('Invalid observation time');
    const serialized = JSON.stringify(value);
    if (serialized.length > 10000 || /https?:\/\/|[a-z]:[\\/]|session_key|20261019_124654|(?:password|api_key|command_line)/i.test(serialized)) throw Error('Private data rejected');
    for (const key of ['decision_options','decision_impact']) if (!Array.isArray(value[key]) || value[key].length > 4 || value[key].some(x => typeof x !== 'string' || x.length > 180)) throw Error('Decision schema');
    return value;
  }
  function view(value, now = Date.now()) {
    validate(value);
    return { stale: now - Date.parse(value.generated_at) > 180000 || Date.parse(value.generated_at) > now + 30000,
      needsOwner: value.needs_muhannad, stopped: value.safely_stopped === true,
      wakeup: value.work_idle_wakeup === 'PASS' ? 'PASS' : 'NOT VERIFIED' };
  }
  function render(value, doc) {
    const state = view(value); const panel = doc.getElementById('supervisor-bus');
    if (!panel) return;
    const grid = doc.getElementById('supervisor-grid'); grid.replaceChildren();
    const rows = [ ['Hermes',value.hermes_status], ['Work Supervisor',value.work_status], ['Bus health',value.bus_health],
      ['آخر تحديث مثبت',value.last_verified_update || 'UNKNOWN'], ['آخر ACK مثبت',value.last_ack || 'UNKNOWN'], ['آخر Hermes → Work',value.last_hermes_message || 'UNKNOWN'],
      ['آخر رد Work → Hermes',value.last_work_response || 'UNKNOWN'], ['رسائل معلقة',String(value.pending_count)],
      ['عمر أقدم رسالة / ثانية',String(value.oldest_pending_age_seconds)], ['مراجعات معلقة',String(value.pending_review_count)],
      ['حداثة Adapter',value.adapter_freshness], ['المسار',value.current_workstream], ['العائق الحالي',value.genuine_blocker || 'لا عائق مسجل'],
      ['التنبيه',value.notification_status], ['Work Idle Wake-up',state.wakeup] ];
    for (const [label,text] of rows) {
      const item = doc.createElement('div'); const dt = doc.createElement('dt'); const dd = doc.createElement('dd');
      dt.textContent = label; dd.textContent = String(text); item.append(dt,dd); grid.append(item);
    }
    const freshness = doc.getElementById('supervisor-freshness');
    freshness.textContent = state.stale ? 'STALE / آخر حالة محفوظة؛ الحداثة غير مثبتة' : 'آخر نشر منقّى: ' + value.generated_at;
    freshness.classList.toggle('error',state.stale);
    const decision = doc.getElementById('supervisor-decision'); decision.replaceChildren();
    const heading = doc.createElement('h3');heading.textContent = state.needsOwner ? 'Needs Muhannad — قرار مطلوب' : 'ماكو قرار معلق بهذه التجربة';decision.append(heading);
    if (state.needsOwner) {
      const why=doc.createElement('p');why.textContent='السبب: اختبار تصعيد اصطناعي فقط؛ الخطوة التابعة للقرار متوقفة.';decision.append(why);
      const p=doc.createElement('p');p.textContent=value.decision_summary;decision.append(p);
      value.decision_options.forEach((option,i)=>{const row=doc.createElement('p');row.textContent=option+' — '+(value.decision_impact[i]||'');decision.append(row);});
      const stop=doc.createElement('p');stop.textContent=state.stopped ? 'المسار متوقف بأمان بانتظار القرار.' : 'حالة التوقف غير مثبتة.';decision.append(stop);
    }
    const time=doc.createElement('p');time.className='section-note';time.textContent='آخر تحديث: '+value.generated_at;decision.append(time);
  }
  const api={validate,view,render,SOURCE};
  if(typeof module !== 'undefined' && module.exports) module.exports=api;
  if(root && root.document) {
    let last=null;
    async function load(){try{const r=await root.fetch(SOURCE,{cache:'no-cache',credentials:'omit',redirect:'error'});if(!r.ok)throw Error('Unavailable');const text=await r.text();if(text.length>10000)throw Error('Oversize');last=validate(JSON.parse(text));render(last,root.document);}catch{const label=root.document.getElementById('supervisor-freshness');if(label){label.textContent='UNKNOWN / تعذر جلب تحديث؛ لا نفترض اتصالاً أو نشاطاً';label.classList.add('error');}}}
    load();root.setInterval(load,60000);
  }
})(typeof window !== 'undefined' ? window : null);
