const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
// Cronómetro: tramos por nodo, total, historial y dato de la cabecera.
const source = fs.readFileSync(path.join(__dirname, '../web/cineconia_cronometro.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
function setup() {
  let extension;
  const context = vm.createContext({
    app: {registerExtension(e) { extension = e; }, graph: null, canvas: {}},
    api: {addEventListener() {}},
    pintarCabecera() {}, COLOR_BASE: '#283436', anchoFijoAlNodo: (w) => w, esLienzoPrincipal: () => true,
    performance: {now: () => 0}, setInterval() { return 1; }, clearInterval() {},
  });
  vm.runInContext(source, context);
  return {extension, fn: n => vm.runInContext(n, context)};
}
const titulos = {1: 'Escena', 2: '04A · Render normal', 3: 'Salida A'};
// los objetos creados dentro del vm tienen otro Array: se comparan en plano
const plano = (x) => JSON.parse(JSON.stringify(x));

test('el reloj se lee como en un cronómetro', () => {
  const {fn} = setup();
  assert.equal(fn('formatoReloj')(212400), '3:32.4');
  assert.equal(fn('formatoReloj')(5000), '0:05.0');
  assert.equal(fn('formatoCorto')(212400), '3:32');
  assert.equal(fn('formatoReloj')(3723000), '1:02:03');
});

test('cada nodo cuenta desde que empieza hasta que empieza el siguiente', () => {
  const {fn} = setup();
  const M = fn('Medidor'); const m = new M(id => titulos[id]);
  m.empezar(1000, {timestamp: 50000});
  m.cache({nodes: ['7', '8']});
  m.ejecutando(1010, '1');
  m.ejecutando(4010, '2');
  m.progreso({value: 7, max: 20});
  assert.deepEqual({...m.paso}, {value: 7, max: 20});
  m.ejecutando(216410, '3');
  const r = m.terminar(226410, 'listo', {timestamp: 275500});
  assert.deepEqual(plano(r.tramos.map(t => [t.titulo, t.ms])), [['Escena', 3000], ['04A · Render normal', 212400], ['Salida A', 10000]]);
  assert.equal(r.total, 225500);          // marcas del servidor
  assert.equal(r.enCache, 2);
  assert.equal(m.paso, null);
});

test('si no llega el aviso de éxito, el executing vacío cierra la corrida', () => {
  const {fn} = setup();
  const M = fn('Medidor'); const m = new M(id => titulos[id]);
  m.empezar(0);
  m.ejecutando(0, '1');
  m.ejecutando(500, null);
  assert.equal(m.estado, 'listo');
  assert.equal(m.total(), 500);
  // y no se cierra dos veces
  assert.equal(m.terminar(900, 'listo'), null);
});

test('con muchos nodos quedan los que más tardaron y el resto se suma', () => {
  const {fn} = setup();
  const M = fn('Medidor'); const m = new M(id => 'n' + id);
  m.empezar(0);
  let t = 0;
  for (let i = 1; i <= 10; i++) { m.ejecutando(t, String(i)); t += i * 100; }
  m.terminar(t, 'listo');
  const v = m.tramosVisibles(t, 4);
  assert.equal(v.length, 4);
  assert.deepEqual(plano(v.slice(0, 3).map(x => x.titulo)), ['n8', 'n9', 'n10']);
  assert.equal(v[3].titulo, 'otros 7 nodos');
  assert.equal(v[3].ms, (1 + 2 + 3 + 4 + 5 + 6 + 7) * 100);
});

test('el historial guarda el total y el muestreo de cada Render optimizado', () => {
  const {fn} = setup();
  const e = fn('entradaHistorial')({estado: 'listo', total: 760400}, [{modo: 'normal', ms: 312000}, {modo: 'progresivo', ms: 212400}], new Date(2026, 8, 24, 19, 42));
  assert.equal(fn('textoHistorial')(e), '24/09 19:42 · total 12:40 · normal 5:12 · progresivo 3:32');
  const f = fn('entradaHistorial')({estado: 'interrumpido', total: 60000}, [], new Date(2026, 8, 24, 20, 5));
  assert.equal(fn('textoHistorial')(f), '24/09 20:05 · total 1:00 · interrumpido');
});

test('la cabecera dice si está corriendo o cómo terminó', () => {
  const {fn} = setup();
  const M = fn('Medidor'); const m = new M(() => 'x');
  assert.equal(fn('datoCabecera')(m, 0), null);
  m.empezar(0);
  assert.equal(fn('datoCabecera')(m, 65000).texto, 'EN CURSO · 1:05');
  m.terminar(90000, 'listo');
  assert.equal(fn('datoCabecera')(m, 999999).texto, 'LISTO · 1:30');
  m.empezar(0); m.terminar(1000, 'error');
  assert.equal(fn('datoCabecera')(m, 0).punto, '#ed6976');
});

test('el nombre del modelo se lee corto', () => {
  const {fn} = setup();
  const nm = fn('nombreModelo');
  assert.equal(nm('minimax\\Minimax-h3_Singularity_ref2va_Pruned_v1.3_int8.safetensors'), 'Singularity v1.3');
  assert.equal(nm('minimax\\minimax_h3_ref2va_pruned_int8_convrot.safetensors'), 'H3 oficial');
  assert.equal(nm('otro/modelo.gguf'), 'modelo');
  assert.equal(nm(''), '');
});

// un grafo como el del 047/048: cargador, optimizador, selector
function grafo(config, extra = {}) {
  const w = (name, value) => ({name, value});
  return {_nodes: [
    {type: 'CineCargarH3', mode: 0, widgets: [w('modelo', 'minimax\\Minimax-h3_Singularity_ref2va_Pruned_v1.3_int8.safetensors')]},
    {type: 'CineCargarH3', mode: 4, widgets: [w('modelo', 'minimax\\minimax_h3_ref2va_pruned_int8_convrot.safetensors')]},
    {type: 'CineH3Optimizer', mode: 0, __h3Preview: {config}},
    {type: 'CineSelector', mode: 0, __cabeceraDato: {texto: 'Singularity v1.3 · 20 · final'}},
    ...(extra.nodos || []),
  ]};
}
const CONFIG = {steps: 20, sampler: 'res_multistep', scheduler: 'simple', width: 544, height: 928,
  frames: 124, refine: true, refine_scale: 1.27};

test('cada corrida sabe con qué se hizo', () => {
  const {fn} = setup();
  const d = plano(fn('detalleCorrida')(grafo(CONFIG)));
  assert.deepEqual(d, {modelo: 'Singularity v1.3', archivo: 'Minimax-h3_Singularity_ref2va_Pruned_v1.3_int8.safetensors',
    pasos: 20, sampler: 'res_multistep', scheduler: 'simple', resolucion: '704×1184', segundos: 5.2,
    loras: [], refinado: '×1.27', rama: 'Singularity v1.3 · 20 · final'});
  // la config que manda el servidor manda sobre la vista previa
  const d2 = plano(fn('detalleCorrida')(grafo(CONFIG), {...CONFIG, steps: 8, sampler: 'er_sde', refine: false}));
  assert.equal(d2.pasos, 8);
  assert.equal(d2.resolucion, '544×928');
  assert.equal(d2.refinado, 'no');
});

test('el historial guarda el detalle y el desglose por nodo, y se copia como tabla', () => {
  const {fn} = setup();
  const M = fn('Medidor'); const m = new M(id => ({1: '06 · Render', 2: '07 · Escalar'})[id]);
  m.empezar(0); m.ejecutando(0, '1'); m.ejecutando(654000, '2');
  const r = m.terminar(866000, 'listo');
  const d = fn('detalleCorrida')(grafo(CONFIG));
  const e = fn('entradaHistorial')(r, [], new Date(2026, 8, 26, 13, 57), d);
  assert.equal(fn('textoHistorial')(e), '26/09 13:57 · Singularity v1.3 · 20p · 704×1184 · 14:26');
  assert.deepEqual(plano(e.tramos), [{titulo: '06 · Render', ms: 654000}, {titulo: '07 · Escalar', ms: 212000}]);
  const tabla = fn('tablaHistorial')([e]).split('\n');
  assert.equal(tabla.length, 2);
  assert.ok(tabla[0].startsWith('fecha\testado\ttotal\tmodelo\tpasos'));
  assert.ok(tabla[1].includes('Singularity v1.3\t20\tres_multistep\tsimple\t704×1184\t5.2'));
  assert.ok(tabla[1].endsWith('06 · Render 10:54 | 07 · Escalar 3:32'));
});

test('las corridas viejas, sin detalle, se siguen leyendo igual', () => {
  const {fn} = setup();
  const vieja = {cuando: '26/09 12:51', estado: 'listo', total: 656000, renders: [{modo: 'normal', ms: 490000}]};
  assert.equal(fn('textoHistorial')(vieja), '26/09 12:51 · total 10:56 · normal 8:10');
  assert.ok(fn('tablaHistorial')([vieja]).split('\n')[1].startsWith('26/09 12:51\tlisto\t10:56'));
});

test('el nombre corto sirve para cualquier modelo y LoRA', () => {
  const {fn} = setup();
  assert.equal(fn('nombreModelo')('wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors'), 'wan2.2 i2v high noise 14B');
  assert.equal(fn('nombreModelo')('diffusion_models/ltx-2.5-dev-fp8.safetensors'), 'ltx 2.5 dev');
  assert.equal(fn('nombreModelo')('wan2.2_t2v_Q4_K_M.gguf'), 'wan2.2 t2v Q4KM');
  assert.equal(fn('nombreLora')('minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors'), 'turbo 4step v0.1');
  assert.equal(fn('nombreLora')('wan2.2_i2v_lightx2v_4steps_lora_v1.safetensors'), 'wan2.2 i2v lightx2v…');
});

test('la corrida guarda LoRA, progresivo, refinado y semilla', () => {
  const {fn} = setup();
  const w = (name, value) => ({name, value});
  const refinar = {id: 519, type: 'CineEscalarRefinar', mode: 0,
    widgets: [w('activar', true), w('escala', 1.25), w('pasos', '4 pasos  ·  recomendado'), w('semilla', 835)],
    inputs: [{name: 'activar', link: 49}, {name: 'escala', link: 50}, {name: 'pasos', link: 51}]};
  const render = {id: 516, type: 'CineH3OptimizedSampler', mode: 0, widgets: [w('semilla', 1)],
    inputs: [{name: 'semilla', widget: {name: 'semilla'}, link: 59}]};
  const semilla = {id: 600, type: 'PrimitiveNode', mode: 0, widgets: [w('semilla', 833), w('control_after_generate', 'fixed')]};
  const g = grafo({...CONFIG, steps: 3, refine_steps: '4 pasos  ·  recomendado',
    progressive: {requested: true, enabled: true, transition_step: 1, steps: 3}}, {nodos: [refinar, render, semilla]});
  g._nodes[0].widgets.push(w('lora', 'TAO_h3_v1.safetensors'), w('lora_fuerza', 1), w('lora_2', 'otra.safetensors'), w('lora_fuerza_2', 0));
  g.links = {59: {id: 59, origin_id: 600}};
  const d = plano(fn('detalleCorrida')(g));
  assert.deepEqual(d.loras, [{nombre: 'TAO v1', fuerza: 1, archivo: 'TAO_h3_v1.safetensors'}]);
  assert.equal(d.progresivo, 'sí');
  assert.equal(d.progresivo_paso, '1/3');
  assert.equal(d.refinado, '×1.27 4p');          // la escala llega por cable: manda la config
  assert.equal(d.resolucion, '704×1184');
  assert.equal(d.semilla, 833);                  // la del nodo del otro lado del cable
  const e = fn('entradaHistorial')({estado: 'listo', total: 441000}, [], new Date(2026, 8, 27, 12, 40), d);
  assert.equal(fn('textoHistorial')(e), '27/09 12:40 · Singularity v1.3 · 3p · TAO v1 ×1 · progresivo · 704×1184 · 7:21');
  assert.deepEqual(plano(fn('partesHistorial')(e)).total, '7:21');
  assert.equal(fn('lineaDetalle')(d),
    'res_multistep/simple · LoRA TAO v1 ×1 · progresivo 1/3 · refina ×1.27 4p · semilla 833 · Selector: Singularity v1.3 · 20 · final');
  const tabla = fn('tablaHistorial')([e]).split('\n');
  assert.ok(tabla[0].includes('\tsegundos\tlora\tprogresivo\trefinado\tsemilla\trama\t'));
  assert.ok(tabla[1].includes('\tTAO v1 ×1 (TAO_h3_v1.safetensors)\tsí 1/3\t×1.27 4p\t833\t'));
});

test('el progresivo que no se aplicó y el refinado apagado quedan dichos', () => {
  const {fn} = setup();
  const refinar = {type: 'CineEscalarRefinar', mode: 0, widgets: [{name: 'activar', value: false}, {name: 'escala', value: 1.25}]};
  const d = plano(fn('detalleCorrida')(grafo({...CONFIG, progressive: {requested: true, enabled: false}}, {nodos: [refinar]})));
  assert.equal(d.progresivo, 'no aplicó');
  assert.equal(d.refinado, 'no');
  assert.equal(d.resolucion, '544×928');
  const e = fn('entradaHistorial')({estado: 'listo', total: 1000}, [], new Date(2026, 8, 27, 9, 5), d);
  assert.ok(fn('textoHistorial')(e).includes(' · 20p · progresivo no aplicó · 544×928 · '));
  assert.ok(fn('lineaDetalle')(d).includes('sin LoRA · progresivo no aplicó · sin refinado'));
});

test('una semilla que cambia sola no se anota como si fuera la usada', () => {
  const {fn} = setup();
  const k = {type: 'KSampler', mode: 0, widgets: [{name: 'seed', value: 99}, {name: 'control_after_generate', value: 'randomize'},
    {name: 'steps', value: 20}, {name: 'sampler_name', value: 'euler'}, {name: 'scheduler', value: 'normal'}]};
  assert.equal(plano(fn('detalleCorrida')({_nodes: [k]})).semilla, 'variable (randomize)');
});

test('otros modelos: UNET, LoRA de ComfyUI y KSampler', () => {
  const {fn} = setup();
  const w = (name, value) => ({name, value});
  const g = {_nodes: [
    {type: 'UNETLoader', mode: 0, widgets: [w('unet_name', 'wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors'), w('weight_dtype', 'default')]},
    {type: 'UNETLoader', mode: 0, widgets: [w('unet_name', 'wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors'), w('weight_dtype', 'default')]},
    {type: 'LoraLoaderModelOnly', mode: 0, widgets: [w('lora_name', 'wan2.2_i2v_lightx2v_4steps_lora_v1.safetensors'), w('strength_model', 1)]},
    {type: 'LoraLoaderModelOnly', mode: 4, widgets: [w('lora_name', 'apagada.safetensors'), w('strength_model', 1)]},
    {type: 'WanImageToVideo', mode: 0, widgets: [w('width', 480), w('height', 832), w('length', 81)]},
    {type: 'KSamplerAdvanced', mode: 0, widgets: [w('add_noise', 'enable'), w('noise_seed', 42), w('control_after_generate', 'fixed'),
      w('steps', 6), w('cfg', 1), w('sampler_name', 'euler'), w('scheduler', 'simple')]},
  ]};
  const d = plano(fn('detalleCorrida')(g));
  assert.equal(d.modelo, 'wan2.2 i2v high noise 14B +1');
  assert.equal(d.archivo, 'wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors + wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors');
  assert.deepEqual(d.loras.map((l) => [l.nombre, l.fuerza]), [['wan2.2 i2v lightx2v…', 1]]);
  assert.deepEqual([d.pasos, d.sampler, d.scheduler, d.resolucion, d.semilla], [6, 'euler', 'simple', '480×832', 42]);
  assert.equal(d.refinado, undefined);
  const e = fn('entradaHistorial')({estado: 'listo', total: 300000}, [], new Date(2026, 8, 28, 10, 0), d);
  assert.equal(fn('textoHistorial')(e), '28/09 10:00 · wan2.2 i2v high noise 14B +1 · 6p · wan2.2 i2v lightx2v… ×1 · 480×832 · 5:00');
});
