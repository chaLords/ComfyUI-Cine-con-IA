const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../web/cineconia.js'), 'utf8');
const helpers = source.slice(source.indexOf('async function consultarPrompt('),
  source.indexOf('/**\n * Boton dibujado', source.indexOf('async function consultarPrompt(')));
const cameraHelpers = source.slice(source.indexOf('const PLANOS_EN = {'),
  source.indexOf('// --- leer la camara', source.indexOf('const PLANOS_EN = {')));

function setup(api) {
  const context = vm.createContext({ api,
    widgetSeGuarda: (w) => w.serialize !== false && w.options?.serialize !== false,
    findWidget: (node, name) => node.widgets?.find((w) => w.name === name),
  });
  vm.runInContext(helpers, context);
  return context;
}

function setupCamera() {
  const context = vm.createContext({
    findWidget: (node, name) => node.widgets?.find((w) => w.name === name),
  });
  vm.runInContext(cameraHelpers, context);
  return context;
}

test('preview excludes decorative controls and marks connected values as unavailable', async () => {
  let sent;
  const ctx = setup({ fetchApi: async (url, options) => {
    assert.equal(url, '/cineconia/prompt_preview');
    sent = JSON.parse(options.body);
    return {ok: true, json: async () => ({prompt: 'built by Python'})};
  }});
  const result = await ctx.consultarPrompt({inputs: [{name: 'extra', link: 7}], widgets: [
    {name: 'camara', value: 'The camera pans left.'},
    {name: 'extra', value: 'stale value'},
    {name: '__button', serialize: false, value: null},
  ]});
  assert.deepEqual(sent, {camara: 'The camera pans left.'});
  assert.equal(result.conectados.join(','), 'extra');
  assert.equal(result.prompt, 'built by Python');
});

test('preview reports a server failure instead of displaying stale text', async () => {
  const ctx = setup({fetchApi: async () => ({ok: false})});
  await assert.rejects(() => ctx.consultarPrompt({widgets: []}), /Reinicia ComfyUI/);
});

test('guide warning requires a connected image anchored at frame zero', () => {
  const ctx = setup({});
  const frame = {name: 'fotograma_guia', value: 0};
  const mode = {name: 'modo_guia', value: 'exacta  ·  fija fotograma 0'};
  const input = {name: 'imagen_guia', link: 13};
  const scene = {type: 'CineEscenaH3', widgets: [frame, mode], inputs: [input]};
  const node = {outputs: [{links: [14]}], graph: {
    links: {14: {target_id: 504}}, getNodeById: () => scene,
  }};
  assert.equal(ctx.guiaInicialConectada(node), true);
  mode.value = 'flexible  ·  prioriza camara';
  assert.equal(ctx.guiaInicialConectada(node), false);
  mode.value = 'exacta  ·  fija fotograma 0';
  frame.value = 24;
  assert.equal(ctx.guiaInicialConectada(node), false);
  frame.value = 0;
  input.link = null;
  assert.equal(ctx.guiaInicialConectada(node), false);
});

test('selected camera controls become a visible English camera instruction', () => {
  const ctx = setupCamera();
  const node = {widgets: [
    {name: 'modelo', value: 'MiniMax H3'},
    {name: 'plano', value: 'plano medio'},
    {name: 'angulo', value: 'tres cuartos'},
    {name: 'movimiento', value: 'zoom in'},
    {name: 'intensidad', value: 'normal'},
  ]};
  assert.equal(ctx.fraseCamara(node),
    "The shot is framed as a medium shot, with the camera about forty-five degrees off the subject's front. The camera zooms in on the subject.");
});
