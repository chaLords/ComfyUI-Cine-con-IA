const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
// Rotulos que ComfyUI no dibuja: punto de una caja conectada, salidas de Escena y guia.
const source = fs.readFileSync(path.join(__dirname, '../web/cineconia_etiquetas.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '');
function setup() {
  let extension;
  const context = vm.createContext({ app: { registerExtension(e) { extension = e; }, canvas: {} },
    console, globalThis: { LiteGraph: { NODE_TEXT_COLOR: '#aaa', NODE_SUBTEXT_SIZE: 14 } } });
  vm.runInContext(source, context);
  return extension;
}
function escena() {
  const proto = {};
  const nodeType = { prototype: proto };
  const node = Object.create(proto);
  Object.assign(node, {
    comfyClass: 'CineEscenaH3', pos: [100, 200], flags: {},
    widgets: [{ name: 'prompt', options: { multiline: true }, inputEl: { tagName: 'TEXTAREA', placeholder: '' } },
              { name: 'width', value: 416 }],
    inputs: [{ name: 'clip', link: 1 }, { name: 'prompt', link: 14, widget: { name: 'prompt' } },
             { name: 'width', link: 15, widget: { name: 'width' } }],
    outputs: [{ name: 'positive' }, { name: 'positive_escalar' }, { name: 'latent' }],
    getInputPos(i) { return [100, 200 + 20 * i]; },
  });
  return { nodeType, node };
}
function ctxFalso() {
  const textos = [];
  const ctx = new Proxy({ fillText: (t, x, y) => textos.push([t, x, y]) },
    { get: (o, k) => (k in o ? o[k] : () => {}), set: () => true });
  return { ctx, textos };
}

test('el punto de una caja de texto conectada muestra su nombre', async () => {
  const ext = setup(); const { nodeType, node } = escena();
  await ext.beforeRegisterNodeDef(nodeType, { name: 'CineEscenaH3' });
  const { ctx, textos } = ctxFalso();
  node.onDrawForeground(ctx);
  assert.deepEqual(textos.map((t) => t[0]), ['prompt']);   // ni clip ni width: ComfyUI ya los rotula
  assert.equal(textos[0][1], 12);                            // al lado del punto, en coordenadas del nodo
  assert.equal(textos[0][2], 20);
});

test('sin cable no se dibuja nada: la caja esta a la vista', async () => {
  const ext = setup(); const { nodeType, node } = escena();
  node.inputs[1].link = null;
  await ext.beforeRegisterNodeDef(nodeType, { name: 'CineEscenaH3' });
  const { ctx, textos } = ctxFalso();
  node.onDrawForeground(ctx);
  assert.equal(textos.length, 0);
});

test('al abrir un workflow se reponen las etiquetas de salida de Escena', async () => {
  const ext = setup(); const { nodeType, node } = escena();
  await ext.beforeRegisterNodeDef(nodeType, { name: 'CineEscenaH3' });
  node.outputs = [{ name: 'positive' }, { name: 'positive_escalar' }, { name: 'latent' }];  // lo que restaura ComfyUI
  node.onConfigure({});
  assert.deepEqual(node.outputs.map((o) => o.label), ['positive · render', 'positive · escalar', undefined]);
});

test('la caja del prompt explica que es la misma entrada que el cable', async () => {
  const ext = setup(); const { node } = escena();
  await ext.nodeCreated(node);
  assert.match(node.widgets[0].inputEl.placeholder, /conecta el Director/);
});

test('los nodos que no son de Cine con IA no se tocan', async () => {
  const ext = setup(); const proto = {}; const nodeType = { prototype: proto };
  await ext.beforeRegisterNodeDef(nodeType, { name: 'KSampler' });
  assert.equal(proto.onDrawForeground, undefined);
  assert.equal(proto.onConfigure, undefined);
});
