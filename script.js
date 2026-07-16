// Lumen Live — a live social platform for creators (client-only demo).
// Live Energy meter reacts to real mic input and room activity.
let wallet = null;
let erosBalance = 280;
let lives = JSON.parse(localStorage.getItem('lumen_lives') || '[]');
let communities = JSON.parse(localStorage.getItem('lumen_communities') || '[]');
let codex = JSON.parse(localStorage.getItem('lumen_journal') || '[]');
let breathFuel = JSON.parse(localStorage.getItem('lumen_energy') || '0.65');
let liveEnergy = 0.12;

// Derive a local "live energy" value from stored session mood + mic activity.
function pullEnergy() {
  try {
    const mood = JSON.parse(localStorage.getItem('lumen_mood') || '{"warmth":0.4,"lastPeak":0.12}');
    const s = (window.getMicEnergy && window.getMicEnergy()) || mood.lastPeak || 0.12;
    const spark = 0.4;
    breathFuel = Math.max(0.3, Math.min(1.8, (mood.warmth || 0.4) * 0.7 + s * 0.6 + spark * 0.5));
    liveEnergy = Math.min(1, s * (1 + spark * 0.35));
    localStorage.setItem('lumen_energy', JSON.stringify(breathFuel));
    return { warmth: mood.warmth || 0.4, energy: liveEnergy, spark, momentCount: 0 };
  } catch(e) { return { warmth: 0.4, energy: 0.12, spark: 0.4, momentCount: 0 }; }
}
let currentLive = null;
let eyeInterval = null;
let cohostActive = null;
let ritualInterval = null;

function initApp() {
  pullEnergy();
  if (lives.length === 0) {
    lives = [
      { id: 1, title: "Eclipse Whispers", creator: "Luna", viewers: 42, cost: 15, active: true, surprise: 0.71, maxViewers: 60, seatsLeft: 18, ritual: false },
      { id: 2, title: "Late Night Veil", creator: "Vesper", viewers: 28, cost: 22, active: true, surprise: 0.55, maxViewers: 45, seatsLeft: 7, ritual: true }
    ];
    localStorage.setItem('lumen_lives', JSON.stringify(lives));
  }
  if (communities.length === 0) {
    communities = [
      { id: 1, name: "Shadow Circle", passPrice: 50, members: 312 },
      { id: 2, name: "Night Owls", passPrice: 75, members: 189 }
    ];
    localStorage.setItem('lumen_communities', JSON.stringify(communities));
  }

  renderLives();
  renderCommunities();
  updateWalletUI();
}

function updateWalletUI() {
  const info = document.getElementById('wallet-info');
  if (info) info.innerHTML = wallet ? `${wallet} • ${erosBalance} Sparks` : `Guest • ${erosBalance} Sparks`;
  const bf = document.getElementById('bf-val');
  if (bf) bf.textContent = Math.floor(breathFuel * 100);
}

function connectWallet() {
  wallet = 'you_' + Math.random().toString(16).slice(2, 6);
  updateWalletUI();
  alert('Signed in (demo account).');
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
        <span class="surprise-tag">energy ${s.toFixed(2)}</span>
      </div>
      <button onclick="joinLive(${live.id})">Join Room · ${live.cost} Sparks</button>
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
  if (!live || !wallet) { alert('Sign in first'); return; }
  if (erosBalance < live.cost) { alert('Not enough Sparks.'); return; }
  if (live.seatsLeft != null && live.seatsLeft <= 0) { alert('Room full — seats sold out.'); return; }

  const dna = pullEnergy();
  erosBalance -= live.cost;
  live.viewers++;
  if (live.seatsLeft != null) live.seatsLeft = Math.max(0, live.seatsLeft - 1);
  // Live energy shifts a little as new people arrive and the mood warms.
  live.surprise = Math.min(1, (live.surprise || 0.5) * 0.55 + dna.energy * 0.75 + dna.spark * 0.28);
  updateWalletUI();

  currentLive = live;
  hideAll();
  const room = document.getElementById('live-room');
  room.classList.remove('hidden');
  document.getElementById('room-title').textContent = live.title;
  document.getElementById('room-meta').innerHTML = `by ${live.creator} • ${live.cost} Sparks • warmth ${dna.warmth.toFixed(2)}`;
  const seatsEl = document.getElementById('seats-left');
  if (seatsEl) seatsEl.textContent = live.seatsLeft != null ? `${live.seatsLeft} seats left` : 'open';

  startLiveEnergy(live, dna);
  consumeCrossViralitySeeds(live);
  startFomoTimer(live);

  live.pot = live.pot || 0;
  reflectRoomStats(live);
  addChat('Welcome to the room. Say hi in chat!', null, 'sys');
  startAudience(live);
  if (live.ritual) document.getElementById('ritual-panel').classList.remove('hidden');
  renderLives();
}

function showCreate() {
  hideAll();
  document.getElementById('create').classList.remove('hidden');
}

function startMicCheck() {
  const preview = document.getElementById('live-voice');
  preview.innerHTML = 'Testing mic… (Live Energy Meter)';

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const rec = new MediaRecorder(stream);
    let chunks = [];
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = () => {
      const url = URL.createObjectURL(new Blob(chunks, {type:'audio/webm'}));
      const energy = window.getMicEnergy ? window.getMicEnergy() : Math.random() * 0.4 + 0.5;
      preview.innerHTML = `<audio controls src="${url}"></audio><br>Live Energy: ${energy.toFixed(2)} — mic sounds great`;
      window._liveEnergy = energy;
      stream.getTracks().forEach(t => t.stop());
    };
    rec.start();
    setTimeout(() => rec.stop(), 5000);
  }).catch(() => {
    preview.innerHTML = 'Mic unavailable — using demo energy 0.78';
    window._liveEnergy = 0.78;
  });
}

function startLive() {
  const title = document.getElementById('live-title').value || 'New Room';
  let cost = parseInt(document.getElementById('entry-cost').value);
  let max = parseInt(document.getElementById('max-viewers').value);
  if (!Number.isFinite(cost) || cost < 0) cost = 15;
  if (!Number.isFinite(max) || max < 3) max = 50;
  const surprise = window._liveEnergy || 0.65;

  if (!wallet) { alert('Sign in first'); return; }

  let finalTitle = title;
  if (codex.length > 1) {
    const last = codex[0].note || '';
    if (last.includes('energy')) finalTitle = title + ' · Encore';
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
    seatsLeft: Math.max(3, Math.floor(max * 0.7)),
    pot: 0,
    hosted: true
  };

  lives.unshift(newLive);
  localStorage.setItem('lumen_lives', JSON.stringify(lives));

  alert(`You're live: ${finalTitle}\nRoom opened. You are now hosting.`);
  hostLiveRoom(newLive);
}

// Creator enters and hosts their own room — the audience gathers live.
function hostLiveRoom(live) {
  const dna = pullEnergy();
  live.surprise = Math.min(1, (live.surprise || 0.65) * 0.6 + dna.energy * 0.6 + dna.spark * 0.25);
  currentLive = live;
  hideAll();
  const room = document.getElementById('live-room');
  room.classList.remove('hidden');
  document.getElementById('room-title').textContent = live.title + ' — HOSTING';
  document.getElementById('room-meta').innerHTML =
    `you • host • entry ${live.cost} Sparks • warmth ${dna.warmth.toFixed(2)}`;
  reflectRoomStats(live);

  startLiveEnergy(live, dna);
  consumeCrossViralitySeeds(live);
  startFomoTimer(live);

  addChat('Your room is live. Welcome your guests!', null, 'sys');
  startAudience(live);
  if (live.ritual) document.getElementById('ritual-panel').classList.remove('hidden');
  renderLives();
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
      <div class="meta">${comm.members} members • ${comm.passPrice} Sparks Pass</div>
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
  if (!wallet || erosBalance < comm.passPrice) { alert('Sign in + enough Sparks'); return; }

  erosBalance -= comm.passPrice;
  comm.members++;
  updateWalletUI();

  alert(`Joined ${comm.name}. Member chat unlocked.`);
  renderCommunities();
}

function showCodex() {
  hideAll();
  const sec = document.getElementById('codex');
  sec.classList.remove('hidden');
  const list = document.getElementById('codex-list');
  list.innerHTML = '';

  if (codex.length === 0) {
    list.innerHTML = '<p>Your live sessions show up here. Add a note to remember what worked.</p>';
    return;
  }
  codex.forEach(entry => {
    const el = document.createElement('div');
    el.className = 'codex-entry';
    el.innerHTML = `<strong>${entry.title}</strong><br>${entry.note}<br><small>${new Date(entry.time).toLocaleString()}</small>`;
    list.appendChild(el);
  });
}

window.onload = initApp;

// === Live room interactions ===
function startLiveEnergy(live, dna) {
  const bar = document.getElementById('eye-fill');
  const val = document.getElementById('eye-val');
  const fuelEl = document.getElementById('breath-fuel-val');
  if (!bar || !val) return;
  if (eyeInterval) clearInterval(eyeInterval);
  eyeInterval = setInterval(() => {
    const fresh = pullEnergy();
    const voiceBoost = window._liveEnergy || 0;
    live.surprise = Math.min(1, live.surprise * 0.82 + fresh.energy * 0.55 + (fresh.spark * 0.22) + voiceBoost * 0.18);
    const pct = Math.floor(live.surprise * 100);
    bar.style.width = pct + '%';
    val.textContent = live.surprise.toFixed(2);
    if (fuelEl) fuelEl.textContent = `warmth ${fresh.warmth.toFixed(2)}`;
    if (live.surprise > 0.68 && Math.random() < 0.18) {
      live.surprise = Math.min(1, live.surprise + 0.04);
      addChat('the room is buzzing!');
    }
    renderLives();
  }, 920);
}

function tipBattle() {
  if (!currentLive || erosBalance < 8) { alert('Need Sparks + be in a room'); return; }
  erosBalance -= 8; updateWalletUI();
  const dna = pullEnergy();
  const radiusMul = Math.max(0.6, 1 - (dna.spark * 0.5));
  const r = Math.random(); const res = document.getElementById('battle-result');
  let base = 18 + currentLive.surprise * 22;
  if (r > 0.71) { const win = Math.floor(base * radiusMul * (1 + Math.random()*0.6)); erosBalance += win; res.innerHTML = `nice! the host cheers · +${win} Sparks back`; }
  else if (r > 0.38) { res.innerHTML = `the room lit up for a sec.`; currentLive.surprise = Math.min(1, currentLive.surprise + 0.09); }
  else { res.innerHTML = `thanks for the spark! energy building.`; currentLive.surprise = Math.min(1, currentLive.surprise + 0.04); }
  updateWalletUI();
}

// Go on mic — your voice raises the room's live energy.
function pulseVoiceLive() {
  if (!currentLive) return;
  addChat('you are on mic…');
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const rec = new MediaRecorder(stream);
    let chunks = [];
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = () => {
      const energy = (window.getMicEnergy ? window.getMicEnergy() : Math.random()*0.3 + 0.5) * (0.7 + Math.random()*0.6);
      const dna = pullEnergy();
      currentLive.surprise = Math.min(1, currentLive.surprise * 0.7 + energy * 0.9 + dna.spark * 0.15);
      const bar = document.getElementById('eye-fill'); if (bar) bar.style.width = Math.floor(currentLive.surprise*100)+'%';
      const val = document.getElementById('eye-val'); if (val) val.textContent = currentLive.surprise.toFixed(2);
      addChat(`you spoke • energy ${currentLive.surprise.toFixed(2)} • the room loved it`);
      stream.getTracks().forEach(t => t.stop());
    };
    rec.start(); setTimeout(() => rec.stop(), 3200);
  }).catch(() => {
    currentLive.surprise = Math.min(1, currentLive.surprise + 0.11);
    addChat('mic off • energy nudged up');
  });
}

// Send a shout-out to the room (Live Moment).
function sendShoutout() {
  if (!currentLive) return;
  const out = document.getElementById('ritual-out');
  if (erosBalance < 5) { out.textContent = 'need 5 Sparks'; return; }
  erosBalance -= 5; updateWalletUI();
  const dna = pullEnergy();
  const cast = Math.random() * 0.6 + (currentLive.surprise || 0.5) * 0.7 + dna.spark * 0.4;
  const success = cast > 0.71;
  if (success) {
    currentLive.surprise = Math.min(1, currentLive.surprise + 0.17);
    out.innerHTML = `shout-out landed • the room cheered · energy +0.17`;
    addChat('your shout-out got a big reaction!');
  } else {
    currentLive.surprise = Math.min(1, currentLive.surprise + 0.07);
    out.innerHTML = `shout-out sent • the room warmed up a little.`;
  }
  const bar = document.getElementById('eye-fill'); if (bar) bar.style.width = Math.floor(currentLive.surprise*100)+'%';
  document.getElementById('eye-val').textContent = currentLive.surprise.toFixed(2);
}

function addReflection() {
  const note = prompt('What did this live session teach you?');
  if (note) {
    codex.unshift({ title: 'Session Note', note, time: Date.now() });
    localStorage.setItem('lumen_journal', JSON.stringify(codex));
    showCodex();
    addChat('note saved to your journal.');
  }
}

function leaveLive() {
  if (eyeInterval) clearInterval(eyeInterval);
  stopAudience();
  if (currentLive) localStorage.setItem('lumen_lives', JSON.stringify(lives));
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
  st.textContent = sel + ' is joining.';
  addChat(sel + ' joined as co-host.');
  if (currentLive && Math.random() > 0.5) {
    currentLive.surprise = Math.min(1, currentLive.surprise + 0.06);
    addChat('co-host banter • energy rose');
  }
}

// Get a Room Pass — a chance to unlock extra seats.
function getRoomPass() {
  if (!currentLive || erosBalance < 25) { alert('Be in a room + 25 Sparks'); return; }
  erosBalance -= 25; updateWalletUI();
  const roll = Math.random();
  const resEl = document.getElementById('pass-result');
  const nearMiss = roll > 0.42 && roll < 0.71;
  if (roll > 0.71) {
    currentLive.roomPass = true;
    currentLive.seatsLeft = (currentLive.seatsLeft || 10) + 5;
    resEl.textContent = `UNLOCKED • +5 seats opened • energy +0.12`;
    currentLive.surprise = Math.min(1, currentLive.surprise + 0.12);
    addChat('Room Pass unlocked • permanent access');
  } else if (nearMiss) {
    resEl.textContent = `so close! • temporary Spark boost this session`;
    currentLive.surprise = Math.min(1, currentLive.surprise + 0.07);
  } else {
    resEl.textContent = `no pass this time • try again`;
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

function addChat(msg, who, kind) {
  const chat = document.getElementById('live-chat');
  if (!chat) return;
  const p = document.createElement('div');
  p.className = 'chat-line' + (kind ? ' chat-' + kind : '');
  if (who) {
    const nm = document.createElement('span');
    nm.className = 'chat-who';
    nm.textContent = who;
    p.appendChild(nm);
    p.appendChild(document.createTextNode(' ' + msg));
  } else {
    p.textContent = '• ' + msg;
  }
  chat.appendChild(p);
  // Cap DOM so a long session doesn't grow unbounded
  while (chat.childNodes.length > 60) chat.removeChild(chat.firstChild);
  chat.scrollTop = chat.scrollHeight;
}

// === LIVING ROOM: ambient audience reacts to real live energy state ===
// Higher energy -> more arrivals, faster chatter, more tips. Quiet when it dips.
let audienceInterval = null;
let ambientPool = [];

const AUDIENCE_NAMES = ['Velvet','moth','Ember','silk_wraith','Nyx','duskmoth','Opal','veil_09','Rune','ashfen','Lilac','Seren','night_kin','Miré','umbral','Fawn'];
const CHAT_HOT   = ['this room is on fire 🔥','felt that energy','ok this room is alive','the vibe is insane rn','goosebumps','+1 to that','she felt it too','stay stay stay'];
const CHAT_WARM  = ['soft night in here','nice vibe','warming up','hi from the circle','that landed','mm','love this'];
const CHAT_QUIET = ['who else lurking','waiting for the next moment','...','quiet room','low key, patient'];
const TIP_AMTS   = [3, 5, 8, 12, 21];

function startAudience(live) {
  stopAudience();
  const seed = Math.max(4, Math.min(14, Math.round((live.viewers || 12) * 0.35)));
  ambientPool = [];
  for (let i = 0; i < seed; i++) ambientPool.push(pickName());
  addChat(`${ambientPool.length} people already here`, null, 'sys');

  let beat = 0;
  audienceInterval = setInterval(() => {
    if (!currentLive || currentLive.id !== live.id) { stopAudience(); return; }
    beat++;
    const s = Math.max(0, Math.min(1, live.surprise || 0));

    // 1) Arrivals/exits scale with energy (hot rooms fill up).
    if (Math.random() < 0.25 + s * 0.45) {
      const nm = pickName();
      ambientPool.push(nm);
      live.viewers = (live.viewers || 12) + 1;
      if (live.seatsLeft != null) live.seatsLeft = Math.max(0, live.seatsLeft - 1);
      addChat('joined the room', nm, 'join');
      reflectRoomStats(live);
      renderLives();
    } else if (ambientPool.length > 3 && Math.random() < 0.12 - s * 0.08) {
      const gone = ambientPool.splice(Math.floor(Math.random() * ambientPool.length), 1)[0];
      live.viewers = Math.max(1, (live.viewers || 12) - 1);
      addChat('left the room', gone, 'leave');
      reflectRoomStats(live);
      renderLives();
    }

    // 2) Ambient chat — frequency + mood driven by real energy value.
    const chatChance = 0.30 + s * 0.55;
    if (ambientPool.length && Math.random() < chatChance) {
      const speaker = ambientPool[Math.floor(Math.random() * ambientPool.length)];
      const pool = s > 0.66 ? CHAT_HOT : s > 0.42 ? CHAT_WARM : CHAT_QUIET;
      addChat(pool[Math.floor(Math.random() * pool.length)], speaker, 'aud');
    }

    // 3) Ambient tips — hot rooms make the crowd send Sparks, growing the pot.
    if (ambientPool.length && Math.random() < 0.06 + s * 0.30) {
      const tipper = ambientPool[Math.floor(Math.random() * ambientPool.length)];
      const amt = TIP_AMTS[Math.min(TIP_AMTS.length - 1, Math.floor(s * TIP_AMTS.length))];
      live.pot = (live.pot || 0) + amt;
      addChat(`sent ${amt} Sparks ✦`, tipper, 'tip');
      live.surprise = Math.min(1, (live.surprise || 0.5) + amt * 0.0025);
      reflectRoomStats(live);
    }
  }, 1400);
}

function stopAudience() {
  if (audienceInterval) { clearInterval(audienceInterval); audienceInterval = null; }
  ambientPool = [];
}

function pickName() {
  return AUDIENCE_NAMES[Math.floor(Math.random() * AUDIENCE_NAMES.length)];
}

// Keep the room header (viewers / seats / pot) truthful to live state in real time.
function reflectRoomStats(live) {
  const seatsEl = document.getElementById('seats-left');
  if (seatsEl) seatsEl.textContent = live.seatsLeft != null ? `${live.seatsLeft} seats left` : 'open';
  const vEl = document.getElementById('room-viewers');
  if (vEl) vEl.textContent = live.viewers || 1;
  const potEl = document.getElementById('room-pot');
  if (potEl) potEl.textContent = (live.pot || 0) + ' Sparks';
}

// Optional: a featured room can get a small visibility boost from recent shares.
function consumeCrossViralitySeeds(live) {
  let boost = 0;
  try {
    const shares = JSON.parse(localStorage.getItem('lumen_shares')||'null');
    if (shares && shares.count) boost += Math.min(0.6, shares.count / 90);
  } catch(e){}
  if (boost > 0) {
    live.surprise = Math.min(0.99, (live.surprise||0.5) + boost*0.3);
    live.viewers = Math.floor((live.viewers||12) * (1 + boost*0.15));
    addChat(`Featured from recent shares — a few more people are dropping in.`);
  }
}
