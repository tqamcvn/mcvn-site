// ratingsV4: [email, ISO date, week, good_cnt, good_bad_cnt, channel, usertype].
let quarterlyData = null, quarterlyLoading = false;
function parseQuarterMonthly(tsv, at) {
  const lines = tsv.trim().split(/\r?\n/).map(l=>l.split('\t'));
  const required=['report_month','agent_email','good_cnt','bad_cnt'];
  const hi=lines.findIndex(row=>required.every(k=>row.map(v=>v.trim().toLowerCase()).includes(k)));
  if(hi<0) throw Error('Monthly thiếu cột report_month, agent_email, good_cnt hoặc bad_cnt');
  const header=lines[hi].map(v=>v.trim().toLowerCase()), col=k=>header.indexOf(k);
  const number=s=>String(s??'').trim()===''?NaN:Number(String(s).replace(/,/g,''));
  const ratingsV4=[]; let rejected=0;
  lines.slice(hi+1).forEach(r=>{
    if(r.every(v=>!v.trim()))return;
    const email=(r[col('agent_email')]||'').trim().toLowerCase();
    const month=quarterMonth(r[col('report_month')]);
    const good=number(r[col('good_cnt')]),bad=number(r[col('bad_cnt')]);
    if(!email||!month||!Number.isFinite(good)||!Number.isFinite(bad)||good<0||bad<0){rejected++;return;}
    if(col('agent_company')>=0 && (r[col('agent_company')]||'').trim()!=='VN - BPO - MCVN')return;
    ratingsV4.push([email,month+'-01','',good,good+bad,r[col('channel_name')],r[col('shopee_user_type')]]);
  });
  return {ratingsV4,ratingsUpdatedAt:at,rejected};
}
function quarterMonth(date) {
  const s = String(date || '').trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return m[1] + '-' + m[2];
  m = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(s);
  return m ? m[3] + '-' + m[2].padStart(2, '0') : null;
}
function quarterDate(date) {
  const s = String(date || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(s);
  return m ? `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` : '';
}
function quarterLabel(m) { return 'Th' + Number(m.slice(5)) + '/' + m.slice(0,4); }
function quarterSelected() { return [0,1,2].map(i => document.getElementById('q-month-'+i)?.value || ''); }
async function loadQuarterly(force = false) {
  if (quarterlyLoading) return;
  if (quarterlyData && !force) { renderQuarterly(); return; }
  quarterlyLoading = true;
  const status = document.getElementById('q-status');
  status.textContent = 'Đang tải số Good / Bad theo tháng…';
  try {
    const response = await jsonpGet('monthly');
    if (!response?.ok) throw Error(response?.error||'Không đọc được nguồn Monthly');
    const data = parseQuarterMonthly(response.tsv||'',response.at);
    if (!Array.isArray(data.ratingsV4)) throw Error('Nguồn thiếu Good / tổng Good+Bad');
    const available = [...new Set(data.ratingsV4.map(r => quarterMonth(r[1])).filter(Boolean))].sort();
    if (!available.length) throw Error('Nguồn chưa có dữ liệu rating');
    // Keep the report usable when the exporter only retains recent months.
    // Missing months must never be treated as zero or silently omitted from quarter CSAT.
    const end = available[available.length-1];
    const first = new Date(Number(available[0].slice(0,4)),Number(available[0].slice(5))-3,1);
    const last = new Date(Number(end.slice(0,4)),Number(end.slice(5))-1,1);
    const months = [];
    for (let d = new Date(first); d <= last; d.setMonth(d.getMonth()+1)) months.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));
    const keep = quarterSelected();
    quarterlyData = data;
    const controls = document.getElementById('q-months');
    controls.replaceChildren();
    [0,1,2].forEach(i => {
      const label = document.createElement('label');
      label.textContent = 'Tháng ' + (i+1) + ' ';
      const select = document.createElement('select');
      select.id = 'q-month-'+i;
      select.style.cssText = 'background:var(--s2);color:var(--text);border:1px solid var(--bdr);padding:8px;border-radius:6px';
      months.forEach(m => select.add(new Option(quarterLabel(m)+(available.includes(m)?'':' · chưa có rating'),m)));
      select.value = months.includes(keep[i]) ? keep[i] : months[months.length-3+i];
      select.onchange = renderQuarterly;
      label.append(select); controls.append(label);
    });
    renderQuarterly();
  } catch (error) {
    status.textContent = 'Không tải được dữ liệu: ' + error.message + '. Bấm Tải lại để thử lại.';
    if (!quarterlyData) document.getElementById('q-content').hidden = true;
  } finally { quarterlyLoading = false; }
}
function buildQuarterly(data, snapshots, months) {
  const selected = [...months].sort();
  const available = new Set(data.ratingsV4.map(r=>quarterMonth(r[1])).filter(Boolean));
  const missing = selected.filter(m=>!available.has(m));
  const latest = new Map();
  // Use the latest Agent List record within the selected months for each CS.
  snapshots.forEach(a => {
    const date = quarterDate(a.date), month = quarterMonth(a.date);
    if (!selected.includes(month) || !a.email) return;
    const email = a.email.trim().toLowerCase();
    if (!latest.has(email) || latest.get(email).date <= date) latest.set(email, {...a,email,date});
  });
  const sums = new Map();
  let invalid = data.rejected||0;
  data.ratingsV4.forEach(r => {
    const month = quarterMonth(r[1]);
    if (!selected.includes(month)) return;
    const good = Number(r[3]), total = Number(r[4]);
    if (r[3] == null || r[4] == null || !Number.isFinite(good) || !Number.isFinite(total) || good < 0 || total < good) { invalid++; return; }
    const key = String(r[0]).trim().toLowerCase() + '|' + month;
    const sum = sums.get(key) || {good:0,total:0};
    sum.good += good; sum.total += total; sums.set(key,sum);
  });
  const agents = [...latest.values()];
  function stats(list, period) {
    let good = 0, total = 0;
    list.forEach(a => period.forEach(m => { const s = sums.get(a.email+'|'+m); if(s) {good+=s.good;total+=s.total;} }));
    return {good,bad:total-good,total,csat:total ? good/total*100 : null};
  }
  const prev = selected[1], current = selected[2];
  function delta(a) {
    const c = stats([a],[current]).csat, p = stats([a],[prev]).csat;
    return c == null || p == null ? null : c-p;
  }
  const rows = [];
  function add(label, list, depth) {
    const c = stats(list,[current]).csat, p = stats(list,[prev]).csat;
    const quarter = stats(list,selected);
    if (missing.length) quarter.csat = null;
    rows.push({label,depth,agents:list.length,quarter,monthly:selected.slice().reverse().map(m=>stats(list,[m])),delta:c==null||p==null?null:c-p});
  }
  function group(label,list) {
    add(label,list,1);
    add('Giảm MoM',list.filter(a=>delta(a)<0),2);
    add('Tăng MoM',list.filter(a=>delta(a)>0),2);
  }
  add('Total CS',agents,0);
  group('CS xuất hiện nhưng không lặp lại',agents.filter(a=>a.repeated===0));
  const max = Math.max(6,...agents.map(a=>a.repeated));
  for(let i=1;i<=max;i++) group('Lần '+i,agents.filter(a=>a.repeated===i));
  return {rows,agents,selected,invalid,missing};
}
setInterval(()=>{if(quarterlyData)loadQuarterly(true);},30*60*1000);
function renderQuarterly() {
  if (!quarterlyData) return;
  const months = quarterSelected(), content = document.getElementById('q-content'), status = document.getElementById('q-status');
  if (new Set(months).size !== 3 || months.some(m=>!m)) {
    content.hidden = true; status.textContent = 'Vui lòng chọn 3 tháng khác nhau.'; return;
  }
  const report = buildQuarterly(quarterlyData,G.agentSnaps,months);
  if (!report.agents.length) {
    content.hidden = true;
    status.textContent = 'Chưa có Agent List có ngày thuộc 3 tháng đã chọn. Tải hoặc nhập Agent List để phân nhóm Repeated.';
    return;
  }
  const cell = s => `<td style="color:${cc(s.csat)};font-weight:700" title="Good: ${s.good} · Bad: ${s.bad}">${s.csat==null?'—':s.csat.toFixed(1)+'%'}</td>`;
  document.getElementById('q-table').innerHTML = '<thead><tr><th style="text-align:left;min-width:230px">Repeated Agents</th><th>Agents</th><th>MoM (đpt)</th><th>CSAT Quý</th>' + report.selected.slice().reverse().map(m=>'<th>'+quarterLabel(m)+'</th>').join('') + '</tr></thead><tbody>' + report.rows.map(r=>`<tr class="${r.depth===0?'grp0':r.depth===1?'grp1':'sub'}"><td>${r.label}</td><td><b>${r.agents||'—'}</b></td><td>${r.delta==null?'—':`<span class="${r.delta>=0?'wow-pos':'wow-neg'}">${r.delta>0?'+':''}${r.delta.toFixed(1)} ${r.delta>0?'▲':r.delta<0?'▼':''}</span>`}</td>${report.missing.length?'<td style="color:var(--t3)">Chưa đủ dữ liệu</td>':cell(r.quarter)}${r.monthly.map(cell).join('')}</tr>`).join('') + '</tbody>';
  quarterlyData.report = report;
  content.hidden = false;
  status.textContent = report.selected.map(quarterLabel).join(' · ') + (report.missing.length ? ' · Thiếu Good/Bad theo agent: '+report.missing.map(quarterLabel).join(', ')+'. Cần bổ sung các tháng này vào nguồn CSAT để tính đủ Quý.' : '') + (report.invalid ? ' · Bỏ qua '+report.invalid+' dòng rating không hợp lệ' : '');
  document.getElementById('q-note').textContent = 'Nhóm Repeated theo bản ghi Agent List mới nhất của mỗi CS trong các tháng chọn. MoM = '+quarterLabel(report.selected[2])+' − '+quarterLabel(report.selected[1])+', đơn vị điểm phần trăm. CSAT cộng Good và Bad trước khi chia; không có rating hiển thị —. CS không đổi hoặc thiếu rating so sánh vẫn nằm trong nhóm chính.';
  document.getElementById('q-stamp').textContent = 'Dữ liệu CSAT cập nhật: ' + (quarterlyData.ratingsUpdatedAt || quarterlyData.lastUpdatedText || '—');
}
function copyQuarterly() {
  if (document.getElementById('q-content').hidden || !quarterlyData?.report) {toast('Chưa có report để copy');return;}
  const report = quarterlyData.report, pct=v=>v==null?'—':v.toFixed(1)+'%';
  const lines = [['Repeated Agents','Agents','MoM (đpt)','CSAT Quý',...report.selected.slice().reverse().map(quarterLabel)].join('\t')];
  report.rows.forEach(r=>lines.push(['  '.repeat(r.depth)+r.label,r.agents,r.delta==null?'—':r.delta.toFixed(1),pct(r.quarter.csat),...r.monthly.map(s=>pct(s.csat))].join('\t')));
  copyText(lines.join('\n'));
}
