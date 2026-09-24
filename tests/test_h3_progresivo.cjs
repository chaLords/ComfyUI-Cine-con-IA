const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
// Chips de muestreo, controles solo-progresivo y resumen del Render optimizado.
const source = fs.readFileSync(path.join(__dirname, '../web/cineconia_faders.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/import\.meta\.url/g, '"http://localhost/x.js"');
function setup() {
  let extension;
  const context = vm.createContext({api:{fetchApi:async()=>({ok:true,json:async()=>({})})},Image:class{},URL,
    performance:{now:()=>0},app:{registerExtension(e){extension=e},graph:{setDirtyCanvas(){}}},
    setTimeout(){return 0},clearTimeout(){},TOMAS_H3:[['Libre','libre','']],conjugarTomaH3:x=>x,
    PRONOMBRES_H3:{neutro:{}},huecosH3:()=>[]});
  vm.runInContext(source, context);
  return {extension, fn: n => vm.runInContext(n, context)};
}
function makeNode(extra = {muestreo:'Normal', transicion_advanced:10, escala_inicial_advanced:0}) {
  const values={width:640,height:1120,frames:124,modo:'Auto',perfil:'AUTO',calidad:70,detalle:65,
    movimiento:65,resolucion:60,refinar:false,ahorro_vram:50,pasos_advanced:20,sampler_advanced:'euler',
    scheduler_advanced:'simple',denoise_advanced:1,trocear_atencion_advanced:26,trocear_ffn_advanced:26,
    escala_refinado_advanced:1.25,pasos_refinado_advanced:'4 pasos  ·  recomendado',...extra};
  return {comfyClass:'CineH3Optimizer',widgets:Object.entries(values).map(([name,value])=>({name,value,type:'number'})),
    inputs:[],size:[460,500],computeSize(){return this.size},setSize(s){this.size=s},setDirtyCanvas(){},
    serialize(){return {}},addWidget(type,name,value,callback,options){const w={type,name,value,callback,options};this.widgets.push(w);return w}};
}
function makeRender() {
  return {comfyClass:'CineH3OptimizedSampler',widgets:[{name:'semilla',value:833,type:'number'}],
    inputs:[{name:'config',link:null}],size:[460,300],computeSize(){return this.size},setSize(s){this.size=s},
    setDirtyCanvas(){},serialize(){return {}},addWidget(){}};
}
const w = (node, name) => node.widgets.find(x => x.name === name);
const ctx = new Proxy({measureText:s=>({width:String(s).length*6})},{get:(o,k)=>k in o?o[k]:(()=>{}),set:()=>true});
const PROG = {requested:true, enabled:true, status:'READY', transition_step:10, steps:20,
  low_width:384, low_height:672, lowres_scale:0.6, notes:[]};

test('los chips de muestreo solo aparecen si el servidor trae el modo', async () => {
  const {extension} = setup();
  const viejo = makeNode({}); await extension.nodeCreated(viejo);
  assert.equal(w(viejo, '__chips_muestreo'), undefined);
  const nuevo = makeNode(); await extension.nodeCreated(nuevo);
  assert.ok(w(nuevo, '__chips_muestreo'));
  assert.equal(w(nuevo, 'muestreo').hidden, true);
  assert.equal(w(nuevo, 'transicion_advanced').label, 'pasos a baja resolución');
});

test('los controles del tramo inicial solo se ven en Advanced + Progresivo', async () => {
  const {extension, fn} = setup(); const node = makeNode(); await extension.nodeCreated(node);
  const vis = () => fn('visibilidad')(node);
  const t = w(node, 'transicion_advanced'), e = w(node, 'escala_inicial_advanced'), pasos = w(node, 'pasos_advanced');
  assert.equal(t.hidden, true); assert.equal(pasos.hidden, true);
  w(node, 'modo').value = 'Advanced'; vis();
  assert.equal(pasos.hidden, false); assert.equal(t.hidden, true); assert.equal(e.hidden, true);
  w(node, 'muestreo').value = 'Progresivo'; vis();
  assert.equal(t.hidden, false); assert.equal(e.hidden, false); assert.equal(t.value, 10);
  w(node, 'modo').value = 'Auto'; vis();
  assert.equal(t.hidden, true); assert.equal(pasos.hidden, true);
});

test('pulsar Progresivo cambia el valor guardado', async () => {
  const {extension} = setup(); const node = makeNode(); await extension.nodeCreated(node);
  const chips = w(node, '__chips_muestreo');
  chips.draw(ctx, node, 460, 100);
  const y = 100 + 17 + 5 + 11;  // cabecera + separación + mitad del chip
  for (let x = 0; x < 460 && w(node, 'muestreo').value !== 'Progresivo'; x += 4) {
    chips.mouse({type:'pointerdown'}, [x, y], node);
  }
  assert.equal(w(node, 'muestreo').value, 'Progresivo');
});

test('el aviso de la cabecera dice que va a hacer el modo progresivo', () => {
  const {fn} = setup(); const node = makeNode();
  const aviso = fn('avisoMuestreo');
  assert.equal(aviso(node), null);
  w(node, 'muestreo').value = 'Progresivo';
  node.__h3Preview = {config: {progressive: PROG}};
  assert.equal(aviso(node).texto, '• 10 de 20 pasos a 384×672');
  node.__h3Preview.config.progressive = {...PROG, low_width:192, low_height:320};
  assert.match(aviso(node).texto, /bajo 384 px/);
  node.__h3Preview.config.progressive = {...PROG, enabled:false, status:'NO_APLICA'};
  assert.match(aviso(node).texto, /no aplica/);
  node.__h3Preview.config.progressive = {...PROG, status:'FALTA_SELFLIFT'};
  assert.match(aviso(node).texto, /falta SelfLift/);
});

test('el Render optimizado lee el Optimizador conectado y muestra el último render', async () => {
  const {extension, fn} = setup(); const render = makeRender(); await extension.nodeCreated(render);
  assert.deepEqual(render.widgets.map(x => x.name), ['__logo', '__render', 'semilla']);
  assert.equal(fn('planDelRender')(render).texto, 'conecta la config del Optimizador');
  const opt = {__h3Preview: {config: {width:640, height:1120, steps:20, sampler:'res_multistep', scheduler:'simple', progressive: PROG}}};
  render.inputs[0].link = 5;
  render.graph = {links: {5: {origin_id: 9}}, getNodeById: id => id === 9 ? opt : null};
  assert.equal(fn('planDelRender')(render).texto, 'progresivo · 10 de 20 pasos a 384×672 → 640×1120 · euler');
  opt.__h3Preview.config.progressive = {requested:false, enabled:false, status:'OFF'};
  assert.equal(fn('planDelRender')(render).texto, 'normal · 20 pasos · res_multistep / simple');
  render.onExecuted({h3_render: [{mode:'progresivo', seconds:212.4, transition_step:10, steps:20,
    low:[384,672], full:[640,1120], seed:833}]});
  assert.equal(fn('resumenUltimo')(render.__h3Ultimo),
    'último: 3 min 32 s · progresivo · 10/20 a 384×672 → 640×1120 · semilla 833');
  assert.equal(fn('resumenUltimo')({mode:'normal', seconds:58, steps:20, sampler:'euler', seed:1}),
    'último: 58 s · normal · 20 pasos · euler · semilla 1');
  render.widgets[1].draw(ctx, render, 460, 60);
});
