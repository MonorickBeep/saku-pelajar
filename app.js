const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const KEY='saku-pelajar-v1';
let data=JSON.parse(localStorage.getItem(KEY)||'{"transactions":[],"goals":[]}');
const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n||0);
const today=()=>new Date().toISOString().slice(0,10);
const monthKey=()=>today().slice(0,7);
function save(){localStorage.setItem(KEY,JSON.stringify(data));render()}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function iconFor(tx){if(tx.type==='income')return '↗';return ({Makanan:'☕',Transportasi:'🚌',Sekolah:'📚',Hiburan:'🎧',Tabungan:'🐷'})[tx.category]||'↘'}
function txHTML(tx){return `<div class="transaction"><div class="tx-icon ${tx.type}">${iconFor(tx)}</div><div class="tx-info"><b>${escapeHTML(tx.title)}</b><small>${escapeHTML(tx.category)} · ${new Date(tx.date+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</small></div><div class="tx-value ${tx.type}">${tx.type==='income'?'+':'−'}${rupiah(tx.amount)}</div></div>`}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(){
 const current=data.transactions.filter(t=>t.date.startsWith(monthKey()));
 const inc=current.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount,0);
 const out=current.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount,0);
 const balance=data.transactions.reduce((a,t)=>a+(t.type==='income'?t.amount:-t.amount),0);
 $('#balance').textContent=rupiah(balance);$('#income').textContent=rupiah(inc);$('#expense').textContent=rupiah(out);
 $('#legendIncome').textContent=rupiah(inc);$('#legendExpense').textContent=rupiah(out);
 const pct=inc+out?Math.round(out/(inc+out)*100):0;$('#spentPercent').textContent=pct+'%';
 $('#donut').style.background=`conic-gradient(#f08a70 ${pct*3.6}deg,#45c2a2 ${pct*3.6}deg 360deg)`;
 const sorted=[...data.transactions].sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
 $('#recentList').innerHTML=sorted.slice(0,5).map(txHTML).join('')||'<div class="empty-state">Belum ada transaksi. Catat uang masuk atau keluar pertamamu.</div>';
 const filter=$('#filterType')?.value||'all';
 $('#allList').innerHTML=sorted.filter(t=>filter==='all'||t.type===filter).map(txHTML).join('')||'<div class="empty-state">Belum ada catatan untuk kategori ini.</div>';
 renderGoals();
}
function renderGoals(){
 const html=data.goals.map(g=>{const pct=Math.min(100,Math.round(g.saved/g.target*100));return `<article class="goal-card"><div class="goal-card-top"><span class="goal-emoji">🎯</span><button class="mini-btn" data-add-saving="${g.id}">＋ Tambah tabungan</button></div><h3>${escapeHTML(g.name)}</h3><p>Pelan-pelan, yang penting konsisten.</p><div class="goal-numbers"><span>${rupiah(g.saved)} terkumpul</span><b>${pct}%</b></div><div class="progress"><span style="width:${pct}%"></span></div><div class="goal-numbers"><span>Target ${rupiah(g.target)}</span><span>${rupiah(Math.max(0,g.target-g.saved))} lagi</span></div></article>`}).join('');
 $('#goalList').innerHTML=html||'<div class="panel empty-state">Belum ada target tabungan. Mulai dari sesuatu yang ingin kamu capai.</div>';
 const g=data.goals[0];$('#goalPreview').innerHTML=g?`<span class="goal-emoji">🎯</span><div style="flex:1"><b>${escapeHTML(g.name)}</b><p>${rupiah(g.saved)} dari ${rupiah(g.target)} terkumpul</p></div><b style="color:#5b75e8">${Math.min(100,Math.round(g.saved/g.target*100))}%</b>`:'<span class="goal-emoji">🎯</span><div><b>Belum ada target</b><p>Buat target kecil supaya menabung terasa lebih terarah.</p></div>';
}
function showView(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));$$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===id));$('#pageTitle').textContent=({overview:'Ringkasan',transactions:'Transaksi',goals:'Target tabungan'})[id];}
$$('.nav-item').forEach(n=>n.addEventListener('click',()=>showView(n.dataset.view)));
$$('[data-goto]').forEach(n=>n.addEventListener('click',()=>showView(n.dataset.goto)));
function open(id){$('#'+id).showModal()}
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.close).close()));
$('#addTop').onclick=$('#addTransaction').onclick=()=>{ $('#txDate').value=today();open('transactionDialog') };
$('#addGoal').onclick=()=>open('goalDialog');
$('#filterType').onchange=render;
$('#transactionForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget);data.transactions.push({id:Date.now(),type:fd.get('type'),title:$('#txTitle').value.trim(),amount:Number($('#txAmount').value),category:$('#txCategory').value,date:$('#txDate').value});save();e.currentTarget.reset();$('#txDate').value=today();$('#transactionDialog').close();toast('Transaksi berhasil dicatat')});
$('#goalForm').addEventListener('submit',e=>{e.preventDefault();data.goals.push({id:Date.now(),name:$('#goalName').value.trim(),target:Number($('#goalAmount').value),saved:Number($('#goalSaved').value)});save();e.currentTarget.reset();$('#goalDialog').close();toast('Target tabungan dibuat')});
$('#goalList').addEventListener('click',e=>{const b=e.target.closest('[data-add-saving]');if(!b)return;const g=data.goals.find(x=>x.id===Number(b.dataset.addSaving));const amount=Number(prompt(`Tambah tabungan untuk "${g.name}" (Rp):`));if(Number.isFinite(amount)&&amount>0){g.saved+=amount;save();toast('Tabungan diperbarui')}});
$('#todayLabel').textContent=new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
$('#txDate').value=today();render();