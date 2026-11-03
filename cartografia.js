import {createTerritoryModel} from './territory-model.js';

const $ = s => document.querySelector(s);
const fmt = n => n.toLocaleString('es-CO');
// h('tag.clase', {atributos}, ...hijos): crea nodos sin interpolar HTML
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

// ---------------------------------------------------------------- capas
const OSM = 'Mapa abierto (OpenStreetMap), dibujado por voluntarios. Consultado el 3 de noviembre de 2026.';
const LAYERS = [
  {id: 'patrimonio', name: 'Historia y patrimonio', color: '#7a4b2a', on: true,
    shows: 'Fuertes, baterías y faros que aparecen en el mapa abierto.',
    source: OSM, levels: ['done', 'part', '', '', ''],
    missing: ['¿Qué lugares recuerdan los mayores que no aparecen en ningún mapa?', '¿Qué historias se cuentan de cada fuerte y de cada lugar?', '¿Cuáles lugares usa la gente del pueblo y cuáles solo los visitantes?']},
  {id: 'comunidad', name: 'Escuelas y vida comunitaria', color: '#b8325a', on: true,
    shows: 'Escuelas, iglesia, casa comunal, puesto de salud, cementerio y canchas.',
    source: OSM, levels: ['done', 'part', '', '', ''],
    missing: ['¿Dónde y a qué horas el sol y el calor no dejan usar los patios y las canchas?', '¿Qué otros lugares de encuentro tiene el pueblo?', '¿Qué le hace falta a la escuela para ser un refugio del calor?']},
  {id: 'agua', name: 'Agua', color: '#1d93c4', on: true,
    shows: 'Lagunas, charcas, humedales, arroyos y canteras con agua.',
    source: OSM, levels: ['done', 'part', '', '', ''],
    missing: ['¿De dónde sale el agua que usan las casas y la escuela?', '¿Quién la carga, cuánto tiempo toma y cuánto cuesta?', '¿Dónde se guarda el agua de lluvia y quién la cuida?']},
  {id: 'mar', name: 'Mar y oficios', color: '#0f766e', on: true,
    shows: 'Muelles, varadero, espolones, puntas y ensenadas.',
    source: OSM, levels: ['done', 'part', '', '', ''],
    missing: ['¿Dónde se pesca, se arreglan las lanchas y se trabaja la madera?', '¿Quién enseña el oficio y a quién?', '¿Qué ha cambiado en los materiales y en el trabajo del mar?']},
  {id: 'arboles', name: 'Árboles y sombra', color: '#3f7d23', on: false,
    shows: 'Copas de árboles detectadas en una imagen de satélite (solo en el sector norte que cubre el modelo) y reservas de manglar.',
    source: 'Detección automática de copas sobre imagen Esri World Imagery, del archivo de la tesis. Reservas de manglar del mapa abierto (OpenStreetMap).',
    levels: ['done', 'part', 'part', '', ''],
    missing: ['¿Qué árboles dan sombra y frutos en Bocachica?', '¿Dónde se podría sembrar y quién cuidaría lo sembrado?', '¿Cómo se llaman en la isla los árboles y plantas que conocen?']},
  {id: 'vivos', name: 'Seres vivos', color: '#c48a12', on: true,
    shows: 'Animales, plantas y hongos fotografiados por personas en iNaturalist.',
    source: 'iNaturalist, registros ciudadanos con foto. Algunas ubicaciones son aproximadas porque iNaturalist las redondea.',
    levels: ['done', 'part', '', '', ''],
    missing: ['¿Qué animales y plantas conocen y cómo les dicen en la isla?', '¿Cuáles se ven menos que antes?', '¿Quién se come a quién, según lo que han visto?']},
  {id: 'turismo', name: 'Turismo y comercio', color: '#8b4aa8', on: false,
    shows: 'Playas, hoteles, hospedajes, restaurantes y tiendas.',
    source: OSM, levels: ['done', 'part', '', '', ''],
    missing: ['¿Por dónde caminan los visitantes y por dónde la gente del pueblo?', '¿Qué beneficios del turismo se quedan en la isla?', '¿Qué negocios del pueblo no están en el mapa?']},
  {id: 'residuos', name: 'Basuras y residuos', color: '#6b7378', on: false, empty: true,
    shows: 'Todavía no hay ningún dato de basuras en este mapa.',
    source: 'Sin fuente todavía. Esta capa se va a construir con la comunidad.', levels: ['', '', '', '', ''],
    missing: ['¿Dónde se acumula la basura?', '¿Quién la recoge, cada cuánto y a dónde se la llevan?', '¿Qué se podría separar o recuperar, y quién lo haría?']}
];
const BASE_LEVELS = [
  {name: 'Casas', color: '#c9d1cc', levels: ['done', 'part', 'part', '', ''], source: 'Huellas de construcciones del archivo de la tesis. Las alturas son de referencia, no medidas.'},
  {name: 'Caminos', color: '#d5c497', levels: ['done', 'part', '', '', ''], source: 'Vías y senderos del mapa abierto (OpenStreetMap), consultados el 3 de noviembre de 2026.'}
];
const LEVEL_NAMES = ['Archivo', 'Cartografía', 'Modelo', 'Escenarios', 'Actualización'];
const LEVEL_HELP = [
  'Datos reunidos con su fuente, fecha y permiso.',
  'Datos ubicados en el mapa y revisados con la comunidad.',
  'Representación en 2D o 3D con sus supuestos explicados.',
  'Alternativas para comparar: sombra, agua, recorridos.',
  'Seguimiento y corrección con la comunidad.'
];
const layerById = Object.fromEntries(LAYERS.map(l => [l.id, l]));
const SECTORS = [
  {name: 'Bocachica', coord: [-75.5805, 10.3218], zoom: 16, main: true},
  {name: 'Caño del Oro', coord: [-75.5450, 10.3430], zoom: 16},
  {name: 'Punta Arena', coord: [-75.5530, 10.3655], zoom: 15.8},
  {name: 'Tierra Bomba', coord: [-75.5745, 10.3770], zoom: 15.8}
];
const REL = {
  'come:out': 'Se alimenta de', 'come:in': 'Se alimentan de esta especie',
  'flores:out': 'Visita las flores de', 'flores:in': 'Visitan sus flores',
  'visita:out': 'Visita a', 'visita:in': 'La visitan',
  'vive:out': 'Vive sobre o dentro de', 'vive:in': 'Viven sobre o dentro de ella',
  'enferma:out': 'Puede enfermar a', 'enferma:in': 'Pueden enfermarla',
  'ayuda': 'Se benefician juntas'
};
const REL_COLOR = {come: '#b5543c', flores: '#c48a12', visita: '#8a7a2a', vive: '#6a4fa3', enferma: '#4b5560', ayuda: '#0f766e'};
const GROUP_COLORS = ['#3d9fd6', '#5a9e45', '#d4a017', '#1fa8a3', '#d46a9a', '#a67c52', '#e0743a', '#8b6fd6', '#2fae74', '#8a8576'];

// ---------------------------------------------------------------- estado
const state = {view: 'mapa', selected: null, species: null, group: -1, pin: null, pinTag: null, pitchTop: false};
let lugares = [], especies = [], grupos = [], registros = [], relaciones = [], arboles = [], tipos = {};
const adj = new Map();

// ---------------------------------------------------------------- mapa
const map = createTerritoryModel($('#map'), text => { $('#map-status').textContent = text; });
map.easeTo({center: SECTORS[0].coord, zoom: 15.4, pitch: 50, bearing: -12});

const data = await Promise.all([
  fetch('assets/datos/lugares.json').then(r => r.json()),
  fetch('assets/datos/especies.json').then(r => r.json()),
  fetch('assets/datos/interacciones.json').then(r => r.json()),
  fetch('assets/datos/arboles.json').then(r => r.json())
]).catch(error => { $('#map-status').textContent = 'No se pudieron cargar los datos del mapa. Revisa la conexión y vuelve a abrir la página.'; throw error; });
lugares = data[0].lugares;
especies = data[1].especies; grupos = data[1].grupos; registros = data[1].registros;
relaciones = data[2].relaciones; tipos = data[2].tipos;
arboles = data[3].arboles;
for (const [a, b, cat, n] of relaciones) {
  const add = (x, key, other) => { if (!adj.has(x)) adj.set(x, []); adj.get(x).push({key, other, cat, n, a, b}); };
  if (cat === 'ayuda') { add(a, 'ayuda', b); add(b, 'ayuda', a); }
  else { add(a, cat + ':out', b); add(b, cat + ':in', a); }
}
const degree = id => new Set((adj.get(id) || []).map(r => r.other)).size;
const groupColor = sp => GROUP_COLORS[sp.grupo] || '#888';
const foto = sp => `assets/fotos/${sp.tid}.webp`;
const obsBySpecies = new Map();
registros.forEach(([id, lon, lat]) => { if (!obsBySpecies.has(id)) obsBySpecies.set(id, []); obsBySpecies.get(id).push([lon, lat]); });

// puntos sobre el mapa
for (const layer of LAYERS) {
  const pts = lugares.filter(l => l.capa === layer.id).map(l => ({lon: l.lon, lat: l.lat, color: layer.color, r: 6.5, data: {kind: 'lugar', id: l.id}}));
  map.setPoints('lugar-' + layer.id, pts, {visible: layer.on});
}
map.setPoints('arboles', arboles.map(([lon, lat]) => ({lon, lat, color: '#2e6b1c', r: 2.4, data: {kind: 'arbol'}})), {visible: false, stroke: false, lift: 1});
map.setPoints('vivos', registros.map(([id, lon, lat]) => ({lon, lat, color: layerById.vivos.color, r: 4.6, data: {kind: 'obs', id}})), {visible: true, lift: 3});

// etiquetas con nombre
const tags = [];
function addTag(text, coord, cls, color, onclick, priority, layer) {
  const node = h('button.tag' + (cls ? '.' + cls : ''), {style: color ? `--c:${color}` : '', onclick: () => state.view === 'aportar' ? setPin(coord) : onclick(), text});
  if (!onclick) node.disabled = true;
  map.addPlace(node, coord, cls === 'sector' ? 22 : 8);
  tags.push({node, priority, layer});
  return node;
}
SECTORS.forEach(s => addTag(s.name, s.coord, 'sector', null, () => goPlace(s), 10));
const shortName = n => n.replace('Institución Educativa ', 'I. E. ').replace('Fuerte San Fernando de Bocachica', 'Fuerte San Fernando');
lugares.filter(l => (l.capa === 'patrimonio' || l.capa === 'comunidad') && !/^(Cancha|Atractivo)/.test(l.nombre))
  .forEach(l => addTag(shortName(l.nombre), [l.lon, l.lat], '', layerById[l.capa].color, () => select({kind: 'lugar', id: l.id}), l.capa === 'patrimonio' ? 6 : 5, l.capa));
function syncTags() {
  for (const t of tags) t.node.hidden = t.layer ? !layerById[t.layer].on : false;
}
// oculta etiquetas que se montan sobre otras, dejando las de mayor prioridad
setInterval(() => {
  if ($('#map').hidden) return;
  const shown = [];
  tags.slice().sort((a, b) => b.priority - a.priority).forEach(t => {
    if (t.node.hidden || t.node.style.visibility === 'hidden') return;
    const r = t.node.getBoundingClientRect();
    const clash = shown.some(o => r.left < o.right + 4 && r.right > o.left - 4 && r.top < o.bottom + 2 && r.bottom > o.top - 2);
    t.node.style.opacity = clash ? '0' : '1';
    t.node.style.pointerEvents = clash ? 'none' : '';
    if (!clash) shown.push(r);
  });
}, 220);

map.on('click', ({x, y}) => {
  if (state.view === 'aportar') {
    const ll = map.screenToLonLat(x, y);
    if (ll) setPin(ll);
    return;
  }
  const hit = map.pickPoint(x, y, 16);
  if (hit) select(hit); else clearSelection();
});
map.on('load', () => { map.refreshPlaces(); });

function goPlace(s) {
  if (!s) { map.fitBounds(); return; }
  map.flyTo({center: s.coord, zoom: s.zoom, pitch: state.pitchTop ? 4 : 50});
}

// ---------------------------------------------------------------- panel del mapa
function renderPlaces() {
  const box = $('#places');
  box.replaceChildren(
    ...SECTORS.map(s => h('button' + (s.main ? '.main' : ''), {onclick: () => goPlace(s), text: s.name})),
    h('button', {onclick: () => goPlace(null), text: 'Toda la isla'})
  );
}
function layerCount(layer) {
  if (layer.id === 'vivos') return `${fmt(registros.length)} registros de ${fmt(especies.length)} especies`;
  if (layer.id === 'arboles') return `${fmt(arboles.length)} copas detectadas y ${lugares.filter(l => l.capa === 'arboles').length} reservas`;
  const n = lugares.filter(l => l.capa === layer.id).length;
  return `${fmt(n)} ${n === 1 ? 'lugar' : 'lugares'}, sin revisar en campo`;
}
function renderLayers() {
  $('#layers').replaceChildren(...LAYERS.map(layer => {
    const id = 'layer-' + layer.id;
    const input = h('input', {type: 'checkbox', id, checked: layer.on, disabled: layer.empty, onchange: e => setLayer(layer.id, e.target.checked)});
    return h('div.layer', {style: `--c:${layer.color}`},
      input,
      h('label', {for: id}, h('span.name', {text: layer.name}), h('span.state' + (layer.empty ? '.empty' : ''), {text: layer.empty ? 'Aún sin datos' : layerCount(layer)})),
      h('button.more', {onclick: () => showLayer(layer.id), text: 'Qué falta'})
    );
  }));
}
function setLayer(id, on) {
  const layer = layerById[id]; layer.on = on;
  if (id === 'arboles') { map.setPointsVisible('arboles', on); map.setPointsVisible('lugar-arboles', on); }
  else if (id === 'vivos') map.setPointsVisible('vivos', on);
  else map.setPointsVisible('lugar-' + id, on);
  syncTags();
  const box = document.getElementById('layer-' + id); if (box) box.checked = on;
}
function renderBase() {
  const seg = h('div.seg',
    h('button', {'aria-pressed': 'true', onclick: e => setBaseStyle('satellite', e.target), text: 'Satélite'}),
    h('button', {'aria-pressed': 'false', onclick: e => setBaseStyle('model', e.target), text: 'Maqueta'}));
  const check = (label, id, on, fn) => h('label', {}, h('input', {type: 'checkbox', id, checked: on, onchange: e => fn(e.target.checked)}), label);
  $('#base').replaceChildren(seg,
    check('Casas', 'buildings-toggle', true, v => map.setBuildings(v)),
    check('Caminos', 'roads-toggle', true, v => map.setRoads(v)),
    check('Relieve del terreno', 'terrain-toggle', true, v => map.setTerrain(v)),
    check('Modelo Revit del sector norte', 'revit-toggle', false, v => map.setRevit(v)));
}
function setBaseStyle(kind, button) {
  map.setLayoutProperty(kind, 'visibility', 'visible');
  button.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
}

// ---------------------------------------------------------------- fichas
const card = $('#card');
const setCard = (...kids) => card.replaceChildren(...kids.flat(Infinity).filter(k => k !== null && k !== undefined && k !== false));
function closeButton() { return h('button.close', {'aria-label': 'Cerrar ficha', onclick: clearSelection, text: '×'}); }
function kindLine(color, text) { return h('p.kind', {style: `--c:${color}`}, h('i'), text); }
function select(d) {
  state.selected = d;
  map.setHighlight(x => x && x.kind === d.kind && (d.kind === 'lugar' ? x.id === d.id : d.kind === 'obs' ? x.id === d.id : false));
  if (d.kind === 'lugar') cardLugar(lugares.find(l => l.id === d.id));
  else if (d.kind === 'obs') cardObs(especies[d.id]);
  else if (d.kind === 'arbol') cardArbol();
  if (innerWidth < 980) card.scrollIntoView({behavior: 'smooth', block: 'start'});
}
function clearSelection() {
  state.selected = null; map.setHighlight(null);
  if (state.view === 'mapa') setCard();
}
function cardLugar(l) {
  const layer = layerById[l.capa];
  setCard(closeButton(),
    kindLine(layer.color, `${l.tipo} en ${layer.name.toLowerCase()}`),
    h('h3', {text: l.nombre}),
    h('dl', {},
      h('dt', {text: 'Qué tipo de dato es'}), h('dd', {text: 'Dato de mapa abierto'}),
      h('dt', {text: 'De dónde viene'}), h('dd', {}, 'OpenStreetMap, un mapa que dibujan voluntarios. ', h('a', {href: l.url, target: '_blank', rel: 'noopener', text: 'Ver el dato original'})),
      h('dt', {text: 'Cuándo se consultó'}), h('dd', {text: '3 de noviembre de 2026'}),
      h('dt', {text: 'Ubicación'}), h('dd', {text: l.ubicacion === 'punto exacto' ? 'Punto marcado en el mapa abierto' : 'Centro del área dibujada en el mapa abierto'}),
      h('dt', {text: 'Revisado con la comunidad'}), h('dd', {text: 'Todavía no'})),
    l.nota ? h('p.check', {}, h('b', {text: 'Para revisar'}), l.nota) : null,
    h('div.actions', {}, h('button.btn.primary', {onclick: () => openAportar({tema: layer.id, lugar: l.nombre, coord: [l.lon, l.lat], clase: 'Corrección'}), text: 'Corregir o completar este lugar'})));
}
function speciesFacts(sp) {
  const rank = sp.rango === 'species' || sp.rango === 'subspecies' ? null : 'Este registro agrupa varias especies parecidas que no se distinguieron en la foto.';
  return [
    h('dt', {text: 'Qué tipo de dato es'}), h('dd', {text: 'Registro ciudadano con foto'}),
    h('dt', {text: 'De dónde viene'}), h('dd', {}, 'iNaturalist, donde cualquier persona sube fotos de seres vivos. ', h('a', {href: `https://www.inaturalist.org/taxa/${sp.tid}`, target: '_blank', rel: 'noopener', text: 'Ver la especie en iNaturalist'})),
    h('dt', {text: 'Registros en la isla'}), h('dd', {text: `${fmt(sp.registros)} ${sp.registros === 1 ? 'registro' : 'registros'}, entre ${sp.primero.slice(0, 4)} y ${sp.ultimo.slice(0, 4)}`}),
    rank ? [h('dt', {text: 'Nota'}), h('dd', {text: rank})] : null,
    h('dt', {text: 'Ubicación'}), h('dd', {text: 'Aproximada: iNaturalist puede redondear la ubicación para proteger a la especie o a quien la fotografió.'})
  ];
}
function cardObs(sp) {
  setCard(closeButton(),
    kindLine(groupColor(sp), grupos[sp.grupo]),
    h('h3', {text: sp.nombre}), h('p.sci', {text: sp.cientifico}),
    h('img.photo', {src: foto(sp), alt: `Foto de ${sp.nombre}`, loading: 'lazy'}),
    h('dl', {}, speciesFacts(sp)),
    h('div.actions', {},
      h('button.btn.primary', {onclick: () => { state.species = sp.id; go('vivos'); }, text: degree(sp.id) ? `Ver sus ${degree(sp.id)} relaciones` : 'Ver en la red de seres vivos'}),
      h('button.btn', {onclick: () => openAportar({tema: 'vivos', texto: `Sobre ${sp.nombre} (${sp.cientifico}): `}), text: 'Contar algo de esta especie'})));
}
function cardArbol() {
  setCard(closeButton(),
    kindLine('#2e6b1c', 'Árboles y sombra'),
    h('h3', {text: 'Copa de árbol vista desde el satélite'}),
    h('dl', {},
      h('dt', {text: 'Qué tipo de dato es'}), h('dd', {text: 'Interpretación automática de una imagen'}),
      h('dt', {text: 'De dónde viene'}), h('dd', {text: 'Detección de copas sobre la imagen de satélite Esri World Imagery, hecha para el archivo de la tesis.'}),
      h('dt', {text: 'Qué no dice'}), h('dd', {text: 'No dice qué árbol es, ni su tamaño real, ni si da sombra a un lugar usado. Solo cubre el sector norte que tiene modelo Revit.'}),
      h('dt', {text: 'Revisado con la comunidad'}), h('dd', {text: 'Todavía no'})),
    h('div.actions', {}, h('button.btn.primary', {onclick: () => openAportar({tema: 'arboles', clase: 'Dato que falta'}), text: 'Contar qué árbol es'})));
}
function showLayer(id) {
  const layer = layerById[id];
  if (state.view !== 'mapa') go('mapa');
  state.selected = {kind: 'capa', id}; map.setHighlight(null);
  const reached = layer.levels.filter(Boolean).length;
  setCard(closeButton(),
    kindLine(layer.color, 'Capa del mapa'),
    h('h3', {text: layer.name}),
    h('p.lead', {text: layer.shows}),
    h('dl', {},
      h('dt', {text: 'De dónde vienen los datos'}), h('dd', {text: layer.source}),
      h('dt', {text: 'Hasta dónde va'}), h('dd', {text: reached ? `${LEVEL_NAMES[reached - 1]} (paso ${reached} de 5). ${layer.levels[reached - 1] === 'part' ? 'Falta revisar los datos en campo con la comunidad.' : ''}` : 'No ha empezado. Se construye con lo que cuente la comunidad.'})),
    h('p.check', {}, h('b', {text: 'Lo que falta por saber'}), h('ul.ask', {}, layer.missing.map(q => h('li', {text: q})))),
    h('div.actions', {}, h('button.btn.primary', {onclick: () => openAportar({tema: id, clase: 'Dato que falta'}), text: 'Contar algo de este tema'})));
  if (innerWidth < 980) card.scrollIntoView({behavior: 'smooth', block: 'start'});
}

// ---------------------------------------------------------------- seres vivos
function renderGroups() {
  const all = h('button', {'aria-pressed': String(state.group === -1), onclick: () => { state.group = -1; renderGroups(); renderSpeciesList(); }, text: 'Todos'});
  $('#groups').replaceChildren(all, ...grupos.map((g, i) => h('button', {style: `--c:${GROUP_COLORS[i]}`, 'aria-pressed': String(state.group === i), onclick: () => { state.group = i; renderGroups(); renderSpeciesList(); }}, h('i'), g)));
}
function renderSpeciesList() {
  const q = $('#q').value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const list = especies.filter(sp => (state.group === -1 || sp.grupo === state.group) && (!q || norm(sp.nombre).includes(q) || norm(sp.cientifico).includes(q)))
    .sort((a, b) => degree(b.id) - degree(a.id) || b.registros - a.registros);
  const withRel = list.filter(sp => degree(sp.id)).length;
  $('#list-note').textContent = `${fmt(list.length)} ${list.length === 1 ? 'especie' : 'especies'}; ${fmt(withRel)} con relaciones conocidas. Primero las que más se relacionan.`;
  $('#species').replaceChildren(...list.map(sp => h('li', {}, h('button', {'aria-current': String(state.species === sp.id), style: `--c:${groupColor(sp)}`, onclick: () => showSpecies(sp.id, true)},
    h('img', {src: foto(sp), alt: '', loading: 'lazy', width: 52, height: 52}),
    h('span', {}, h('span.n1', {text: sp.nombre}), h('span.n2', {text: sp.cientifico})),
    h('span.deg', {text: degree(sp.id) ? `${degree(sp.id)}` : ''})))));
}
function showSpecies(id, scroll) {
  state.species = id;
  renderNet(id); cardSpecies(especies[id]);
  $('#species').querySelectorAll('button').forEach(b => b.setAttribute('aria-current', 'false'));
  renderSpeciesList();
  if (scroll) (innerWidth < 980 ? $('.net-block') : $('#net')).scrollIntoView({behavior: 'smooth', block: 'start'});
}
function groupsOf(id) {
  const order = Object.keys(REL), by = new Map();
  for (const r of adj.get(id) || []) {
    if (!by.has(r.key)) by.set(r.key, new Map());
    const m = by.get(r.key); m.set(r.other, (m.get(r.other) || 0) + r.n);
  }
  return order.filter(k => by.has(k)).map(k => ({key: k, cat: k.split(':')[0], items: [...by.get(k)].sort((a, b) => b[1] - a[1]).map(([o]) => o)}));
}
function renderNet(id) {
  const sp = especies[id], net = $('#net'), groups = groupsOf(id);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const center = h('div.center', {style: `--c:${groupColor(sp)}`},
    h('img', {src: foto(sp), alt: `Foto de ${sp.nombre}`}),
    h('div', {}, h('h3', {text: sp.nombre}), h('p', {text: `${grupos[sp.grupo]}. ${groups.length ? `Toca otra especie para ver sus relaciones.` : ''}`})));
  const rels = h('div.rels', {}, groups.map(g => h('section.rel', {style: `--rc:${REL_COLOR[g.cat]}`, 'data-cat': g.cat},
    h('h4', {}, h('i'), REL[g.key]),
    h('div.chips', {}, g.items.map(o => {
      const other = especies[o];
      return h('button.chip', {style: `--c:${groupColor(other)}`, onclick: () => showSpecies(o, true), title: other.cientifico},
        h('img', {src: foto(other), alt: '', loading: 'lazy', width: 64, height: 64}), h('span', {text: other.nombre}));
    })))));
  const empty = groups.length ? null : h('p.net-empty', {}, 'Todavía no hay relaciones documentadas entre esta especie y otras registradas en la isla. ',
    h('button.btn', {style: 'margin-top:14px', onclick: () => openAportar({tema: 'vivos', texto: `Sobre ${sp.nombre}: `}), text: 'Contar con quién se relaciona'}));
  const note = h('p.net-source', {text: 'Las relaciones vienen de GloBI, una base que reúne estudios científicos de todo el mundo. Que dos especies se relacionen en otros lugares no prueba que lo hagan en Tierra Bomba: eso hay que confirmarlo aquí, con lo que la gente ha visto.'});
  net.replaceChildren(svg, h('div.ego', {}, center, empty, rels), note);
  requestAnimationFrame(() => drawNetLines(svg, center, rels));
}
function drawNetLines(svg, center, rels) {
  const box = $('#net').getBoundingClientRect();
  const img = center.querySelector('img').getBoundingClientRect();
  const cx = img.left + img.width / 2 - box.left, cy = img.top + img.height / 2 - box.top, cr = img.width / 2;
  svg.replaceChildren();
  rels.querySelectorAll('.rel').forEach(sec => {
    const mark = sec.querySelector('h4 i').getBoundingClientRect();
    const tx = mark.left - box.left, ty = mark.top + mark.height / 2 - box.top;
    const ang = Math.atan2(ty - cy, tx - cx), sx = cx + Math.cos(ang) * cr, sy = cy + Math.sin(ang) * cr;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const mx = Math.min(sx, tx - 16);
    path.setAttribute('d', `M${sx},${sy} C${mx},${sy + (ty - sy) * .35} ${mx},${ty} ${tx},${ty}`);
    path.setAttribute('fill', 'none'); path.setAttribute('stroke', REL_COLOR[sec.dataset.cat]); path.setAttribute('stroke-width', '3'); path.setAttribute('stroke-linecap', 'round');
    svg.append(path);
  });
}
new ResizeObserver(() => { if (state.view === 'vivos' && state.species !== null) { const svg = $('#net svg'), c = $('#net .center'), r = $('#net .rels'); if (svg && c && r) drawNetLines(svg, c, r); } }).observe($('#net'));
function cardSpecies(sp) {
  const groups = groupsOf(sp.id);
  setCard(
    kindLine(groupColor(sp), grupos[sp.grupo]),
    h('h3', {text: sp.nombre}), h('p.sci', {text: sp.cientifico}),
    h('dl', {}, speciesFacts(sp)),
    h('div.actions', {},
      h('button.btn.primary', {onclick: () => showOnMap(sp.id), text: 'Ver dónde se ha visto'}),
      h('button.btn', {onclick: () => openAportar({tema: 'vivos', texto: `Sobre ${sp.nombre} (${sp.cientifico}): `}), text: 'Contar algo de esta especie'})),
    groups.length ? h('div.rel-list', {}, groups.map(g => [h('h4', {text: REL[g.key]}), h('ul', {}, g.items.map(o => {
      const r = (adj.get(sp.id) || []).filter(x => x.other === o && x.key === g.key).reduce((s, x) => s + x.n, 0);
      const e = (adj.get(sp.id) || []).find(x => x.other === o && x.key === g.key);
      const url = `https://www.globalbioticinteractions.org/?sourceTaxon=${encodeURIComponent(especies[e.a].cientifico)}&targetTaxon=${encodeURIComponent(especies[e.b].cientifico)}`;
      return h('li', {}, h('button', {onclick: () => showSpecies(o, true), text: especies[o].nombre}), h('a', {href: url, target: '_blank', rel: 'noopener', text: `${r} ${r === 1 ? 'fuente' : 'fuentes'} en GloBI`}));
    }))])) : null,
    h('p.small', {text: 'Foto de iNaturalist. Cada foto conserva la licencia de quien la tomó.'}));
}
function showOnMap(id) {
  go('mapa');
  setLayer('vivos', true);
  map.setHighlight(x => x && x.kind === 'obs' && x.id === id);
  state.selected = {kind: 'obs', id}; cardObs(especies[id]);
  const pts = obsBySpecies.get(id) || [];
  if (pts.length) {
    const lon = pts.reduce((s, p) => s + p[0], 0) / pts.length, lat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const spread = Math.max(...pts.map(p => Math.hypot(p[0] - lon, (p[1] - lat))));
    map.flyTo({center: [lon, lat], zoom: spread > .02 ? 13.6 : spread > .006 ? 14.8 : 15.8, pitch: 45});
  }
}

// ---------------------------------------------------------------- cómo se hace
function renderMethod() {
  const row = (name, color, levels, note) => h('tr', {}, h('th', {scope: 'row'}, h('i', {style: `--c:${color}`}), name),
    levels.map(v => h('td' + (v ? '.' + v : ''), {text: v === 'done' ? 'Hecho' : v === 'part' ? 'En curso' : ''})), h('td', {text: note}));
  const types = [
    ['Dato de mapa abierto', 'Lugares, caminos y agua tomados de OpenStreetMap. Útiles para empezar, pero nadie de la isla los ha revisado todavía.'],
    ['Registro ciudadano', 'Fotos de seres vivos subidas a iNaturalist por visitantes y vecinos.'],
    ['Interpretación de imagen', 'Lo que un programa reconoce en una foto de satélite, como las copas de los árboles. Puede equivocarse.'],
    ['Relación documentada en estudios', 'Quién se come a quién o quién visita qué flor, según estudios hechos en otros lugares (GloBI).'],
    ['Recuerdo o testimonio', 'Lo que cuenta la gente de la isla. Todavía no hay ninguno en el mapa: se agregan después de revisarlos juntos.'],
    ['Propuesta', 'Ideas para sombra, agua, recorridos o basuras. Aparecerán cuando se diseñen con la comunidad.']
  ];
  $('#method').replaceChildren(
    h('section', {},
      h('h2', {text: 'Cómo se construye este mapa'}),
      h('p', {text: 'Este mapa reúne lo que ya se sabe de Tierra Bomba y deja ver lo que falta. Cada punto dice de dónde viene, cuándo se tomó y si ya fue revisado con la comunidad. Lo que ustedes cuenten se revisa juntos antes de aparecer, y quien lo cuenta decide si lo ve todo el mundo o solo el equipo.'}),
      h('p', {text: 'El trabajo empieza en Bocachica. Lo que se sabe de otros sectores de la isla no se da por cierto para Bocachica sin revisarlo allá.'})),
    h('section', {},
      h('h2', {text: 'Hasta dónde va cada tema'}),
      h('p', {text: 'El mapa crece en cinco pasos. Un tema solo pasa al siguiente cuando el anterior está completo.'}),
      h('div.levels-wrap', {}, h('table.levels', {},
        h('thead', {}, h('tr', {}, h('th', {text: 'Tema'}), LEVEL_NAMES.map((n, i) => h('th', {title: LEVEL_HELP[i], text: `${i + 1}. ${n}`})), h('th', {text: 'De dónde vienen los datos'}))),
        h('tbody', {}, LAYERS.map(l => row(l.name, l.color, l.levels, l.source)), BASE_LEVELS.map(b => row(b.name, b.color, b.levels, b.source))))),
      h('div.types', {}, LEVEL_NAMES.map((n, i) => h('div', {}, h('b', {text: `${i + 1}. ${n}`}), h('span', {text: LEVEL_HELP[i]}))))),
    h('section', {},
      h('h2', {text: 'Qué tipo de dato es cada punto'}),
      h('div.types', {}, types.map(([t, d]) => h('div', {}, h('b', {text: t}), h('span', {text: d}))))),
    h('section', {},
      h('h2', {text: 'Lo que falta por saber'}),
      h('p', {text: 'Estas preguntas no tienen respuesta en ningún mapa. Las responde la gente de la isla.'}),
      h('div.missing', {}, LAYERS.map(l => h('div', {style: `--c:${l.color}`}, h('h3', {text: l.name}), h('ul', {}, l.missing.map(q => h('li', {text: q}))),
        h('button.btn', {onclick: () => openAportar({tema: l.id, clase: 'Dato que falta'}), text: 'Contar algo de este tema'}))))),
    h('section', {},
      h('h2', {text: 'Quiénes hacen este mapa'}),
      h('p', {text: 'Este mapa es el componente digital del programa Tierra Bomba, Aula Ambiental, propuesto por el arquitecto Alejandro Serrano Sierra (Programa de Arquitectura, Pontificia Universidad Javeriana). Desarrollo del mapa: Alejandra Gómez y Ana Casas. La propuesta se conversa con ACOPI Bolívar; ninguna organización aparece aquí como aliada sin su autorización.'}),
      h('p', {}, 'Documento base: ', h('a', {href: 'assets/programa-marco-v01.pdf', target: '_blank', rel: 'noopener', text: 'programa marco, versión 0.1 (PDF)'}), '.'),
      h('h3', {text: 'Fuentes'}),
      h('p', {text: 'OpenStreetMap, © colaboradores de OpenStreetMap, licencia ODbL 1.0, consultado el 3 de noviembre de 2026. iNaturalist, export de 729 registros y 436 especies; cada foto conserva la licencia de su autor. GloBI (Global Biotic Interactions), consultado el 3 de noviembre de 2026. Imagen de satélite Esri World Imagery (Esri, Maxar, Earthstar Geographics). Relieve Terrain Tiles (Mapzen y AWS Open Data); no reemplaza un levantamiento topográfico. Huellas de construcciones, máscara costera, modelo Revit y detección de copas: archivo de la tesis.'})));
}

// ---------------------------------------------------------------- contar algo
const form = $('#aporte');
function renderTemas() {
  $('#tema').replaceChildren(...LAYERS.map(l => h('option', {value: l.id, text: l.name})), h('option', {value: 'otro', text: 'Otro tema'}));
}
function setPin(ll) {
  state.pin = ll;
  if (state.pinTag) state.pinTag.remove();
  state.pinTag = map.addPlace(h('span.tag.pin', {text: 'Aquí'}), ll, 6);
  $('#pin-state').textContent = 'Lugar marcado en el mapa. Toca otra parte para moverlo.';
  $('#pin-state').classList.add('set');
}
function openAportar({tema, lugar, texto, coord, clase} = {}) {
  go('aportar');
  if (tema) form.tema.value = tema;
  if (lugar) form.lugar.value = lugar;
  if (texto) form.texto.value = texto;
  if (clase) [...form.clase].forEach(r => r.checked = r.value === clase);
  if (coord) { setPin(coord); map.flyTo({center: coord, zoom: 16, pitch: 50}); }
  if (innerWidth < 980) $('.side-aportar').scrollIntoView({behavior: 'smooth', block: 'start'});
}
function message() {
  const f = new FormData(form), tema = form.tema.selectedOptions[0]?.textContent || '';
  const lugar = [f.get('lugar').trim(), state.pin ? `punto ${state.pin[1].toFixed(5)}, ${state.pin[0].toFixed(5)}` : ''].filter(Boolean).join('; ');
  return ['Mapa vivo de Tierra Bomba: aporte', `Qué es: ${f.get('clase')}`, `Tema: ${tema}`, `Lugar: ${lugar || 'sin marcar'}`, `Lo que cuento: ${f.get('texto').trim()}`,
    `Quién lo cuenta: ${f.get('autor').trim() || 'sin nombre'}`, `Quién puede verlo: ${f.get('acceso')}`, `Fecha: ${new Date().toLocaleDateString('es-CO')}`].join('\n');
}
function valid() {
  if (!form.texto.value.trim()) { $('#form-error').textContent = 'Escribe lo que quieres contar antes de enviarlo.'; form.texto.focus(); return false; }
  $('#form-error').textContent = ''; return true;
}
function store(text) {
  try {
    const list = JSON.parse(localStorage.getItem('aportes-tierrabomba') || '[]');
    list.unshift({fecha: new Date().toISOString(), texto: text});
    localStorage.setItem('aportes-tierrabomba', JSON.stringify(list.slice(0, 50)));
  } catch {}
  renderSaved();
}
function renderSaved() {
  let list = [];
  try { list = JSON.parse(localStorage.getItem('aportes-tierrabomba') || '[]'); } catch {}
  $('#saved').replaceChildren(...list.map(a => {
    const lines = a.texto.split('\n');
    return h('li', {}, (lines.find(l => l.startsWith('Lo que cuento: ')) || '').replace('Lo que cuento: ', ''), h('span', {text: `${new Date(a.fecha).toLocaleDateString('es-CO')}. ${(lines.find(l => l.startsWith('Tema: ')) || '').replace('Tema: ', '')}`}));
  }));
}
form.addEventListener('submit', e => {
  e.preventDefault(); if (!valid()) return;
  const text = message(); store(text);
  open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
});
$('#copy').addEventListener('click', async () => {
  if (!valid()) return;
  const text = message(); store(text);
  try { await navigator.clipboard.writeText(text); $('#copy').textContent = 'Texto copiado'; }
  catch { $('#copy').textContent = 'No se pudo copiar'; }
  setTimeout(() => $('#copy').textContent = 'Copiar el texto', 2500);
});

// ---------------------------------------------------------------- vistas
const VIEWS = ['mapa', 'vivos', 'metodo', 'aportar'];
function go(view, push = true) {
  if (!VIEWS.includes(view)) view = 'mapa';
  const prev = state.view; state.view = view;
  document.body.dataset.view = view;
  document.querySelectorAll('.views button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.go === view)));
  const mapOn = view === 'mapa' || view === 'aportar';
  $('#map').hidden = !mapOn;
  if (mapOn) requestAnimationFrame(() => { map.resize(); map.requestRender(); });
  $('#map-hint').textContent = view === 'aportar' ? 'Toca el mapa para marcar el lugar del que quieres hablar.' : 'Toca un punto para ver qué es y de dónde viene el dato.';
  if (view === 'vivos') { if (state.species === null) state.species = especies.findIndex(s => s.cientifico === 'Iguana iguana'); showSpecies(state.species, false); }
  else if (view === 'mapa' && prev !== 'mapa') { setCard(); if (state.selected?.kind === 'obs') cardObs(especies[state.selected.id]); }
  if (push && location.hash.slice(1) !== (view === 'mapa' ? '' : view)) history.replaceState(null, '', view === 'mapa' ? location.pathname : '#' + view);
  if (view !== prev) scrollTo({top: 0});
}
document.querySelectorAll('.views button').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
addEventListener('hashchange', () => go(location.hash.slice(1), false));
$('#zoom-in').addEventListener('click', () => map.zoomIn());
$('#zoom-out').addEventListener('click', () => map.zoomOut());
$('#view-tilt').addEventListener('click', () => {
  state.pitchTop = !state.pitchTop;
  map.easeTo({pitch: state.pitchTop ? 4 : 50});
  $('#view-tilt').textContent = state.pitchTop ? 'Ver en 3D' : 'Ver desde arriba';
});
$('#q').addEventListener('input', renderSpeciesList);

renderPlaces(); renderLayers(); renderBase(); renderGroups(); renderSpeciesList(); renderMethod(); renderTemas(); renderSaved(); syncTags();
go(location.hash.slice(1) || 'mapa', false);
document.body.dataset.ready = 'true';
