const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '../web/cineconia_faders.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/import\.meta\.url/g, '"http://localhost/extensions/cineconia/faders.js"');
function setup(api = {fetchApi: async () => ({ok:true,json:async()=>({config:{steps:20}})})}) {
  let extension;
  const timers = new Map();let counter=0;
  const context = vm.createContext({api,Image:class{}, URL,performance:{now:()=>0},
    app:{registerExtension(e){extension=e},graph:{setDirtyCanvas(){}}},
    setTimeout(fn){timers.set(++counter,fn);return counter},clearTimeout(id){timers.delete(id)},
    TOMAS_H3:[['Libre','libre',''],['Orbita','Orbita','The camera arcs.']],
    conjugarTomaH3:x=>x,PRONOMBRES_H3:{neutro:{}},huecosH3:()=>[],
  });
  vm.runInContext(source,context);
  return {context,extension,timers,fn:name=>vm.runInContext(name,context)};
}
function makeNode(type='CineH3Optimizer') {
  const values={width:416,height:736,frames:192,modo:'Auto',perfil:'AUTO',calidad:70,detalle:65,
    movimiento:65,resolucion:60,refinar:true,ahorro_vram:50,pasos_advanced:20,
    sampler_advanced:'res_multistep',scheduler_advanced:'simple',denoise_advanced:1,
    trocear_atencion_advanced:16,trocear_ffn_advanced:16,escala_refinado_advanced:1.25,
    pasos_refinado_advanced:'4 pasos  ·  recomendado'};
  return {comfyClass:type,widgets:Object.entries(values).map(([name,value])=>({name,value,type:'number'})),
    inputs:[],size:[460,500],computeSize(){return this.size},setSize(s){this.size=s},setDirtyCanvas(){},
    serialize(){return {widgets_values:this.widgets.map(w=>w.value)}},
    addWidget(type,name,value,callback,options){const w={type,name,value,callback,options};this.widgets.push(w);return w}};
}
test('decorative controls never shift values on save and reopen', async()=>{
  const {extension,fn}=setup();const a=makeNode();await extension.nodeCreated(a);
  a.widgets.find(w=>w.name==='calidad').value=88;
  const saved=a.serialize();assert.equal(saved.widgets_values.length,19);
  assert.equal(saved.widgets_values_named.calidad,88);
  const b=makeNode();await extension.nodeCreated(b);b.onConfigure(saved);
  for(const [key,value] of Object.entries(saved.widgets_values_named))assert.equal(b.widgets.find(w=>w.name===key).value,value);
  assert.equal(fn('payloadDe')(b).fields.sampler_advanced,'res_multistep');
});
test('named values recover an old positional layout with decorative holes',async()=>{
 const {extension}=setup();const node=makeNode();await extension.nodeCreated(node);
 const info={widgets_values:new Array(30).fill(null),widgets_values_named:{sampler_advanced:'res_multistep',calidad:70}};
 node.onConfigure(info);assert.equal(node.widgets.find(w=>w.name==='calidad').value,70);
 assert.equal(node.widgets.find(w=>w.name==='sampler_advanced').value,'res_multistep');
});
test('advanced controls appear only in advanced mode and retain values',async()=>{
 const {extension,fn}=setup();const node=makeNode();await extension.nodeCreated(node);
 const advanced=node.widgets.find(w=>w.name==='pasos_advanced');assert.equal(advanced.hidden,true);
 node.widgets.find(w=>w.name==='modo').value='Advanced';fn('visibilidad')(node);
 assert.equal(advanced.hidden,false);assert.equal(advanced.value,20);
 assert.equal(node.widgets.find(w=>w.name==='__fader_calidad').hidden,true);
});
test('connected dimensions send the source settings, never stale local dimensions',()=>{
 const {fn}=setup();const node=makeNode();node.inputs=[{name:'width',link:1}];
 node.graph={links:{1:{origin_id:20,origin_slot:0}},getNodeById:()=>({type:'CineRatioSize',widgets:[{name:'tamano',value:'0.40 MP'}],outputs:[{name:'width'}]})};
 assert.equal(fn('payloadDe')(node).sources.width.fields.tamano,'0.40 MP');
 node.graph.getNodeById=()=>({type:'UnknownCustomNode'});assert.throws(()=>fn('payloadDe')(node));
});
test('the memory indicator uses the server result and remains unknown on failure',()=>{
 const {fn}=setup();const node=makeNode();assert.equal(fn('planificar')(node).estado,'SIN DATOS');
 node.__h3Preview={config:{planner:{status:'RISKY',capacity_ratio:1.9,recommendations:['reduce resolution']}}};
 assert.equal(fn('planificar')(node).estado,'RIESGO');assert.equal(fn('planificar')(node).ratio,1.9);
});
test('late preview responses cannot overwrite a newer selection',async()=>{
 const pending=[];const {fn,timers}=setup({fetchApi:()=>new Promise(resolve=>pending.push(resolve))});const node=makeNode();
 fn('actualizarPreview')(node);const first=[...timers.values()].at(-1)();
 node.widgets.find(w=>w.name==='perfil').value='8 GB';fn('actualizarPreview')(node);const second=[...timers.values()].at(-1)();
 pending[1]({ok:true,json:async()=>({config:{profile:'8 GB'}})});await second;
 pending[0]({ok:true,json:async()=>({config:{profile:'32 GB'}})});await first;
 assert.equal(node.__h3Preview.config.profile,'8 GB');
});
test('camera cards draw and select a real camera value',()=>{
 const {fn}=setup();const node=makeNode('CineCameraDirectorH3');node.widgets=[{name:'plano',value:'sin especificar'}];
 fn('addTarjetas')(node,'plano','encuadre',[['Rostro','primer plano',1.8]],true);
 const card=node.widgets.at(-1);const ctx=new Proxy({measureText:s=>({width:s.length*5})},{get:(o,k)=>o[k]||(()=>{})});
 card.draw(ctx,node,460,0);assert.equal(card.mouse({type:'pointerdown'},[30,35],node),true);
 assert.equal(node.widgets[0].value,'primer plano');
});
