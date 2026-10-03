const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
// Aceleradores H3: qué se apaga en Cargar modelo y qué fija Acc/PDD en el Optimizador.
const acel = fs.readFileSync(path.join(__dirname, '../web/cineconia_aceleradores.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
const faders = fs.readFileSync(path.join(__dirname, '../web/cineconia_faders.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/import\.meta\.url/g, '"http://localhost/x.js"');

const ACC = 'Alibaba MiniMax-H3 Acc/PDD 8 pasos';
const VDN = 'VDN-H3 DMD Turbo 8 pasos';
// Lo que devuelve contrato_aceleradores() en nodes.py (test_nodes.py lo vigila).
const CONTRATO = {
  sin: 'Sin acelerador', perfil: 'MiniMax H3', shift: [12, 3],
  lora_aceleradora: 'vdn|dmd|pdd|acc[_-]lora|acc[_-]8step|turbo|taomate|lightx2v|lightning|distill|(?<![a-z0-9])\\d+[_-]?steps?(?![a-z])',
  reglas: {
    [ACC]: {corto: 'Acc/PDD', archivo: 'acc_lora', sin_gguf: true, exige_variante: true,
      optimizador: {modo: 'Advanced', pasos_advanced: 8, sampler_advanced: 'euler',
        scheduler_advanced: 'simple', denoise_advanced: 1, muestreo: 'Normal', refinar: false}},
    [VDN]: {corto: 'VDN/DMD', archivo: 'vdn_lora', sin_gguf: false, exige_variante: false,
      mismo_pruned: true, recomendado: '8 pasos · euler · simple'},
  },
};

function setup(contrato = CONTRATO) {
  let extension;
  const avisos = [];
  const api = {fetchApi: async (url) => url === '/cineconia/aceleradores'
    ? {ok: Boolean(contrato), json: async () => contrato} : {ok: true, json: async () => ({})}};
  const context = vm.createContext({api, Image: class {}, URL, performance: {now: () => 0},
    app: {registerExtension(e) { extension = e; }, graph: {setDirtyCanvas() {}},
      extensionManager: {toast: {add: (t) => avisos.push(t.detail)}}},
    console: {warn() {}}, Date,
    setTimeout() { return 0; }, clearTimeout() {}, TOMAS_H3: [['Libre', 'libre', '']], conjugarTomaH3: (x) => x,
    PRONOMBRES_H3: {neutro: {}}, huecosH3: () => []});
  vm.runInContext(acel + faders, context);
  return {extension, avisos, fn: (n) => vm.runInContext(n, context)};
}

const plano = (x) => JSON.parse(JSON.stringify(x));
const w = (node, name) => node.widgets.find((x) => x.name === name);
const ctx = new Proxy({measureText: (s) => ({width: String(s).length * 6})},
  {get: (o, k) => (k in o ? o[k] : () => {}), set: () => true});
const esperar = () => new Promise((r) => setImmediate(r));

function cargador(extra = {}) {
  const values = {modelo: 'minimax\\minimax_h3_ref2va_pruned_int8_convrot.safetensors', shift_video: 12,
    shift_audio: 3, lora: 'ninguno', lora_2: 'ninguno', lora_3: 'ninguno', lora_4: 'ninguno',
    perfil: 'MiniMax H3', acelerador: ACC, acc_lora: 'MiniMax-H3-Ref2VA-Acc-8Step.safetensors',
    vdn_lora: 'ninguno', ...extra};
  return {id: 500, type: 'CineCargarH3', mode: 0, outputs: [{links: [42]}],
    widgets: Object.entries(values).map(([name, value]) => ({name, value}))};
}

// el 050 en miniatura: Cargar -> model -> Render <- config <- Optimizador
function grafo050(carga = cargador()) {
  const optimizador = {id: 515, comfyClass: 'CineH3Optimizer', mode: 0, outputs: [{links: [45]}],
    widgets: Object.entries({width: 928, height: 544, frames: 124, modo: 'Auto', perfil: 'AUTO', calidad: 70,
      detalle: 65, movimiento: 65, resolucion: 60, refinar: true, ahorro_vram: 50, pasos_advanced: 20,
      sampler_advanced: 'res_multistep', scheduler_advanced: 'simple', denoise_advanced: 1,
      trocear_atencion_advanced: 32, trocear_ffn_advanced: 32, escala_refinado_advanced: 1.25,
      pasos_refinado_advanced: '4 pasos  ·  recomendado', muestreo: 'Progresivo', transicion_advanced: 7,
      escala_inicial_advanced: 0.5}).map(([name, value]) => ({name, value, type: 'number'})),
    inputs: [], size: [460, 500], computeSize() { return this.size; }, setSize(s) { this.size = s; },
    setDirtyCanvas() {}, serialize() { return {}; },
    addWidget(type, name, value, callback, options) {
      const x = {type, name, value, callback, options}; this.widgets.push(x); return x;
    }};
  const render = {id: 516, type: 'CineH3OptimizedSampler', mode: 0,
    inputs: [{name: 'model', type: 'MODEL', link: 42}, {name: 'config', link: 45}]};
  const nodes = [carga, optimizador, render];
  const graph = {_nodes: nodes, links: {
    42: {origin_id: 500, target_id: 516}, 45: {origin_id: 515, target_id: 516}},
  getNodeById: (id) => nodes.find((n) => n.id === id), setDirtyCanvas() {}};
  optimizador.graph = graph;
  return {graph, optimizador, carga};
}

test('una LoRA de pocos pasos en las ranuras apaga Acc/PDD y VDN', () => {
  const {fn} = setup();
  const lectura = fn('lecturaCargador')(cargador({lora: 'minimaxH3\\TaoMate-H3-3step-ComfyUI.safetensors'}));
  for (const a of [ACC, VDN]) {
    assert.match(fn('bloqueoAcelerador')(CONTRATO, a, lectura), /TaoMate-H3-3step-ComfyUI\.safetensors.*ya es un acelerador/);
  }
  assert.equal(fn('bloqueoAcelerador')(CONTRATO, 'Sin acelerador', lectura), null);
  // una LoRA estética no apaga nada
  const limpio = fn('lecturaCargador')(cargador({lora: 'film_grain_v2.safetensors'}));
  assert.equal(fn('bloqueoAcelerador')(CONTRATO, ACC, limpio), null);
});

test('perfil, GGUF y variante deciden cada botón por separado', () => {
  const {fn} = setup();
  const b = (extra, a = ACC) => fn('bloqueoAcelerador')(CONTRATO, a, fn('lecturaCargador')(cargador(extra)));
  assert.match(b({perfil: 'LTX-2.5'}), /perfil MiniMax H3/);
  assert.equal(b({perfil: 'Personalizado'}), null);
  assert.match(b({modelo: 'h3_ref2va_Q4_K_M.gguf'}), /GGUF/);
  assert.equal(b({modelo: 'h3_ref2va_Q4_K_M.gguf'}, VDN), null);
  assert.match(b({modelo: 'minimax_h3_int8.safetensors'}), /Ref2VA o FL2VA/);
});

test('lo que el servidor rechazaría se avisa sin apagar el botón elegido', () => {
  const {fn} = setup();
  const avisos = (extra) => plano(fn('avisosAcelerador')(CONTRATO, fn('lecturaCargador')(cargador(extra))));
  assert.deepEqual(avisos({}), []);
  // las corridas 11:50 y 11:51 del 2026-10-03
  assert.deepEqual(avisos({acc_lora: 'ninguno'}), ['falta elegir el archivo Acc/PDD']);
  assert.deepEqual(avisos({modelo: 'minimax\\minimax_h3_fl2va_pruned_int8_convrot.safetensors'}),
    ['el archivo es ref2va y el modelo fl2va']);
  assert.deepEqual(avisos({acelerador: VDN, vdn_lora: 'minimax_h3_dmd_ref2va_8step_turbo.safetensors'}),
    ['modelo y archivo deben ser ambos pruned o ambos completos']);
  assert.deepEqual(avisos({shift_video: 6}), ['usa shift 12/3']);
});

test('el Optimizador encuentra su Cargar modelo siguiendo los cables', () => {
  const {fn} = setup();
  const {graph, optimizador, carga} = grafo050();
  assert.equal(fn('cargadorDe')(graph, optimizador), carga);
  // sin cable: el único Cargar activo; con dos sueltos no se adivina
  optimizador.outputs = [{links: []}];
  assert.equal(fn('cargadorDe')(graph, optimizador), carga);
  graph._nodes.push({...cargador(), id: 501});
  assert.equal(fn('cargadorDe')(graph, optimizador), null);
});

test('solo se impide salir del valor fijado', () => {
  const {fn} = setup();
  const reglas = CONTRATO.reglas[ACC].optimizador;
  assert.equal(fn('rechazo')(reglas, 'pasos_advanced', 8, 20), 'pasos 8');
  assert.equal(fn('rechazo')(reglas, 'pasos_advanced', 20, 8), null);    // hacia la regla, sí
  assert.equal(fn('rechazo')(reglas, 'pasos_advanced', 20, 12), null);   // ya estaba mal: no se bloquea
  assert.equal(fn('rechazo')(reglas, 'refinar', false, true), 'segundo pase no');
  assert.equal(fn('rechazo')(reglas, 'perfil', 'AUTO', '8 GB'), null);
  assert.equal(fn('rechazo')(null, 'pasos_advanced', 8, 20), null);
});

test('con Acc/PDD el Optimizador apaga lo incompatible y ofrece ajustar', async () => {
  const {extension, avisos, fn} = setup();
  const {optimizador: node} = grafo050();
  await extension.nodeCreated(node);
  await esperar();
  const estado = fn('estadoAcelerador')(node);
  assert.equal(estado.corto, 'Acc/PDD');
  assert.deepEqual(plano(estado.choques.map((c) => c[0])),
    ['modo', 'pasos_advanced', 'sampler_advanced', 'muestreo', 'refinar']);
  // el chip Progresivo está apagado: el clic no lo elige y explica por qué
  assert.equal(fn('fijadoPor')('muestreo')(node, 'Progresivo'), 'Acc/PDD fija muestreo Normal');
  assert.equal(fn('fijadoPor')('muestreo')(node, 'Normal'), null);
  // «Ajustar a Acc/PDD» es un clic del usuario y deja todo en la receta
  const aviso = w(node, '__acelerador');
  assert.ok(aviso.computeSize(460)[1] > 0);
  aviso.draw(ctx, node, 460, 100);
  assert.equal(aviso.mouse({type: 'pointerdown'}, [460 - 10 - 60, 100 + 17 + 22 + 5], node), true);
  for (const [campo, valor] of Object.entries(CONTRATO.reglas[ACC].optimizador)) {
    assert.equal(w(node, campo).value, valor, campo);
  }
  assert.deepEqual(plano(fn('estadoAcelerador')(node).choques), []);
  // ahora los pasos están fijados: cambiarlos se deshace con un aviso
  fn('marcarFijos')(node);
  assert.equal(w(node, 'pasos_advanced').__fijoAcel, true);
  const pasos = w(node, 'pasos_advanced');
  pasos.value = 20; pasos.callback(20);
  assert.equal(pasos.value, 8);
  assert.match(avisos.at(-1), /Acc\/PDD fija pasos 8/);
  // lo que el acelerador no toca sigue libre
  const perfil = w(node, 'perfil');
  perfil.value = '16 GB'; perfil.callback('16 GB');
  assert.equal(perfil.value, '16 GB');
});

test('sin acelerador, con VDN o sin contrato no se bloquea nada', async () => {
  for (const [contrato, acelerador] of [[CONTRATO, 'Sin acelerador'], [CONTRATO, VDN], [null, ACC]]) {
    const {extension, fn} = setup(contrato);
    const {optimizador: node} = grafo050(cargador({acelerador}));
    await extension.nodeCreated(node);
    await esperar();
    assert.equal(fn('fijadoPor')('muestreo')(node, 'Progresivo'), null, acelerador);
    const pasos = w(node, 'pasos_advanced');
    pasos.value = 12; pasos.callback(12);
    assert.equal(pasos.value, 12, acelerador);
  }
  // VDN solo informa su receta recomendada
  const {extension, fn} = setup();
  const {optimizador: node} = grafo050(cargador({acelerador: VDN}));
  await extension.nodeCreated(node);
  await esperar();
  assert.equal(fn('estadoAcelerador')(node).recomendado, '8 pasos · euler · simple');
});

test('un control nativo fijado se dibuja opaco con su valor a la vista', () => {
  const {fn} = setup();
  let alfa = null;
  const nativo = {name: 'pasos_advanced', value: 8, drawWidget(c) { alfa = c.globalAlpha; }};
  fn('atenuable')(nativo);
  const lienzo = {globalAlpha: 1, save() { this.g = this.globalAlpha; }, restore() { this.globalAlpha = this.g; }};
  nativo.__fijoAcel = true;
  nativo.draw(lienzo, null, 400, 0, 20, false);
  assert.ok(alfa < 0.5);
  nativo.__fijoAcel = false;
  nativo.draw(lienzo, null, 400, 0, 20, false);
  assert.equal(alfa, 1);
  // un widget sin clase nativa (o con draw propio) no se toca
  const propio = {draw() {}};
  const antes = propio.draw;
  fn('atenuable')(propio);
  assert.equal(propio.draw, antes);
});

test('la lista dice qué aceleradores no están disponibles y por qué', () => {
  const {fn} = setup();
  const fuera = (extra) => plano(fn('noDisponibles')(CONTRATO, fn('lecturaCargador')(cargador(extra))));
  assert.deepEqual(fuera({}), []);
  assert.deepEqual(fuera({lora: 'minimaxH3\\TaoMate-H3-3step-ComfyUI.safetensors', acelerador: 'Sin acelerador'}), [
    ['Acc/PDD', 'quita TaoMate-H3-3step-ComfyUI.safetensors de las LoRA: ya es un acelerador'],
    ['VDN/DMD', 'quita TaoMate-H3-3step-ComfyUI.safetensors de las LoRA: ya es un acelerador'],
  ]);
  // un GGUF solo deja fuera a Acc/PDD
  assert.deepEqual(fuera({modelo: 'h3_ref2va_Q4_K_M.gguf'}), [['Acc/PDD', 'no admite modelos GGUF']]);
  // sin contrato (Python anterior) no se marca nada
  assert.deepEqual(plano(fn('noDisponibles')(null, fn('lecturaCargador')(cargador({})))), []);
});
