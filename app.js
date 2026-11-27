const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const KEY='saku-pelajar-v1';
let data=JSON.parse(localStorage.getItem(KEY)||'{"transactions":[],"goals":[]}');
const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n||0);
function parseMoney(raw){
 const s=String(raw??'').trim().toLowerCase().replace(/\s+/g,'').replace(/rp/gi,'').replace(/\./g,'').replace(/,/g,'.');
 if(!s)return NaN;
 let multiplier=1000;
 let number=s;
 if(s.endsWith('juta')){multiplier=1000000;number=s.slice(0,-4)}
 else if(s.endsWith('jt')){multiplier=1000000;number=s.slice(0,-2)}
 else if(s.endsWith('ribu')){multiplier=1000;number=s.slice(0,-4)}
 else if(s.endsWith('rb')){multiplier=1000;number=s.slice(0,-2)}
 else if(s.endsWith('k')){multiplier=1000;number=s.slice(0,-1)}
 else if(/[0-9]/.test(s) && !/[a-z]/.test(s)){multiplier=1000}
 else {return NaN}
 const value=Number(number);
 return Number.isFinite(value)&&value>=0?Math.round(value*multiplier):NaN;
}

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
 const html=data.goals.map(g=>{const pct=Math.min(100,Math.round(g.saved/g.target*100));return `<article class="goal-card"><div class="goal-card-top"><span class="goal-emoji">🎯</span><div class="goal-tools"><button class="mini-btn" data-edit-goal="${g.id}">Edit</button><button class="mini-btn danger-btn" data-delete-goal="${g.id}">Hapus</button></div></div><button class="mini-btn saving-btn" data-add-saving="${g.id}">＋ Tambah tabungan</button><h3>${escapeHTML(g.name)}</h3><p>Pelan-pelan, yang penting konsisten.</p><div class="goal-numbers"><span>${rupiah(g.saved)} terkumpul</span><b>${pct}%</b></div><div class="progress"><span style="width:${pct}%"></span></div><div class="goal-numbers"><span>Target ${rupiah(g.target)}</span><span>${rupiah(Math.max(0,g.target-g.saved))} lagi</span></div></article>`}).join('');
 $('#goalList').innerHTML=html||'<div class="panel empty-state">Belum ada target tabungan. Mulai dari sesuatu yang ingin kamu capai.</div>';
 const g=data.goals[0];$('#goalPreview').innerHTML=g?`<span class="goal-emoji">🎯</span><div style="flex:1"><b>${escapeHTML(g.name)}</b><p>${rupiah(g.saved)} dari ${rupiah(g.target)} terkumpul</p></div><b style="color:#5b75e8">${Math.min(100,Math.round(g.saved/g.target*100))}%</b>`:'<span class="goal-emoji">🎯</span><div><b>Belum ada target</b><p>Buat target kecil supaya menabung terasa lebih terarah.</p></div>';
}
function showView(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));$$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===id));$('#pageTitle').textContent=({overview:'Ringkasan',transactions:'Transaksi',goals:'Target tabungan'})[id];}
$$('.nav-item').forEach(n=>n.addEventListener('click',()=>showView(n.dataset.view)));
$$('[data-goto]').forEach(n=>n.addEventListener('click',()=>showView(n.dataset.goto)));
function open(id){$('#'+id).showModal()}
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.close).close()));
$('#addTop').onclick=$('#addTransaction').onclick=()=>{ $('#txDate').value=today();open('transactionDialog') };
$('#addGoal').onclick=()=>{
 editingGoalId=null;
 $('#goalForm').reset();
 $('#goalSaved').value='0';
 open('goalDialog');
};
$('#filterType').onchange=render;
$('#transactionForm').addEventListener('submit',e=>{
 e.preventDefault();
 const amount=parseMoney($('#txAmount').value);
 if(!Number.isFinite(amount)||amount<=0){toast('Nominal tidak valid. Contoh: 15, 150, atau 1jt');return}
 const fd=new FormData(e.currentTarget);
 data.transactions.push({id:Date.now(),type:fd.get('type'),title:$('#txTitle').value.trim(),amount,category:$('#txCategory').value,date:$('#txDate').value});
 save();e.currentTarget.reset();$('#txDate').value=today();$('#transactionDialog').close();toast('Transaksi berhasil dicatat');
});
let editingGoalId=null;
$('#goalForm').addEventListener('submit',e=>{
 e.preventDefault();
 const target=parseMoney($('#goalAmount').value);
 const saved=parseMoney($('#goalSaved').value);
 if(!Number.isFinite(target)||target<=0||!Number.isFinite(saved)){toast('Nominal belum valid. Contoh: 15, 150, atau 1jt');return}
 const name=$('#goalName').value.trim();
 if(editingGoalId!==null){
  const goal=data.goals.find(g=>g.id===editingGoalId);
  if(goal){goal.name=name;goal.target=target;goal.saved=saved}
  toast('Target berhasil diperbarui');
 }else{
  data.goals.push({id:Date.now(),name,target,saved});
  toast('Target tabungan dibuat');
 }
 editingGoalId=null;
 save();e.currentTarget.reset();$('#goalSaved').value='0';$('#goalDialog').close();
});

$('#goalList').addEventListener('click',e=>{
 const add=e.target.closest('[data-add-saving]');
 const edit=e.target.closest('[data-edit-goal]');
 const del=e.target.closest('[data-delete-goal]');
 if(add){
  const g=data.goals.find(x=>x.id===Number(add.dataset.addSaving));
  const raw=prompt(`Tambah tabungan untuk "${g.name}". Contoh: 15 = Rp15.000, 1jt = Rp1.000.000`);
  if(raw===null)return;
  const amount=parseMoney(raw);
  if(Number.isFinite(amount)&&amount>0){g.saved+=amount;save();toast('Tabungan diperbarui')}
  else toast('Nominal tidak valid');
 }
 if(edit){
  const g=data.goals.find(x=>x.id===Number(edit.dataset.editGoal));
  if(!g)return;
  editingGoalId=g.id;
  $('#goalName').value=g.name;
  $('#goalAmount').value=String(g.target/1000);
  $('#goalSaved').value=String(g.saved/1000);
  $('#goalDialog').showModal();
 }
 if(del){
  const id=Number(del.dataset.deleteGoal);
  const g=data.goals.find(x=>x.id===id);
  if(g&&confirm(`Hapus target "${g.name}"?`)){data.goals=data.goals.filter(x=>x.id!==id);save();toast('Target dihapus')}
 }
});
$('#todayLabel').textContent=new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
$('#txDate').value=today();render();