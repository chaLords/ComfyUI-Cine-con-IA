const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
// Presets que mueven los faders, estado CUSTOM y puntos de color por preset.
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
function makeNode() {
  const values={width:416,height:736,frames:192,modo:'Auto',perfil:'16 GB',calidad:70,detalle:65,
    movimiento:65,resolucion:60,refinar:true,ahorro_vram:50,pasos_advanced:20,sampler_advanced:'res_multistep',
    scheduler_advanced:'simple',denoise_advanced:1,trocear_atencion_advanced:16,trocear_ffn_advanced:16,
    escala_refinado_advanced:1.25,pasos_refinado_advanced:'4 pasos  ·  recomendado'};
  return {comfyClass:'CineH3Optimizer',widgets:Object.entries(values).map(([name,value])=>({name,value,type:'number'})),
    inputs:[],size:[460,500],computeSize(){return this.size},setSize(s){this.size=s},setDirtyCanvas(){},
    serialize(){return {}},addWidget(type,name,value,callback,options){const w={type,name,value,callback,options};this.widgets.push(w);return w}};
}
const w = (node, name) => node.widgets.find(x => x.name === name);
const ctx = new Proxy({measureText:s=>({width:String(s).length*6})},{get:(o,k)=>k in o?o[k]:(()=>{}),set:()=>true});
const BASE16 = {refine:true, refine_scale:1.27, attention_chunks:20, ffn_chunks:20};

test('pulsar un preset lo aplica: escala y ahorro vuelven al neutro', () => {
  const {fn} = setup(); const node = makeNode();
  w(node,'resolucion').value = 90; w(node,'ahorro_vram').value = 10;
  assert.equal(fn('esCustom')(node), true);
  fn('aplicarPreset')(node);
  assert.equal(w(node,'resolucion').value, 60); assert.equal(w(node,'ahorro_vram').value, 50);
  assert.equal(fn('esCustom')(node), false);
});

test('calidad y refinado no cuentan como CUSTOM: no son memoria', () => {
  const {fn} = setup(); const node = makeNode();
  w(node,'calidad').value = 95; w(node,'detalle').value = 20;
  assert.equal(fn('esCustom')(node), false);
});

test('en modo avanzado no hay CUSTOM', () => {
  const {fn} = setup(); const node = makeNode();
  w(node,'resolucion').value = 90; w(node,'modo').value = 'Advanced';
  assert.equal(fn('esCustom')(node), false);
});

test('el fader de escala muestra el valor efectivo y su inverso lo recupera', () => {
  const {fn} = setup(); const node = makeNode(); node.__h3Preview = {base: BASE16};
  const E = fn('ABS_ESCALA');
  assert.equal(E.valor(node), 1.27);
  // fuera del recorte a x1.00: por debajo de 6 todos los valores dan x1.00
  for (const r of [10, 30, 60, 80, 100]) {
    w(node,'resolucion').value = r;
    assert.equal(Math.round(E.offset(node, E.valor(node))), r);
  }
  w(node,'refinar').value = false; assert.equal(E.valor(node), 1.0);
});

test('la ventana del ahorro se desplaza con el perfil', () => {
  const {fn} = setup(); const node = makeNode(); const A = fn('ABS_AHORRO');
  node.__h3Preview = {base: {...BASE16, attention_chunks: 32}};
  assert.deepEqual([...A.ventana(node)], [32, 44]);
  node.__h3Preview = {base: {...BASE16, attention_chunks: 8}};
  assert.deepEqual([...A.ventana(node)], [8, 20]);
});

test('los chips de perfil dibujan el punto de cada preset sin fallar', async () => {
  const {extension} = setup(); const node = makeNode(); await extension.nodeCreated(node);
  node.__h3Preview = {base: BASE16, ladder: {AUTO:'SAFE','8 GB':'SAFE','12 GB':'SAFE','16 GB':'SAFE','24 GB':'TIGHT','32 GB':'RISKY'}};
  w(node,'resolucion').value = 90;
  const chips = w(node,'__chips_perfil');
  assert.doesNotThrow(() => chips.draw(ctx, node, 460, 0));
  for (const name of ['__fader_resolucion','__fader_ahorro_vram']) {
    assert.doesNotThrow(() => w(node,name).draw(ctx, node, 460, 0));
  }
});
