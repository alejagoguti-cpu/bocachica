import {createTerritoryModel} from './isla-model.js';

const $ = s => document.querySelector(s);
const fmt = n => n.toLocaleString('es-CO');
function h(spec, attrs = {}, ...kids) {
  const [tag, ...cls] = spec.split('.');
  const node = document.createElement(tag || 'div');
  if (cls.length) node.className = cls.join(' ');
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'style') node.style.cssText = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid !== null && kid !== undefined && kid !== false) node.append(kid.nodeType ? kid : document.createTextNode(kid));
  return node;
}
const setCard = (...kids) => $('#card').replaceChildren(...kids.flat(Infinity).filter(k => k !== null && k !== undefined && k !== false));

// ------------------------------------------------------------ datos fijos
const C = [-75.566, 10.346];
const TOWNS = [
  {name: 'Bocachica', coord: [-75.5805, 10.3218]},
  {name: 'Caño del Oro', coord: [-75.5450, 10.3430]},
  {name: 'Punta Arena', coord: [-75.5530, 10.3655]},
  {name: 'Tierra Bomba', coord: [-75.5790, 10.3755]}
];
const CARTAGENA = [-75.5480, 10.3915];
// Recorridos aproximados: se dibujan por agua, entre los muelles de OSM y Castillogrande.
const LANCHAS = [
  {to: 'Tierra Bomba', pts: [CARTAGENA, [-75.5560, 10.3860], [-75.5640, 10.3760], [-75.566054, 10.37144]]},
  {to: 'Punta Arena', pts: [CARTAGENA, [-75.5500, 10.3800], [-75.5525, 10.3700], [-75.553716, 10.366055]]},
  {to: 'Caño del Oro', pts: [CARTAGENA, [-75.5360, 10.3800], [-75.5250, 10.3620], [-75.5300, 10.3480], [-75.542233, 10.345317]]},
  {to: 'Bocachica', pts: [CARTAGENA, [-75.5320, 10.3780], [-75.5250, 10.3550], [-75.5360, 10.3330], [-75.5560, 10.3180], [-75.5700, 10.3165], [-75.580452, 10.320513]]}
];
const CANAL = [[-75.6650, 10.2980], [-75.6200, 10.3070], [-75.5960, 10.3135], [-75.5797, 10.3168], [-75.5640, 10.3180], [-75.5440, 10.3240], [-75.5250, 10.3420], [-75.5150, 10.3680], [-75.5200, 10.3920]];
const GROUP_COLORS = ['#3d9fd6', '#5a9e45', '#d4a017', '#1fa8a3', '#d46a9a', '#a67c52', '#e0743a', '#8b6fd6', '#2fae74', '#8a8576'];
const REL = {
  come: {name: 'Quién come a quién', color: '#e86b4a', out: 'Se alimenta de', in: 'Se alimentan de esta especie'},
  flores: {name: 'Visitas a las flores', color: '#f2b134', out: 'Visita las flores de', in: 'Visitan sus flores'},
  visita: {name: 'Visitas a las flores', color: '#f2b134', out: 'Visita a', in: 'La visitan'},
  vive: {name: 'Quién vive sobre quién', color: '#9b7be0', out: 'Vive sobre o dentro de', in: 'Viven sobre o dentro de ella'},
  enferma: {name: 'Quién vive sobre quién', color: '#9b7be0', out: 'Puede enfermar a', in: 'Pueden enfermarla'},
  ayuda: {name: 'Se ayudan', color: '#3fd0b6', out: 'Se benefician juntas', in: 'Se benefician juntas'}
};
const FILTERS = [
  {id: 'todas', name: 'Todas', cats: ['come', 'flores', 'visita', 'vive', 'enferma', 'ayuda'], color: '#ffffff'},
  {id: 'come', name: 'Quién come a quién', cats: ['come'], color: REL.come.color},
  {id: 'flores', name: 'Visitas a las flores', cats: ['flores', 'visita'], color: REL.flores.color},
  {id: 'vive', name: 'Quién vive sobre quién', cats: ['vive', 'enferma'], color: REL.vive.color},
  {id: 'ayuda', name: 'Se ayudan', cats: ['ayuda'], color: REL.ayuda.color}
];
// pisos de vida: altura en metros y radio en km alrededor del centro de la isla
const FLOORS = [
  {groups: [0], h: 2700, r: 2.4, name: 'Aves'},
  {groups: [2, 5], h: 1950, r: 1.9, name: 'Insectos y arañas'},
  {groups: [6, 7, 8], h: 1300, r: 1.3, name: 'Reptiles, mamíferos y anfibios'},
  {groups: [1, 9], h: 650, r: 2.1, name: 'Plantas y hongos'},
  {groups: [3, 4], h: 40, r: 3.4, name: 'Peces y moluscos, en el mar'}
];
const CAMERAS = {
  isla: {center: C, zoom: 13.2, pitch: 48, bearing: -12},
  mar: {center: [-75.5600, 10.3520], zoom: 13.0, pitch: 56, bearing: -8},
  vida: {center: [-75.5660, 10.3470, 1300], zoom: 13.6, pitch: 72, bearing: -18},
  agua: {center: [-75.5590, 10.3500], zoom: 13.55, pitch: 50, bearing: -10},
  historia: {center: [-75.5800, 10.3215], zoom: 15.4, pitch: 54, bearing: -20},
  cuenta: {center: C, zoom: 13.2, pitch: 38, bearing: -12}
};
const CHAPTERS = ['isla', 'mar', 'vida', 'agua', 'historia', 'cuenta'];
const CH_NAMES = {isla: 'La isla', mar: 'El mar', vida: 'La vida', agua: 'El agua', historia: 'Historia', cuenta: 'Cuéntanos'};

// ------------------------------------------------------------ estado
const state = {ch: 'isla', filter: 'todas', sel: null, pin: null, pinTag: null, top: false};
let lugares = [], especies = [], grupos = [], registros = [], relaciones = [];
const adj = new Map(), obsBy = new Map();

// ------------------------------------------------------------ modelo
const model = createTerritoryModel($('#model'), text => { $('#loading').textContent = text; });
const [L, E, I] = await Promise.all([
  fetch('assets/datos/lugares.json').then(r => r.json()),
  fetch('assets/datos/especies.json').then(r => r.json()),
  fetch('assets/datos/interacciones.json').then(r => r.json())
]).catch(err => { $('#loading').textContent = 'No se pudieron cargar los datos. Revisa la conexión y vuelve a abrir la página.'; throw err; });
lugares = L.lugares; especies = E.especies; grupos = E.grupos; registros = E.registros; relaciones = I.relaciones;
registros.forEach(([id, lon, lat]) => { if (!obsBy.has(id)) obsBy.set(id, []); obsBy.get(id).push([lon, lat]); });
for (const [a, b, cat, n] of relaciones) {
  const add = (x, other, dir) => { if (!adj.has(x)) adj.set(x, []); adj.get(x).push({other, cat, dir, n, a, b}); };
  add(a, b, 'out'); add(b, a, 'in');
}
const byTipo = t => lugares.filter(l => l.tipo === t);
const byCapa = c => lugares.filter(l => l.capa === c);

// puntos por capítulo
const PT = {
  muelles: byTipo('Muelle').concat(byTipo('Varadero')).map(l => ({lon: l.lon, lat: l.lat, color: '#0f766e', r: 7, data: {kind: 'lugar', id: l.id}})),
  agua: byCapa('agua').filter(l => l.tipo !== 'Cantera').map(l => ({lon: l.lon, lat: l.lat, color: '#1d93c4', r: 7, data: {kind: 'lugar', id: l.id}})),
  manglar: byTipo('Reserva natural').map(l => ({lon: l.lon, lat: l.lat, color: '#3f7d23', r: 9, data: {kind: 'lugar', id: l.id}})),
  patrimonio: byCapa('patrimonio').map(l => ({lon: l.lon, lat: l.lat, color: '#7a4b2a', r: 8, data: {kind: 'lugar', id: l.id}})),
  turismo: byCapa('turismo').map(l => ({lon: l.lon, lat: l.lat, color: '#8b4aa8', r: 6, data: {kind: 'lugar', id: l.id}})),
  comunidad: byCapa('comunidad').map(l => ({lon: l.lon, lat: l.lat, color: '#b8325a', r: 7, data: {kind: 'lugar', id: l.id}}))
};
const PT_BY_CH = {isla: ['comunidad'], mar: ['muelles'], vida: [], agua: ['agua', 'manglar'], historia: ['patrimonio', 'turismo', 'muelles'], cuenta: []};
for (const [id, pts] of Object.entries(PT)) model.setPoints(id, pts, {visible: false, lift: 3});

// etiquetas
const tags = [];
function tag(text, coord, cls, chapters, onclick, prio, lift = 10) {
  const node = h('button.tag' + (cls ? '.' + cls : ''), {text, onclick: () => state.ch === 'cuenta' ? setPin(coord) : onclick && onclick()});
  model.addPlace(node, coord, lift);
  tags.push({node, chapters, prio});
}
TOWNS.forEach(t => tag(t.name, t.coord, 'town', ['isla', 'mar', 'agua', 'cuenta', 'historia'], () => fly({center: [...t.coord, 0], zoom: 15.6, pitch: 52}), 10, 30));
tag('Cartagena', CARTAGENA, 'city', ['mar'], null, 9);
tag('Canal de Bocachica', [-75.5840, 10.3080], 'note', ['mar'], null, 7, 4);
byCapa('patrimonio').filter(l => !/^Atractivo/.test(l.nombre)).forEach(l => tag(l.nombre.replace(' de Bocachica', ''), [l.lon, l.lat], '', ['historia'], () => select({kind: 'lugar', id: l.id}), 6));
byCapa('comunidad').filter(l => /Escuela|Institución|Gimnasio|Fundación/.test(l.tipo + l.nombre)).forEach(l => tag(l.nombre.replace('Institución Educativa ', 'I. E. '), [l.lon, l.lat], '', ['isla'], () => select({kind: 'lugar', id: l.id}), 5));
byTipo('Reserva natural').forEach(l => tag('Manglar', [l.lon, l.lat], 'note', ['agua'], () => select({kind: 'lugar', id: l.id}), 6));
function syncTags() { tags.forEach(t => { t.node.hidden = !t.chapters.includes(state.ch); }); }
setInterval(() => {
  const shown = [];
  tags.slice().sort((a, b) => b.prio - a.prio).forEach(t => {
    if (t.node.hidden || t.node.style.visibility === 'hidden') return;
    const r = t.node.getBoundingClientRect();
    const clash = shown.some(o => r.left < o.right + 4 && r.right > o.left - 4 && r.top < o.bottom + 3 && r.bottom > o.top - 3);
    t.node.style.opacity = clash ? '0' : '1'; t.node.style.pointerEvents = clash ? 'none' : '';
    if (!clash) shown.push(r);
  });
}, 200);

// ------------------------------------------------------------ cámara
let tween = null;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function camFor(ch) {
  const c = {...CAMERAS[ch]}; const w = model.size().w;
  if (w < 700) { c.zoom -= .45; if (ch === 'vida') { c.pitch = 64; c.zoom -= .15; } } else if (w < 1000) c.zoom -= .2;
  if (state.top) c.pitch = 4;
  return c;
}
function fly(to, ms = 1600) {
  const from = model.getView();
  const t = {center: to.center || from.center, zoom: to.zoom ?? from.zoom, pitch: to.pitch ?? from.pitch, bearing: to.bearing ?? from.bearing};
  let db = ((t.bearing - from.bearing + 540) % 360) - 180;
  const start = performance.now();
  const h0 = from.center[2] || 0, h1 = t.center[2] || 0;
  tween = now => {
    const k = ease(Math.min(1, (now - start) / ms));
    model.easeTo({center: [from.center[0] + (t.center[0] - from.center[0]) * k, from.center[1] + (t.center[1] - from.center[1]) * k, h0 + (h1 - h0) * k],
      zoom: from.zoom + (t.zoom - from.zoom) * k, pitch: from.pitch + (t.pitch - from.pitch) * k, bearing: from.bearing + db * k});
    if (k >= 1) tween = null;
  };
}
model.on('dragstart', () => { tween = null; });

// ------------------------------------------------------------ flujos
function smooth(pts, it = 3) {
  let p = pts;
  for (let k = 0; k < it; k++) {
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const [a, b] = [p[i], p[i + 1]];
      q.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]);
    }
    q.push(p[p.length - 1]); p = q;
  }
  const d = [0];
  for (let i = 1; i < p.length; i++) d.push(d[i - 1] + Math.hypot((p[i][0] - p[i - 1][0]) * 109.3, (p[i][1] - p[i - 1][1]) * 110.6));
  return {pts: p, d, len: d[d.length - 1]};
}
function along(path, t) {
  const target = t * path.len; let i = 1;
  while (i < path.d.length - 1 && path.d[i] < target) i++;
  const k = (target - path.d[i - 1]) / ((path.d[i] - path.d[i - 1]) || 1), a = path.pts[i - 1], b = path.pts[i];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
}
const lanchas = LANCHAS.map(r => ({...r, path: smooth(r.pts)}));
const canal = smooth(CANAL);
window.__rutas = {lanchas: lanchas.map(r => ({to: r.to, pts: r.path.pts})), canal: canal.pts};

// ------------------------------------------------------------ red de la vida
const net = {nodes: [], edges: [], byId: new Map()};
(function buildNet() {
  const connected = [...adj.keys()];
  const kmLon = 1 / 109.3, kmLat = 1 / 110.6;
  for (const floor of FLOORS) {
    const list = connected.filter(id => floor.groups.includes(especies[id].grupo)).map(id => {
      const obs = obsBy.get(id) || [C];
      const lon = obs.reduce((s, p) => s + p[0], 0) / obs.length, lat = obs.reduce((s, p) => s + p[1], 0) / obs.length;
      return {id, ang: Math.atan2((lat - C[1]) / kmLat, (lon - C[0]) / kmLon) + (id % 7) * .01};
    }).sort((a, b) => a.ang - b.ang);
    const n = list.length;
    list.forEach((it, i) => {
      const ang = -Math.PI + (i + .5) * 2 * Math.PI / n;
      const r = floor.r * (n > 40 ? (i % 2 ? 1.08 : .92) : 1);
      const deg = new Set(adj.get(it.id).map(e => e.other)).size;
      const node = {id: it.id, lon: C[0] + Math.cos(ang) * r * kmLon, lat: C[1] + Math.sin(ang) * r * kmLat, h: floor.h + (n > 40 ? (i % 2 ? 40 : -40) : 0), deg, sp: especies[it.id]};
      net.nodes.push(node); net.byId.set(it.id, node);
    });
  }
  for (const [a, b, cat, n] of relaciones) {
    const from = cat === 'come' ? b : a, to = cat === 'come' ? a : b; // el alimento pasa de quien es comido a quien come
    net.edges.push({a, b, from, to, cat, n, phase: Math.random(), speed: .18 + Math.random() * .22});
  }
})();
const sprites = new Map();
function sprite(node) {
  if (sprites.has(node.id)) return sprites.get(node.id);
  const c = document.createElement('canvas'); c.width = c.height = 72; sprites.set(node.id, c);
  const ctx = c.getContext('2d'), color = GROUP_COLORS[node.sp.grupo];
  ctx.beginPath(); ctx.arc(36, 36, 34, 0, 7); ctx.fillStyle = color; ctx.fill();
  const img = new Image(); img.src = `assets/fotos/${node.sp.tid}.webp`;
  img.onload = () => {
    ctx.save(); ctx.beginPath(); ctx.arc(36, 36, 28, 0, 7); ctx.clip();
    const s = Math.max(56 / img.width, 56 / img.height);
    ctx.drawImage(img, 36 - img.width * s / 2, 36 - img.height * s / 2, img.width * s, img.height * s); ctx.restore();
  };
  return c;
}

// ------------------------------------------------------------ dibujo animado
const flow = $('#flow'), fx = flow.getContext('2d');
function fit() {
  const {w, h: hh} = model.size(), r = Math.min(devicePixelRatio, 2);
  if (flow.width !== Math.round(w * r) || flow.height !== Math.round(hh * r)) { flow.width = Math.round(w * r); flow.height = Math.round(hh * r); }
  fx.setTransform(r, 0, 0, r, 0, 0);
}
function line(path, height, color, width, alpha) {
  fx.beginPath(); let started = false;
  for (const p of path.pts) {
    const q = model.project(p[0], p[1], height); if (!q.on) { started = false; continue; }
    if (!started) { fx.moveTo(q.x, q.y); started = true; } else fx.lineTo(q.x, q.y);
  }
  fx.globalAlpha = alpha; fx.strokeStyle = color; fx.lineWidth = width; fx.lineCap = 'round'; fx.lineJoin = 'round'; fx.stroke(); fx.globalAlpha = 1;
}
function particles(path, height, color, count, speed, time, size) {
  for (let i = 0; i < count; i++) {
    const t = (time * speed / path.len + i / count) % 1;
    const [lon, lat] = along(path, t), q = model.project(lon, lat, height);
    if (!q.on) continue;
    fx.beginPath(); fx.arc(q.x, q.y, size + 5, 0, 7); fx.fillStyle = color; fx.globalAlpha = .22; fx.fill();
    fx.globalAlpha = 1; fx.beginPath(); fx.arc(q.x, q.y, size, 0, 7); fx.fill();
    fx.lineWidth = 1.5; fx.strokeStyle = '#0b2530'; fx.stroke();
  }
}
function drawMar(time) {
  const s = model.scale();
  line(canal, 3, '#ffffff', 6 * s, .6);
  particles(canal, 3, '#ffffff', 5, .45, time, 8 * s);
  for (const r of lanchas) { line(r.path, 4, '#f2b134', 4.5 * s, .9); particles(r.path, 4, '#f2b134', 3, .9, time, 7 * s); }
}
function drawHistoria(time) {
  const r = lanchas.find(x => x.to === 'Bocachica'), s = model.scale();
  line(r.path, 4, '#f2b134', 4.5 * s, .9); particles(r.path, 4, '#f2b134', 4, .9, time, 7 * s);
}
function pulseRings(list, color, time) {
  const s = model.scale();
  list.forEach((p, i) => {
    const q = model.project(p.lon, p.lat, 3); if (!q.on) return;
    const k = ((time * .6 + i * .37) % 1);
    fx.beginPath(); fx.arc(q.x, q.y, (6 + k * 22) * s, 0, 7); fx.strokeStyle = color; fx.globalAlpha = (1 - k) * .8; fx.lineWidth = 2.5; fx.stroke(); fx.globalAlpha = 1;
  });
}
function drawVida(time) {
  const s = model.scale(), cats = FILTERS.find(f => f.id === state.filter).cats;
  const sel = state.sel?.kind === 'especie' ? state.sel.id : null;
  for (const n of net.nodes) { const q = model.project(n.lon, n.lat, n.h); n.x = q.x; n.y = q.y; n.z = q.z; n.on = q.on; }
  // pisos: anillos guía
  for (const f of FLOORS) {
    fx.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = i / 64 * Math.PI * 2, q = model.project(C[0] + Math.cos(a) * f.r / 109.3, C[1] + Math.sin(a) * f.r / 110.6, f.h);
      i ? fx.lineTo(q.x, q.y) : fx.moveTo(q.x, q.y);
    }
    fx.strokeStyle = 'rgba(255,255,255,.35)'; fx.lineWidth = 1; fx.setLineDash([3, 5]); fx.stroke(); fx.setLineDash([]);
  }
  // líneas de relación
  for (const e of net.edges) {
    if (!cats.includes(e.cat)) continue;
    const A = net.byId.get(e.from), B = net.byId.get(e.to); if (!A?.on || !B?.on) continue;
    const mine = sel !== null && (e.a === sel || e.b === sel);
    const alpha = sel === null ? .2 : mine ? .95 : .04;
    fx.beginPath(); fx.moveTo(A.x, A.y); fx.lineTo(B.x, B.y);
    fx.strokeStyle = REL[e.cat].color; fx.globalAlpha = alpha; fx.lineWidth = mine ? 2.6 : 1.2; fx.stroke();
    if (sel === null || mine) {
      const t = (time * e.speed + e.phase) % 1, x = A.x + (B.x - A.x) * t, y = A.y + (B.y - A.y) * t;
      fx.globalAlpha = mine ? 1 : .75; fx.beginPath(); fx.arc(x, y, (mine ? 4 : 2.4) * Math.min(1.4, s), 0, 7); fx.fillStyle = REL[e.cat].color; fx.fill();
    }
    fx.globalAlpha = 1;
  }
  // líneas hacia donde se vio la especie elegida
  if (sel !== null && net.byId.get(sel)?.on) {
    const N = net.byId.get(sel);
    for (const [lon, lat] of obsBy.get(sel) || []) {
      const q = model.project(lon, lat, model.elevation(lon, lat) + 2); if (!q.on) continue;
      fx.beginPath(); fx.moveTo(N.x, N.y); fx.lineTo(q.x, q.y); fx.strokeStyle = '#ffffff'; fx.globalAlpha = .8; fx.setLineDash([4, 4]); fx.lineWidth = 1.6; fx.stroke(); fx.setLineDash([]);
      fx.globalAlpha = 1; fx.beginPath(); fx.arc(q.x, q.y, 6, 0, 7); fx.fillStyle = GROUP_COLORS[N.sp.grupo]; fx.fill(); fx.lineWidth = 2; fx.strokeStyle = '#fff'; fx.stroke();
    }
  }
  // nodos, del más lejano al más cercano
  const related = sel !== null ? new Set((adj.get(sel) || []).map(r => r.other)) : null;
  const order = net.nodes.filter(n => n.on).sort((a, b) => b.z - a.z);
  for (const n of order) {
    const dim = sel !== null && n.id !== sel && !related.has(n.id);
    const r = (9 + Math.sqrt(n.deg) * 2.4) * Math.min(1.5, s) * (n.id === sel ? 1.8 : related?.has(n.id) ? 1.25 : 1);
    n.r = r; fx.globalAlpha = dim ? .25 : 1;
    fx.drawImage(sprite(n), n.x - r, n.y - r, r * 2, r * 2);
  }
  fx.globalAlpha = 1;
  // nombres: la elegida y sus relaciones, o las más conectadas
  const named = sel !== null ? order.filter(n => n.id === sel || related.has(n.id)) : order.filter(n => n.deg >= 30);
  fx.font = '600 15px "Space Grotesk", sans-serif'; fx.textAlign = 'center'; fx.lineJoin = 'round';
  const boxes = [];
  for (const n of named.sort((a, b) => (b.id === sel) - (a.id === sel) || b.deg - a.deg)) {
    const tw = fx.measureText(n.sp.nombre).width, x = n.x, y = n.y + n.r + 17;
    const box = [x - tw / 2 - 4, y - 14, x + tw / 2 + 4, y + 5];
    if (boxes.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
    boxes.push(box);
    fx.lineWidth = 5; fx.strokeStyle = 'rgba(11,37,48,.85)'; fx.strokeText(n.sp.nombre, x, y); fx.fillStyle = '#fff'; fx.fillText(n.sp.nombre, x, y);
  }
  // nombres de los pisos
  fx.textAlign = 'left'; fx.font = '600 14px "Space Grotesk", sans-serif';
  for (const f of FLOORS) {
    const q = model.project(C[0] + f.r / 109.3 * 1.06, C[1] - f.r / 110.6 * .35, f.h); if (!q.on) continue;
    fx.lineWidth = 4; fx.strokeStyle = 'rgba(11,37,48,.75)'; fx.strokeText(f.name, q.x + 6, q.y - 6); fx.fillStyle = '#d9ecec'; fx.fillText(f.name, q.x + 6, q.y - 6);
  }
}
function frame(now) {
  if (tween) tween(now);
  fit();
  const {w, h: hh} = model.size(); fx.clearRect(0, 0, w, hh);
  const time = now / 1000;
  if (model.isReady()) {
    if (state.ch === 'mar') drawMar(time);
    else if (state.ch === 'vida') drawVida(time);
    else if (state.ch === 'agua') { pulseRings(PT.agua, '#1d93c4', time); pulseRings(PT.manglar, '#3f7d23', time); }
    else if (state.ch === 'historia') { drawHistoria(time); pulseRings(PT.patrimonio, '#7a4b2a', time); }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ------------------------------------------------------------ toques
model.on('click', ({x, y}) => {
  if (state.ch === 'cuenta') { const ll = model.screenToLonLat(x, y); if (ll) setPin(ll); return; }
  if (state.ch === 'vida') {
    let best = null, bd = 1e9;
    for (const n of net.nodes) { if (!n.on) continue; const d = Math.hypot(n.x - x, n.y - y); if (d < Math.max(14, n.r + 4) && d < bd) { bd = d; best = n; } }
    if (best) return select({kind: 'especie', id: best.id});
    return clearSel();
  }
  const hit = model.pickPoint(x, y, 18);
  if (hit) select(hit); else clearSel();
});

// ------------------------------------------------------------ fichas
function closeBtn() { return h('button.close', {'aria-label': 'Cerrar', onclick: clearSel, text: '×'}); }
function clearSel() { state.sel = null; model.setHighlight(null); setCard(); }
function select(d) {
  state.sel = d;
  if (d.kind === 'lugar') {
    model.setHighlight(x => x && x.kind === 'lugar' && x.id === d.id);
    const l = lugares.find(x => x.id === d.id);
    setCard(closeBtn(), h('p.kind', {style: '--c:#0f766e'}, h('i'), l.tipo), h('h3', {text: l.nombre}),
      h('dl', {},
        h('dt', {text: 'De dónde viene'}), h('dd', {}, 'Mapa abierto (OpenStreetMap), dibujado por voluntarios. ', h('a', {href: l.url, target: '_blank', rel: 'noopener', text: 'Ver el dato'})),
        h('dt', {text: 'Revisado con la comunidad'}), h('dd', {text: 'Todavía no'})),
      l.nota ? h('p.fine', {text: l.nota}) : null,
      h('div.actions', {}, h('button.btn.dark', {onclick: () => openCuenta({lugar: l.nombre, coord: [l.lon, l.lat]}), text: 'Contar algo de este lugar'})));
  } else if (d.kind === 'especie') {
    model.setHighlight(null);
    const sp = especies[d.id], rels = adj.get(d.id) || [];
    const groups = new Map();
    for (const r of rels) { const key = r.cat === 'ayuda' ? 'ayuda:out' : `${r.cat}:${r.dir}`; if (!groups.has(key)) groups.set(key, new Set()); groups.get(key).add(r.other); }
    setCard(closeBtn(), h('p.kind', {style: `--c:${GROUP_COLORS[sp.grupo]}`}, h('i'), grupos[sp.grupo]),
      h('div.who', {style: `--c:${GROUP_COLORS[sp.grupo]}`}, h('img', {src: `assets/fotos/${sp.tid}.webp`, alt: `Foto de ${sp.nombre}`}),
        h('div', {}, h('h3', {text: sp.nombre}), h('p.sci', {text: sp.cientifico}))),
      h('dl', {}, h('dt', {text: 'Vista en la isla'}), h('dd', {text: `${fmt(sp.registros)} ${sp.registros === 1 ? 'vez' : 'veces'} en iNaturalist, ${sp.primero.slice(0, 4) === sp.ultimo.slice(0, 4) ? 'en ' + sp.primero.slice(0, 4) : 'entre ' + sp.primero.slice(0, 4) + ' y ' + sp.ultimo.slice(0, 4)}. Las líneas blancas bajan a ${sp.registros === 1 ? 'ese lugar' : 'esos lugares'}.`})),
      h('div.rels', {}, [...groups].map(([key, set]) => {
        const [cat, dir] = key.split(':');
        return h('section', {}, h('h4', {style: `--rc:${REL[cat].color}`}, h('i'), REL[cat][dir]),
          h('ul', {}, [...set].map(o => h('li', {}, h('button', {onclick: () => select({kind: 'especie', id: o}), text: especies[o].nombre})))));
      })),
      h('p.fine', {text: 'Estas relaciones están documentadas en estudios de otros lugares (GloBI). En Tierra Bomba hay que confirmarlas con lo que la gente ha visto.'}),
      h('div.actions', {}, h('button.btn.dark', {onclick: () => openCuenta({tema: 'La vida', texto: `Sobre ${sp.nombre}: `}), text: 'Contar algo de esta especie'})));
  }
  if (innerWidth < 1000) $('#card').scrollIntoView({behavior: 'smooth', block: 'start'});
}

// ------------------------------------------------------------ relatos
const count = {
  construcciones: 2600, caminos: 306,
  muelles: byTipo('Muelle').length,
  agua: byCapa('agua').filter(l => l.tipo !== 'Cantera').length,
  patrimonio: byCapa('patrimonio').filter(l => !/^Atractivo/.test(l.nombre)).length,
  turismo: byCapa('turismo').length,
  especies: especies.length, registros: registros.length, relaciones: relaciones.length, conectadas: adj.size
};
const ask = (title, qs, tema) => h('div.ask', {}, h('h3', {text: title}), h('ul', {}, qs.map(q => h('li', {text: q}))),
  h('button.btn.dark', {onclick: () => openCuenta({tema}), text: 'Contar lo que sé'}));
const facts = list => h('div.facts', {}, list.map(([n, t]) => h('div', {}, h('b', {text: n}), h('span', {text: t}))));
const legend = items => h('ul.legend', {}, items.map(([kind, color, title, sub]) => h('li', {}, h('i.' + kind, {style: `--c:${color}`}), h('span', {}, h('b', {text: title}), sub ? h('small', {text: sub}) : null))));
const STORIES = {
  isla: () => [
    h('h2', {text: 'Una isla, cuatro pueblos'}),
    h('p.lead', {text: 'Tierra Bomba queda frente a Cartagena. En ella viven Bocachica, Caño del Oro, Punta Arena y Tierra Bomba.'}),
    h('p.body', {text: 'Esta es la isla en 3D, con sus casas y sus caminos. Gírala con el dedo, acércate a tu pueblo y recorre los capítulos para ver cómo se mueve: por dónde llega la gente, cómo se conectan los animales y las plantas, dónde está el agua y qué falta por saber.'}),
    facts([[fmt(count.construcciones), 'construcciones en el archivo de la tesis'], [fmt(count.caminos), 'tramos de camino en el mapa abierto'], ['4', 'pueblos']]),
    h('div.places', {}, TOWNS.map(t => h('button', {onclick: () => fly({center: [...t.coord, 0], zoom: 15.6, pitch: 52}), text: t.name})), h('button', {onclick: () => fly(camFor('isla')), text: 'Toda la isla'})),
    legend([['dot', '#b8325a', 'Escuelas y lugares de la comunidad', 'Toca uno para ver de dónde viene el dato']]),
    h('p.source', {text: 'Las alturas de las casas son de referencia, no medidas. El relieve viene de Terrain Tiles y no reemplaza un levantamiento.'})
  ],
  mar: () => [
    h('h2', {text: 'El mar es la calle'}),
    h('p.lead', {text: 'A la isla no se llega por carretera. La gente, la comida, los materiales y los visitantes entran y salen por el mar.'}),
    h('p.body', {text: 'Las lanchas salen de Cartagena hacia los muelles de cada pueblo. Frente a Bocachica pasa el canal por donde entran los barcos grandes a la bahía; los fuertes de San Fernando y San José cuidaron esa entrada durante siglos.'}),
    legend([['sw', '#f2b134', 'Lanchas desde Cartagena', 'Recorridos aproximados hacia los cuatro pueblos'], ['sw', '#ffffff', 'Barcos por el canal de Bocachica', 'Recorrido aproximado hacia la bahía'], ['dot', '#0f766e', `${count.muelles} muelles y un varadero`, 'Del mapa abierto, sin revisar en campo']]),
    ask('Lo que solo saben los de la isla', ['¿De dónde salen las lanchas y cuánto cuesta el pasaje?', '¿Dónde se pesca y dónde se arreglan las lanchas?', '¿Qué pasa en la isla cuando el mar está bravo?'], 'El mar')
  ],
  vida: () => [
    h('h2', {text: 'La vida se conecta'}),
    h('p.lead', {text: `En la isla se han fotografiado ${fmt(count.especies)} tipos de seres vivos. Sobre el modelo los ves en pisos, cada uno encima de donde se vio.`}),
    h('p.body', {text: 'Arriba van las aves, luego los insectos, después reptiles y mamíferos, las plantas cerca del suelo y los peces alrededor, en el mar. Cada línea es una relación. Las luces que corren por las líneas muestran hacia dónde pasa el alimento.'}),
    h('div.chips', {}, FILTERS.map(f => h('button', {style: `--c:${f.color}`, 'aria-pressed': String(state.filter === f.id), onclick: () => { state.filter = f.id; renderStory(); }}, f.id === 'todas' ? null : h('i'), f.name))),
    facts([[fmt(count.conectadas), 'especies con relaciones conocidas'], [fmt(count.relaciones), 'relaciones entre ellas'], [fmt(count.registros), 'fotos tomadas en la isla']]),
    h('p.body', {text: 'Toca una especie para ver con quién se relaciona y dónde la han visto.'}),
    ask('Lo que solo saben los de la isla', ['¿Cómo les dicen en la isla a estos animales y plantas?', '¿Cuáles se ven menos que antes?', '¿Quién se come a quién, según lo que han visto?'], 'La vida'),
    h('p.source', {text: 'Fotos y registros: iNaturalist. Relaciones: GloBI (Global Biotic Interactions), estudios de otros lugares; en la isla están por confirmar.'})
  ],
  agua: () => [
    h('h2', {text: 'El agua'}),
    h('p.lead', {text: `En el mapa abierto aparecen ${count.agua} lagunas, charcas, humedales y arroyos, y dos zonas de manglar protegidas.`}),
    h('p.body', {text: 'Pero el mapa no dice lo más importante: de dónde sale el agua que usa cada casa, quién la carga, cuánto cuesta y dónde se guarda. Eso lo sabe la gente de la isla.'}),
    legend([['ring', '#1d93c4', 'Lagunas, charcas, humedales y arroyos', 'Del mapa abierto, sin revisar en campo'], ['ring', '#3f7d23', 'Manglar', 'Zonas marcadas como reserva']]),
    ask('Lo que solo saben los de la isla', ['¿De dónde sale el agua que usan las casas y la escuela?', '¿Quién la carga, cuánto tiempo toma y cuánto cuesta?', '¿Dónde se guarda el agua de lluvia y quién la cuida?'], 'El agua')
  ],
  historia: () => [
    h('h2', {text: 'La historia y los visitantes'}),
    h('p.lead', {text: 'Los fuertes de San Fernando y San José, las baterías del Ángel San Rafael y los faros guardaron la entrada a Cartagena.'}),
    h('p.body', {text: 'Hoy son también lugar de visita. Los visitantes llegan en lancha a Bocachica y caminan a los fuertes y a las playas. ¿Cuánto de lo que dejan se queda en el pueblo?'}),
    legend([['ring', '#7a4b2a', `${count.patrimonio} lugares de historia`, 'Fuertes, baterías y faros'], ['dot', '#8b4aa8', `${count.turismo} lugares de turismo y comercio`, 'Playas, hoteles, restaurantes y tiendas'], ['sw', '#f2b134', 'Lanchas de visitantes', 'Recorrido aproximado desde Cartagena']]),
    ask('Lo que solo saben los de la isla', ['¿Qué historias se cuentan de los fuertes que no están en los libros?', '¿Por dónde caminan los visitantes y por dónde la gente del pueblo?', '¿Qué negocios del pueblo no aparecen en el mapa?'], 'Historia y visitantes')
  ],
  cuenta: () => [
    h('h2', {text: 'Lo que falta lo cuentas tú'}),
    h('p.lead', {text: 'Este mapa se completa con lo que sabe la gente de la isla. Toca el mapa para marcar el lugar y cuéntanos.'}),
    h('form', {id: 'aporte', novalidate: true, onsubmit: send},
      h('label.field', {}, 'Tema', h('select', {name: 'tema'}, ['El mar', 'La vida', 'El agua', 'Historia y visitantes', 'Basuras', 'Otra cosa'].map(t => h('option', {text: t})))),
      h('div.field', {}, 'Lugar', h('p.pin-state', {id: 'pin-state', class: state.pin ? 'pin-state set' : 'pin-state', text: state.pin ? 'Lugar marcado en el mapa. Toca otra parte para moverlo.' : 'Toca el mapa para marcar el lugar.'}), h('input', {name: 'lugar', placeholder: 'Cómo le dicen a ese lugar', autocomplete: 'off'})),
      h('label.field', {}, 'Lo que quieres contar', h('textarea', {name: 'texto', rows: 5})),
      h('label.field', {}, 'Tu nombre (puedes dejarlo vacío)', h('input', {name: 'autor', autocomplete: 'name'})),
      h('label.field', {}, 'Quién puede verlo', h('select', {name: 'acceso'}, h('option', {text: 'Todos, en el mapa'}), h('option', {text: 'Solo el equipo de investigación'}))),
      h('p.form-note', {text: 'No escribas nombres ni datos de niñas o niños. El equipo revisa cada aporte contigo antes de ponerlo en el mapa.'}),
      h('p.form-error', {id: 'form-error', role: 'alert'}),
      h('div.actions', {}, h('button.btn.dark', {type: 'submit', text: 'Enviar por WhatsApp'}), h('button.btn', {type: 'button', id: 'copy', onclick: copy, text: 'Copiar el texto'}))),
    h('h3.sec', {text: 'Más de este proyecto'}),
    h('div.links', {},
      h('a', {href: 'maqueta/'}, h('b', {text: 'La isla y Cartagena en 3D'}), h('span', {text: 'Maqueta sin foto'})),
      h('a', {href: 'historia.html'}, h('b', {text: 'Historia y cartografía'}), h('span', {text: 'Atlas histórico'})),
      h('a', {href: 'movilidad.html'}, h('b', {text: 'La isla en movimiento'}), h('span', {text: 'Recorridos y equipamientos'})),
      h('a', {href: 'indicadores.html'}, h('b', {text: 'Indicadores'}), h('span', {text: 'Lecturas satelitales'})),
      h('a', {href: 'https://anasoficasca-code.github.io/tierrabomba/'}, h('b', {text: 'Especies de la isla'}), h('span', {text: 'Sitio de especies'})),
      h('a', {href: 'assets/programa-marco-v01.pdf', target: '_blank', rel: 'noopener'}, h('b', {text: 'Programa Aula Ambiental'}), h('span', {text: 'PDF'}))),
    h('p.source', {text: 'Tierra Bomba, Aula Ambiental. Promotor académico: Arq. Alejandro Serrano Sierra, Programa de Arquitectura, Pontificia Universidad Javeriana. Desarrollo: Alejandra Gómez y Ana Casas. Fuentes: OpenStreetMap (ODbL), iNaturalist, GloBI, Esri World Imagery, Terrain Tiles y archivo de la tesis.'})
  ]
};
function renderStory() {
  const i = CHAPTERS.indexOf(state.ch), prev = CHAPTERS[i - 1], next = CHAPTERS[i + 1];
  $('#story').replaceChildren(...[h('p.num', {text: `${String(i + 1).padStart(2, '0')} de 06`}), ...STORIES[state.ch](),
    h('div.next', {}, prev ? h('button.prev', {onclick: () => go(prev), text: CH_NAMES[prev]}) : h('span'), next ? h('button', {onclick: () => go(next), text: `Sigue: ${CH_NAMES[next]}`}) : null)].flat(Infinity).filter(Boolean));
}
function renderNav() {
  $('#chapters').replaceChildren(...CHAPTERS.map((c, i) => h('button', {'aria-current': String(c === state.ch), onclick: () => go(c)}, h('b', {text: String(i + 1).padStart(2, '0')}), h('span', {text: CH_NAMES[c]}))));
}
function go(ch, scroll = true) {
  if (!CHAPTERS.includes(ch)) ch = 'isla';
  state.ch = ch; document.body.dataset.ch = ch;
  clearSel();
  for (const id of Object.keys(PT)) model.setPointsVisible(id, PT_BY_CH[ch].includes(id));
  model.setBuildings(ch !== 'vida'); model.setRoads(ch === 'isla' || ch === 'historia' || ch === 'cuenta');
  syncTags(); renderNav(); renderStory();
  fly(camFor(ch));
  history.replaceState(null, '', ch === 'isla' ? location.pathname : '#' + ch);
  if (scroll) { $('#story').scrollTo?.({top: 0}); if (innerWidth < 1000) scrollTo({top: 0, behavior: 'smooth'}); }
}

// ------------------------------------------------------------ cuéntanos
function setPin(ll) {
  state.pin = ll;
  if (state.pinTag) state.pinTag.remove();
  state.pinTag = model.addPlace(h('span.tag.pin', {text: 'Aquí'}), ll, 6);
  const p = $('#pin-state'); if (p) { p.textContent = 'Lugar marcado en el mapa. Toca otra parte para moverlo.'; p.classList.add('set'); }
}
function openCuenta({tema, lugar, texto, coord} = {}) {
  go('cuenta', false);
  const f = $('#aporte');
  if (tema) [...f.tema.options].forEach(o => o.selected = o.text === tema);
  if (lugar) f.lugar.value = lugar;
  if (texto) f.texto.value = texto;
  if (coord) { setPin(coord); fly({center: [...coord, 0], zoom: 15.6, pitch: 50}); }
  if (innerWidth < 1000) $('#story').scrollIntoView({behavior: 'smooth', block: 'start'});
}
function message() {
  const f = $('#aporte');
  const lugar = [f.lugar.value.trim(), state.pin ? `punto ${state.pin[1].toFixed(5)}, ${state.pin[0].toFixed(5)}` : ''].filter(Boolean).join('; ');
  return ['Así se mueve Tierra Bomba: aporte', `Tema: ${f.tema.value}`, `Lugar: ${lugar || 'sin marcar'}`, `Lo que cuento: ${f.texto.value.trim()}`, `Quién lo cuenta: ${f.autor.value.trim() || 'sin nombre'}`, `Quién puede verlo: ${f.acceso.value}`, `Fecha: ${new Date().toLocaleDateString('es-CO')}`].join('\n');
}
function valid() {
  const f = $('#aporte');
  if (!f.texto.value.trim()) { $('#form-error').textContent = 'Escribe lo que quieres contar antes de enviarlo.'; f.texto.focus(); return false; }
  $('#form-error').textContent = ''; return true;
}
function send(e) { e.preventDefault(); if (valid()) open('https://wa.me/?text=' + encodeURIComponent(message()), '_blank', 'noopener'); }
async function copy() {
  if (!valid()) return; const b = $('#copy');
  try { await navigator.clipboard.writeText(message()); b.textContent = 'Texto copiado'; } catch { b.textContent = 'No se pudo copiar'; }
  setTimeout(() => { b.textContent = 'Copiar el texto'; }, 2500);
}

// ------------------------------------------------------------ controles
$('#zin').onclick = () => model.zoomIn();
$('#zout').onclick = () => model.zoomOut();
$('#reset').onclick = () => fly(camFor(state.ch));
$('#tilt').onclick = () => { state.top = !state.top; $('#tilt').textContent = state.top ? 'En 3D' : 'Desde arriba'; fly({pitch: state.top ? 4 : CAMERAS[state.ch].pitch}, 900); };
addEventListener('hashchange', () => go(location.hash.slice(1), false));
// recorta los tramos de cada recorrido que caen sobre tierra en sus extremos, para que la línea llegue a la orilla
function trim(path) {
  const wet = p => model.elevation(p[0], p[1]) <= .5;
  let i = 0, j = path.pts.length - 1;
  while (i < j && !wet(path.pts[i])) i++;
  while (j > i && !wet(path.pts[j])) j--;
  const pts = path.pts.slice(Math.max(0, i - 1), j + 2), d = [0];
  for (let k = 1; k < pts.length; k++) d.push(d[k - 1] + Math.hypot((pts[k][0] - pts[k - 1][0]) * 109.3, (pts[k][1] - pts[k - 1][1]) * 110.6));
  path.pts = pts; path.d = d; path.len = d[d.length - 1];
}
function whenReady() {
  model.refreshPlaces(); $('#loading').textContent = '';
  lanchas.forEach(r => trim(r.path)); trim(canal);
  window.__rutas = {lanchas: lanchas.map(r => ({to: r.to, pts: r.path.pts})), canal: canal.pts};
}
if (model.isReady()) whenReady(); else model.on('load', whenReady);

const first = location.hash.slice(1) || 'isla';
model.easeTo(camFor(first));
go(first, false);
document.body.dataset.ready = 'true';
