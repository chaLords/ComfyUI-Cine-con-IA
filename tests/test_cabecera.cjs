const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
// Cabecera tungsteno: a quién se aplica, qué dato muestra y cuándo se queda plana.
const source = fs.readFileSync(path.join(__dirname, '../web/cineconia_cabecera.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
function setup(graph = null) {
  let extension;
  const context = vm.createContext({
    app: {registerExtension(e) { extension = e; }, graph, canvas: {graph}},
    LiteGraph: {ROUND_RADIUS: 8, BOX_SHAPE: 1, NODE_TEXT_SIZE: 14, NODE_FONT: 'Inter', DEFAULT_SHADOW_COLOR: 'rgba(0,0,0,0.5)'},
    document: {getElementById() { return null; }, createElement() { return {}; }, head: {append() {}}},
    setInterval() { return 0; },
  });
  vm.runInContext(source, context);
  return {extension, fn: n => vm.runInContext(n, context)};
}
function tipo(name, python_module = 'custom_nodes.ComfyUI-CineConIA') {
  function T() {}
  T.prototype.getTitle = function () { return this.title; };
  return {T, data: {name, python_module}};
}
async function crear(extension, name, extra = {}) {
  const {T, data} = tipo(name);
  await extension.beforeRegisterNodeDef(T, data);
  const node = Object.assign(new T(), {comfyClass: name, title: 'Cine con IA', mode: 0, inputs: [], widgets: []}, extra);
  extension.nodeCreated(node);
  return node;
}
function ctxFalso(anchoLetra = 7) {
  const log = [];
  const ctx = new Proxy({log, measureText: s => ({width: String(s).length * anchoLetra}),
    createLinearGradient() { const g = {stops: [], addColorStop(o, c) { this.stops.push([o, c]); }}; log.push(['gradient', g]); return g; }},
  {get: (o, k) => k in o ? o[k] : (...a) => log.push([k, ...a]), set: (o, k, v) => { if (k === 'fillStyle') log.push(['fillStyle', v]); o[k] = v; return true; }});
  return ctx;
}
const CONFIG = {steps: 20, sampler: 'res_multistep', scheduler: 'simple', width: 640, height: 1120, profile: '16 GB',
  planner: {status: 'SAFE', capacity_profile: '16 GB'}};

test('solo los nodos de este paquete llevan la cabecera', async () => {
  const {extension, fn} = setup();
  assert.equal(fn('esCine')({name: 'CineEscenaH3', python_module: 'custom_nodes.ComfyUI-CineConIA'}), true);
  assert.equal(fn('esCine')({name: 'CineEscenaH3', python_module: 'custom_nodes.cine-con-ia'}), true);
  assert.equal(fn('esCine')({name: 'CinematicSampler', python_module: 'custom_nodes.otro-paquete'}), false);
  assert.equal(fn('esCine')({name: 'KSampler', python_module: 'nodes'}), false);
  const {T, data} = tipo('KSampler', 'nodes');
  await extension.beforeRegisterNodeDef(T, data);
  assert.equal(T.prototype.onDrawTitleBar, undefined);
  assert.equal(T.title_text_color, undefined);
  const node = await crear(extension, 'CineEscenaH3');
  assert.equal(typeof node.onDrawTitleBar, 'function');
  assert.equal(node.constructor.title_text_color, '#f3f6f5');
  assert.equal(node.titleFontStyle, '600 14px Inter');
});

test('los nodos recién creados salen oscuros, y un color elegido se respeta', async () => {
  const {extension} = setup();
  const nuevo = await crear(extension, 'CineRatioSize');
  assert.equal(nuevo.color, '#283436'); assert.equal(nuevo.bgcolor, '#172123');
  const pintado = await crear(extension, 'CineSalida', {color: '#322', bgcolor: '#533'});
  assert.equal(pintado.color, '#322'); assert.equal(pintado.bgcolor, '#533');
});

test('el Optimizador muestra la VRAM y el semáforo', async () => {
  const {extension, fn} = setup(); const dato = fn('datoVivo');
  const opt = await crear(extension, 'CineH3Optimizer');
  assert.equal(dato(opt), null);
  opt.__h3Preview = {config: CONFIG};
  assert.deepEqual({...dato(opt)}, {texto: '16 GB · MARGEN', corto: 'MARGEN', punto: '#3f8e63'});
  opt.__h3Preview = {config: {...CONFIG, planner: {status: 'UNKNOWN'}}};
  assert.equal(dato(opt).texto, 'SIN DATOS');
});

test('el Render optimizado dice su modo y el tiempo del último render de ese modo', async () => {
  const opt = {__h3Preview: {config: {...CONFIG}}};
  const graph = {links: {5: {origin_id: 9}}, getNodeById: id => id === 9 ? opt : null};
  const {extension, fn} = setup(graph); const dato = fn('datoVivo');
  const ren = await crear(extension, 'CineH3OptimizedSampler', {inputs: [{name: 'config', link: null}], graph});
  assert.equal(dato(ren), null);
  ren.inputs[0].link = 5;
  assert.equal(dato(ren).texto, 'NORMAL · 20 pasos');
  opt.__h3Preview.config.progressive = {enabled: true, status: 'READY', transition_step: 10, steps: 20};
  assert.equal(dato(ren).texto, 'PROGRESIVO · 10/20');
  ren.__h3Ultimo = {mode: 'progresivo', seconds: 212.4};
  assert.equal(dato(ren).texto, 'PROGRESIVO · 10/20 · 3:32');
  ren.__h3Ultimo = {mode: 'normal', seconds: 300};
  assert.equal(dato(ren).texto, 'PROGRESIVO · 10/20');
  opt.__h3Preview.config.progressive.status = 'FALTA_SELFLIFT';
  assert.deepEqual({...dato(ren)}, {texto: 'PROGRESIVO · falta SelfLift', corto: 'PROGRESIVO', punto: '#ed6976'});
});

test('la Escena solo muestra su tamaño en Nodes 2.0, donde la cabecera no lleva logo', async () => {
  const {extension, fn} = setup(); const dato = fn('datoVivo');
  const esc = await crear(extension, 'CineEscenaH3', {widgets: [{name: 'width', value: 640}, {name: 'height', value: 1120}, {name: 'length', value: 124}]});
  assert.equal(dato(esc), null);
  assert.equal(dato(esc, true).texto, '640×1120 · 5.2 s');
});

test('el degradé va siempre: en bypass, silenciado o con color elegido; liso solo de muy lejos', async () => {
  const {extension} = setup();
  const pinta = (n, escala = 1) => { const ctx = ctxFalso(); n.onDrawTitleBar(ctx, 30, [420, 300], escala, 'hsla(189,15%,18%,1)'); return ctx.log; };
  for (const cambio of [{}, {mode: 4}, {mode: 2}, {color: '#322', bgcolor: '#533'}]) {
    const node = await crear(extension, 'CineSalida', cambio);
    const g = pinta(node).find(l => l[0] === 'gradient');
    assert.ok(g, JSON.stringify(cambio));
    assert.deepEqual(g[1].stops.map(s => s[1]), ['#172123', '#283436', '#8f5526', '#e08a3c']);
  }
  const lejos = await crear(extension, 'CineSalida');
  assert.equal(pinta(lejos, 0.4).some(l => l[0] === 'gradient'), false);
});

test('en bypass o silenciado la cápsula lo dice', async () => {
  const {extension, fn} = setup(); const dato = fn('datoVivo');
  const opt = await crear(extension, 'CineH3Optimizer', {__h3Preview: {config: CONFIG}});
  opt.mode = 4; assert.equal(dato(opt).texto, 'BYPASS');
  opt.mode = 2; assert.equal(dato(opt).texto, 'SILENCIADO');
  opt.mode = 0; assert.equal(dato(opt).texto, '16 GB · MARGEN');
});

test('la cápsula no pisa el título: se acorta o desaparece', async () => {
  const opt = await (async () => {
    const {extension} = setup();
    const n = await crear(extension, 'CineH3Optimizer');
    n.__h3Preview = {config: CONFIG};
    return n;
  })();
  const textos = (titulo) => {
    opt.title = titulo;
    const ctx = ctxFalso();
    opt.onDrawTitleBar(ctx, 30, [460, 700], 1, '#283436');
    return ctx.log.filter(l => l[0] === 'fillText').map(l => l[1]);
  };
  assert.deepEqual(textos('Cine con IA · Optimizador H3'), ['16 GB · MARGEN']);
  assert.deepEqual(textos('Cine con IA · Optimizador H3 · rama de pruebas'), ['MARGEN']);
  assert.deepEqual(textos('Cine con IA · Optimizador H3 · rama de pruebas larga de verdad'), []);
});

test('en Nodes 2.0 marca solo nodos Cine y pone el dato en la cabecera', async () => {
  const opt = {};
  const nodos = {};
  const graph = {links: {}, getNodeById: id => nodos[id]};
  const {extension, fn} = setup(graph);
  nodos[1] = await crear(extension, 'CineH3Optimizer', {__h3Preview: {config: CONFIG}});
  nodos[2] = await crear(extension, 'CineRenderH3', {mode: 4});
  const {T, data} = tipo('KSampler', 'nodes'); await extension.beforeRegisterNodeDef(T, data);
  nodos[3] = Object.assign(new T(), {comfyClass: 'KSampler', mode: 0});
  const el = (id) => {
    const attrs = {}, header = {attrs: {}, props: {},
      hasAttribute(k) { return k in this.attrs; }, getAttribute(k) { return this.attrs[k] ?? null; },
      setAttribute(k, v) { this.attrs[k] = String(v); }, removeAttribute(k) { delete this.attrs[k]; },
      style: {setProperty(k, v) { header.props[k] = v; }, getPropertyValue(k) { return header.props[k] ?? ''; }}};
    return {dataset: {nodeId: id}, attrs, header,
      hasAttribute(k) { return k in attrs; }, getAttribute(k) { return attrs[k] ?? null; },
      setAttribute(k, v) { attrs[k] = String(v); }, removeAttribute(k) { delete attrs[k]; },
      querySelector() { return header; }};
  };
  const els = [el(1), el(2), el(3)];
  const doc = {querySelectorAll: () => els};
  assert.equal(fn('actualizarNodosHtml')(doc), 2);
  assert.equal(els[0].hasAttribute('data-cineconia'), true);
  assert.equal(els[0].header.getAttribute('data-cine-dato'), '16 GB · MARGEN');
  assert.equal(els[0].header.props['--cine-punto'], '#3f8e63');
  assert.equal(els[1].hasAttribute('data-cineconia'), true);
  assert.equal(els[1].header.getAttribute('data-cine-dato'), 'BYPASS');
  assert.equal(els[2].hasAttribute('data-cineconia'), false);
  assert.equal(fn('actualizarNodosHtml')({querySelectorAll: () => []}), 0);
});

test('donde la cabecera lleva el logo no hay placa: solo el degradé', async () => {
  const {extension} = setup();
  const salida = await crear(extension, 'CineSalida', {inputs: [{name: 'latente'}, {name: 'vae_video'}]});
  const ctx = ctxFalso();
  salida.onDrawTitleBar(ctx, 30, [460, 300], 1, '#283436');
  assert.equal(ctx.log.filter(l => l[0] === 'roundRect').length, 1);
  assert.ok(ctx.log.some(l => l[0] === 'gradient'));
  // sin entradas el logo va en el cuerpo, y la cabecera queda libre
  const ratio = await crear(extension, 'CineRatioSize');
  const ctx2 = ctxFalso();
  ratio.onDrawTitleBar(ctx2, 30, [460, 300], 1, '#283436');
  assert.equal(ctx2.log.filter(l => l[0] === 'roundRect').length, 1);
});

test('el ancho que deja el panel lateral no se le pega al widget', () => {
  const {fn} = setup();
  const w = fn('anchoFijoAlNodo')({name: 'x', width: 298});
  assert.equal(w.width, undefined);
  w.width = 298;               // lo que hace el panel al pintarlo
  assert.equal(w.width, undefined);
  assert.equal(w.name, 'x');
});

test('solo el lienzo del grafo cuenta como principal', () => {
  const principal = {id: 'grafo'};
  const context = vm.createContext({
    app: {registerExtension() {}, graph: null, canvas: {canvas: principal}},
    LiteGraph: {}, document: {getElementById() { return null; }, createElement() { return {}; }, head: {append() {}}},
    setInterval() { return 0; },
  });
  vm.runInContext(source, context);
  const es = vm.runInContext('esLienzoPrincipal', context);
  assert.equal(es({canvas: principal}), true);
  assert.equal(es({canvas: {id: 'panel'}}), false);
  assert.equal(es({}), true);            // sin lienzo conocido: se trata como principal
});
