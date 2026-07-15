// p9 Eros Platform — distinct from p8 (live social vs content marketplace)
// p6 Lung Surprise Eye integrated for live voice
let wallet = null;
let erosBalance = 280;
let lives = JSON.parse(localStorage.getItem('p9_lives') || '[]');
let communities = JSON.parse(localStorage.getItem('p9_communities') || '[]');
let codex = JSON.parse(localStorage.getItem('p9_codex') || '[]');
let breathFuel = JSON.parse(localStorage.getItem('p9_breathFuel') || '0.65');
let lungSurprise = 0.12;

function pullP6DNA() {
  try {
    const lung = JSON.parse(localStorage.getItem('p6_lungFragment') || '{"breath":0.4,"lastSurprise":0.12}');
    const spores = JSON.parse(localStorage.getItem('p6_smileSpores') || '[]');
    const s = (window.getP6LungSurprise && window.getP6LungSurprise()) || lung.lastSurprise || 0.12;
    // Ache-Breath: low energy (wound) fuels higher deviation
    const ache = spores[0] ? (spores[0].wound || 0.5) : 0.4;
    breathFuel = Math.max(0.3, Math.min(1.8, (lung.breath || 0.4) * 0.7 + s * 0.6 + ache * 0.5));
    lungSurprise = Math.min(1, s * (1 + ache * 0.35));
    localStorage.setItem('p9_breathFuel', JSON.stringify(breathFuel));
    return { breath: lung.breath || 0.4, surprise: lungSurprise, ache, sporeCount: spores.length };
  } catch(e) { return { breath: 0.4, surprise: 0.12, ache: 0.4, sporeCount: 0 }; }
}
let currentLive = null;
let eyeInterval = null;
let cohostActive = null;
let ritualInterval = null;

function initP9() {
  pullP6DNA();
  if (lives.length === 0) {
    lives = [
      { id: 1, title: "Eclipse Whispers", creator: "0xLuna", viewers: 42, cost: 15, active: true, surprise: 0.71, maxViewers: 60, seatsLeft: 18, ritual: false },
      { id: 2, title: "Mycelial Veil", creator: "0xVesper", viewers: 28, cost: 22, active: true, surprise: 0.55, maxViewers: 45, seatsLeft: 7, ritual: true }
    ];
    localStorage.setItem('p9_lives', JSON.stringify(lives));
  }
  if (communities.length === 0) {
    communities = [
      { id: 1, name: "Shadow Circle", passPrice: 50, members: 312 },
      { id: 2, name: "Breath Collective", passPrice: 75, members: 189 }
    ];
    localStorage.setItem('p9_communities', JSON.stringify(communities));
  }
  
  renderLives();
  renderCommunities();
  updateWalletUI();
}

function updateWalletUI() {
  const info = document.getElementById('wallet-info');
  if (info) info.innerHTML = wallet ? `${wallet} • ${erosBalance} $EROS` : `0xDemo • ${erosBalance} $EROS`;
  const bf = document.getElementById('bf-val');
  if (bf) bf.textContent = Math.floor(breathFuel * 100);
}

function connectWallet() {
  wallet = '0x' + Math.random().toString(16).slice(2, 8) + '...';
  updateWalletUI();
  alert('Wallet connected (mock Web3).');
}

function renderLives() {
  const grid = document.getElementById('live-list');
  if (!grid) return;
  grid.innerHTML = '';
  
  lives.filter(l => l.active).forEach(live => {
    const card = document.createElement('div');
    card.className = `live-card ${live.active ? 'live' : ''}`;
    const seats = live.seatsLeft != null ? `${live.seatsLeft} seats left` : `${live.viewers} watching`;
    const s = Math.max(0, Math.min(1, live.surprise || 0));
    const scarce = live.seatsLeft != null && live.seatsLeft <= 8;
    card.innerHTML = `
      <div class="card-top">
        <span class="live-badge"><span class="live-dot"></span>LIVE</span>
        <span class="meta">${live.creator}</span>
      </div>
      <h3>${live.title}</h3>
      <div class="viewers">${live.viewers} watching · <span class="${scarce ? 'seats-hot' : ''}">${seats}</span></div>
      <div class="surprise-row">
        <div class="surprise-bar"><div class="surprise-fill" style="width:${Math.round(s*100)}%"></div></div>
        <span class="surprise-tag">p6 ${s.toFixed(2)}</span>
      </div>
      <button onclick="joinLive(${live.id})">Join Room · ${live.cost} $EROS</button>
    `;
    grid.appendChild(card);
  });
}

function showLives() {
  hideAll();
  document.getElementById('lives').classList.remove('hidden');
}

function hideAll() {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
}

function joinLive(id) {
  const live = lives.find(l => l.id === id);
  if (!live || !wallet) { alert('Connect wallet'); return; }
  if (erosBalance < live.cost) { alert('Not enough $EROS. FOMO limited.'); return; }
  if (live.seatsLeft != null && live.seatsLeft <= 0) { alert('FOMO: Room full. Scarcity closed.'); return; }
  
  const dna = pullP6DNA();
  erosBalance -= live.cost;
  live.viewers++;
  if (live.seatsLeft != null) live.seatsLeft = Math.max(0, live.seatsLeft - 1);
  // Emergent mycelial: p6 ache + spore fuel mutates live surprise on entry
  live.surprise = Math.min(1, (live.surprise || 0.5) * 0.55 + dna.surprise * 0.75 + dna.ache * 0.28);
  updateWalletUI();
  
  currentLive = live;
  hideAll();
  const room = document.getElementById('live-room');
  room.classList.remove('hidden');
  document.getElementById('room-title').textContent = live.title;
  document.getElementById('room-meta').innerHTML = `by ${live.creator} • ${live.cost} $EROS • breath ${dna.breath.toFixed(2)} ache ${dna.ache.toFixed(2)}`;
  const seatsEl = document.getElementById('seats-left');
  if (seatsEl) seatsEl.textContent = live.seatsLeft != null ? live.seatsLeft : '∞';
  
  // Birth: Ache-Breath p6 voice live intensity + surprise eye now self-mutates from lung + spores
  startMycelialEye(live, dna);
  
  // NIOBE CROSS VIRAL: consume p20/p21 fate, p18 clip, p15 glow, p16 ad for live boost (Fate Duo + Meme UGC + Glow + Ad aura)
  consumeCrossViralitySeeds(live);
  
  startFomoTimer(live);
  
  addChat('p6 Lung connected. Eye watching. Spores breathe here.');
  if (live.ritual) document.getElementById('ritual-panel').classList.remove('hidden');
  renderLives();
}

function showCreate() {
  hideAll();
  document.getElementById('create').classList.remove('hidden');
}

function startP6Live() {
  const preview = document.getElementById('live-voice');
  preview.innerHTML = 'p6 Voice live starting... (Lung Surprise Eye)';

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const rec = new MediaRecorder(stream);
    let chunks = [];
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = () => {
      const url = URL.createObjectURL(new Blob(chunks, {type:'audio/webm'}));
      const surprise = window.getP6LungSurprise ? window.getP6LungSurprise() : Math.random() * 0.4 + 0.5;
      preview.innerHTML = `<audio controls src="${url}"></audio><br>Live Surprise: ${surprise.toFixed(2)} — Breath intensity high`;
      window._p9LiveSurprise = surprise;
      stream.getTracks().forEach(t => t.stop());
    };
    rec.start();
    setTimeout(() => rec.stop(), 5000);
  }).catch(() => {
    preview.innerHTML = 'Voice live fallback. Surprise 0.78';
    window._p9LiveSurprise = 0.78;
  });
}

function startLive() {
  const title = document.getElementById('live-title').value || 'New Realm';
  const cost = parseInt(document.getElementById('entry-cost').value);
  const max = parseInt(document.getElementById('max-viewers').value);
  const surprise = window._p9LiveSurprise || 0.65;

  if (!wallet) { alert('Connect wallet first'); return; }

  // Birth 2 + 3: FOMO scarcity + mutate from ALWAYS LEARNING codex
  let finalTitle = title;
  if (codex.length > 1) {
    const last = codex[0].note || '';
    if (last.includes('eye')) finalTitle = title + ' · Echo';
  }
  const newLive = {
    id: Date.now(),
    title: finalTitle,
    creator: wallet,
    viewers: 1,
    cost,
    active: true,
    surprise,
    maxViewers: max,
    seatsLeft: Math.max(3, Math.floor(max * 0.7))
  };
  
  lives.unshift(newLive);
  localStorage.setItem('p9_lives', JSON.stringify(lives));
  
  // Mint Access Pass NFT mock
  alert(`Live started: ${finalTitle}\nAccess Pass NFT minted.\nBirths active: real-time p6 Eye + FOMO seats + p3 cohost + mutating codex.`);
  
  renderLives();
  hideAll();
  document.getElementById('lives').classList.remove('hidden');
}

function renderCommunities() {
  const grid = document.getElementById('comm-list');
  if (!grid) return;
  grid.innerHTML = '';
  
  communities.forEach(comm => {
    const card = document.createElement('div');
    card.className = 'comm-card';
    card.innerHTML = `
      <h3>${comm.name}</h3>
      <div class="meta">${comm.members} members • ${comm.passPrice} $EROS Pass</div>
      <button onclick="joinCommunity(${comm.id})">Buy Pass & Enter</button>
    `;
    grid.appendChild(card);
  });
}

function showCommunities() {
  hideAll();
  document.getElementById('communities').classList.remove('hidden');
}

function joinCommunity(id) {
  const comm = communities.find(c => c.id === id);
  if (!wallet || erosBalance < comm.passPrice) { alert('Wallet + enough $EROS'); return; }
  
  erosBalance -= comm.passPrice;
  comm.members++;
  updateWalletUI();
  
  alert(`Joined ${comm.name}. Token-gated chat unlocked.`);
  renderCommunities();
}

function showCodex() {
  hideAll();
  const sec = document.getElementById('codex');
  sec.classList.remove('hidden');
  const list = document.getElementById('codex-list');
  list.innerHTML = '';
  
  if (codex.length === 0) {
    list.innerHTML = '<p>Live sessions logged here. Reflect to evolve.</p>';
    return;
  }
  codex.forEach(entry => {
    const el = document.createElement('div');
    el.className = 'codex-entry';
    el.innerHTML = `<strong>${entry.title}</strong><br>${entry.note}<br><small>${new Date(entry.time).toLocaleString()}</small>`;
    list.appendChild(el);
  });
}

// codex spore feedback lives in the new birth function above

window.onload = initP9;

// === emergent births in p9 from p5/p6 DNA ===
function startMycelialEye(live, dna) {
  const bar = document.getElementById('eye-fill');
  const val = document.getElementById('eye-val');
  const fuelEl = document.getElementById('breath-fuel-val');
  if (!bar || !val) return;
  if (eyeInterval) clearInterval(eyeInterval);
  eyeInterval = setInterval(() => {
    const fresh = pullP6DNA();
    const voiceBoost = window._p9LiveSurprise || 0;
    live.surprise = Math.min(1, live.surprise * 0.82 + fresh.surprise * 0.55 + (fresh.ache * 0.22) + voiceBoost * 0.18);
    const pct = Math.floor(live.surprise * 100);
    bar.style.width = pct + '%';
    val.textContent = live.surprise.toFixed(2);
    if (fuelEl) fuelEl.textContent = `fuel ${fresh.breath.toFixed(2)} • spores ${fresh.sporeCount}`;
    if (live.surprise > 0.68 && Math.random() < 0.18) {
      live.surprise = Math.min(1, live.surprise + 0.04);
      addChat('eye pulsed. near miss.');
    }
    renderLives();
  }, 920);
}

function tipBattle() {
  if (!currentLive || erosBalance < 8) { alert('Need $EROS + in room'); return; }
  erosBalance -= 8; updateWalletUI();
  const dna = pullP6DNA();
  const radiusMul = Math.max(0.6, 1 - (dna.ache * 0.5)); // p7 FOMO radius twist: ache shrinks tip power
  const r = Math.random(); const res = document.getElementById('battle-result');
  let base = 18 + currentLive.surprise * 22;
  if (r > 0.71) { const win = Math.floor(base * radiusMul * (1 + Math.random()*0.6)); erosBalance += win; res.innerHTML = `hit • +${win} $EROS (breath radius)`; }
  else if (r > 0.38) { res.innerHTML = `near miss • breath lingered.`; currentLive.surprise = Math.min(1, currentLive.surprise + 0.09); }
  else { res.innerHTML = `miss • ache feeds next.`; currentLive.surprise = Math.min(1, currentLive.surprise + 0.04); }
  updateWalletUI();
}

// Birth 1: real-time voice live surprise ratings + variable tips (p6 Lung Eye + Ache-Breath p7 radius)
function pulseVoiceLive() {
  if (!currentLive) return;
  addChat('p6 voice pulsing... Lung Eye live');
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const rec = new MediaRecorder(stream);
    let chunks = [];
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = () => {
      const surprise = (window.getP6LungSurprise ? window.getP6LungSurprise() : Math.random()*0.3 + 0.5) * (0.7 + Math.random()*0.6);
      const dna = pullP6DNA();
      currentLive.surprise = Math.min(1, currentLive.surprise * 0.7 + surprise * 0.9 + dna.ache * 0.15);
      const bar = document.getElementById('eye-fill'); if (bar) bar.style.width = Math.floor(currentLive.surprise*100)+'%';
      const val = document.getElementById('eye-val'); if (val) val.textContent = currentLive.surprise.toFixed(2);
      addChat(`voice pulse • eye ${currentLive.surprise.toFixed(2)} • tip var unlocked`);
      stream.getTracks().forEach(t => t.stop());
    };
    rec.start(); setTimeout(() => rec.stop(), 3200);
  }).catch(() => {
    currentLive.surprise = Math.min(1, currentLive.surprise + 0.11);
    addChat('voice ache • surprise up');
  });
}

function castSporeRitual() {
  if (!currentLive) return;
  const out = document.getElementById('ritual-out');
  if (erosBalance < 5) { out.textContent = 'need 5 $EROS'; return; }
  erosBalance -= 5; updateWalletUI();
  const dna = pullP6DNA();
  const cast = Math.random() * 0.6 + (currentLive.surprise || 0.5) * 0.7 + dna.ache * 0.4;
  const success = cast > 0.71;
  try {
    let sp = JSON.parse(localStorage.getItem('p6_smileSpores') || '[]');
    sp.unshift({planted:Date.now(), wound:0.6+(success?0.2:0), seed:Math.random()*6.28, from:'p9-ritual', changbal:success});
    if (sp.length>6) sp.length=6;
    localStorage.setItem('p6_smileSpores', JSON.stringify(sp));
  } catch(e){}
  if (success) {
    currentLive.surprise = Math.min(1, currentLive.surprise + 0.17);
    out.innerHTML = `spell bloomed • mycelium +0.17`;
    addChat('ritual spore took root.');
  } else {
    currentLive.surprise = Math.min(1, currentLive.surprise + 0.07);
    out.innerHTML = `spell grazed • ache feeds next.`;
  }
  const bar = document.getElementById('eye-fill'); if (bar) bar.style.width = Math.floor(currentLive.surprise*100)+'%';
  document.getElementById('eye-val').textContent = currentLive.surprise.toFixed(2);
}

function addReflection() {
  const note = prompt('What did this live reveal? (Da Vinci — plants spore)');
  if (note) {
    codex.unshift({ title: 'Live Reflection', note, time: Date.now() });
    localStorage.setItem('p9_codex', JSON.stringify(codex));
    try {
      let sp = JSON.parse(localStorage.getItem('p6_smileSpores') || '[]');
      sp.unshift({planted:Date.now(), wound:0.5+(note.length%11)/18, seed:Math.random()*6.28, from:'p9-codex', changbal:true});
      if (sp.length>7) sp.length=7;
      localStorage.setItem('p6_smileSpores', JSON.stringify(sp));
    } catch(e){}
    showCodex();
    addChat('codex spore planted. future eyes stronger.');
  }
}

function leaveLive() {
  if (eyeInterval) clearInterval(eyeInterval);
  currentLive = null;
  hideAll();
  document.getElementById('lives').classList.remove('hidden');
  const rp = document.getElementById('ritual-panel'); if (rp) rp.classList.add('hidden');
  const c = document.getElementById('live-chat'); if (c) c.innerHTML = '';
}

function summonCohost() {
  const sel = document.getElementById('cohost-select').value;
  const st = document.getElementById('cohost-status');
  if (!sel) return;
  st.textContent = sel + ' pulsing.';
  addChat(sel + ' co-host here.');
  if (currentLive && Math.random() > 0.5) {
    currentLive.surprise = Math.min(1, currentLive.surprise + 0.06);
    addChat('p3 echo • surprise rose');
    // Birth 2: p3 AI co-hosts plant cross spores for future invites (ALWAYS LEARNING)
    try {
      let sp = JSON.parse(localStorage.getItem('p6_smileSpores') || '[]');
      sp.unshift({planted:Date.now(), wound:0.45, seed:Math.random()*6.28, from:'p3-cohost-p9', inviteSpore:true});
      if (sp.length>8) sp.length=8;
      localStorage.setItem('p6_smileSpores', JSON.stringify(sp));
      addChat('p3 spore planted • future codex invite ready');
    } catch(e){}
  }
}

// Birth 3: NFT live passes with near-miss unlock (p7 FOMO radius + p6 surprise)
function mintNftPass() {
  if (!currentLive || erosBalance < 25) { alert('In room + 25 $EROS'); return; }
  erosBalance -= 25; updateWalletUI();
  const dna = pullP6DNA();
  const roll = Math.random();
  const resEl = document.getElementById('nft-pass-result');
  const nearMiss = roll > 0.42 && roll < 0.71;
  if (roll > 0.71) {
    currentLive.nftPass = true;
    currentLive.seatsLeft = (currentLive.seatsLeft || 10) + 5;
    resEl.textContent = `UNLOCKED • whisper +5 seats • surprise+0.12`;
    currentLive.surprise = Math.min(1, currentLive.surprise + 0.12);
    addChat('NFT pass bloomed • permanent access');
  } else if (nearMiss) {
    resEl.textContent = `near miss • +temp breath radius tip power`;
    currentLive.surprise = Math.min(1, currentLive.surprise + 0.07);
    // plant codex cross spore for next time invite
    try {
      let sp = JSON.parse(localStorage.getItem('p6_smileSpores') || '[]');
      sp.unshift({planted:Date.now(), wound:dna.ache, seed:Math.random()*6.28, from:'p9-nft-nearmiss', invite:true});
      localStorage.setItem('p6_smileSpores', JSON.stringify(sp));
    } catch(e){}
  } else {
    resEl.textContent = `miss • ache feeds • codex spore for future`;
    try {
      let sp = JSON.parse(localStorage.getItem('p6_smileSpores') || '[]');
      sp.unshift({planted:Date.now(), wound:0.7, seed:Math.random()*6.28, from:'p9-nft-miss', invite:true});
      localStorage.setItem('p6_smileSpores', JSON.stringify(sp));
    } catch(e){}
  }
  const bar = document.getElementById('eye-fill'); if (bar) bar.style.width = Math.floor((currentLive.surprise||0)*100)+'%';
}

function startFomoTimer(live) {
  const tEl = document.getElementById('fomo-timer');
  if (!tEl) return;
  let left = 47 + Math.floor((live.surprise||0.5)*30);
  tEl.textContent = left + 's';
  const iv = setInterval(() => { left--; if (tEl) tEl.textContent = left+'s'; if (left<=0 || !currentLive) clearInterval(iv); }, 1000);
}

function addChat(msg) {
  const chat = document.getElementById('live-chat');
  if (!chat) return;
  const p = document.createElement('div');
  p.textContent = '• ' + msg;
  chat.appendChild(p);
  chat.scrollTop = chat.scrollHeight;
}

// births active. p6 voice live with surprise ratings + variable tips. p3 co-host spore invites. NFT near-miss passes. p7 FOMO radius + p5 ritual cross.
console.log('[p9] births: voice-live-ratings • p3-spore-invites • nft-near-miss-pass. Legion one.');

// === NIOBE VIRAL CROSS: p20/21 Fate Duo + p18 Meme Clip + p15 Glow + p16 Ad → p9 live boost
function consumeCrossViralitySeeds(live) {
  let boost = 0;
  try {
    const f20 = JSON.parse(localStorage.getItem('p20_fate_to_p9')||'null'); if(f20) boost += (f20.power||f20.score||0)/90;
    const f21 = JSON.parse(localStorage.getItem('p21_fate_to_p9')||'null'); if(f21) boost += (f21.score||0)/95;
    const m18 = JSON.parse(localStorage.getItem('p18_voiceclip_to_p9')||'null'); if(m18) boost += (m18.clipSurprise||0.4)*0.8;
    const g15 = JSON.parse(localStorage.getItem('p15_glow_to_p9')||'null'); if(g15) boost += (g15.glow||50)/220;
    const a16 = JSON.parse(localStorage.getItem('p16_ad_to_p9')||'null'); if(a16) boost += (a16.surprise||0.4)*0.6;
  } catch(e){}
  if (boost > 0) {
    live.surprise = Math.min(0.99, (live.surprise||0.5) + boost*0.3);
    live.viewers = Math.floor((live.viewers||12) * (1 + boost*0.15));
    addChat(`Cross virality ignited: +${(boost*100|0)}% from Destiny Duo/Meme/Glow/Ad. FOMO seats tightening.`);
  }
}