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
const shotRecipes = source.slice(source.indexOf('const H3_QUIETO = '),
  source.indexOf('const PLANOS_EN = {', source.indexOf('const TOMAS_H3 = [')));

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

function recipeNode(definition) {
  return {widgets: [
    {name: 'camara', value: ''},
    {name: 'plano', value: 'sin especificar'},
    {name: 'angulo', value: 'sin especificar'},
    {name: 'movimiento', value: 'sin especificar'},
    {name: 'subject_definitions', value: definition},
  ], setDirtyCanvas() {}};
}

function setupRecipes() {
  const context = vm.createContext({
    findWidget: (node, name) => node.widgets.find((w) => w.name === name),
    ponerTexto: (w, value) => { w.value = value; },
  });
  vm.runInContext(shotRecipes, context);
  return context;
}

test('H3 orbit button writes the LoopForge camera clause verbatim', () => {
  const context = setupRecipes();
  const names = vm.runInContext('TOMAS_H3.map((r) => r[1])', context);
  assert.equal(names.length, 15); // free mode + LoopForge's 14 examples
  const node = recipeNode('<Subject 1> is the man in <Picture 1>: dark hair, grey pullover.');
  vm.runInContext('aplicarTomaH3', context)(node, 'Órbita 360°');
  const text = node.widgets[0].value;
  assert.ok(text.includes('The camera performs an arc shot around <Subject 1> with large ' +
    'amplitude at fast speed, sweeping a complete circle around him and coming back to the front.'));
  assert.ok(text.startsWith('A waist-up medium close-up frames <Subject 1> standing in place'));
  assert.match(text, /<Subject 1> stays where he is through the sweep/);
  // Los hitos con segundos y el sentido de giro no estan en la receta publicada.
  assert.doesNotMatch(text, /clockwise|profile|seconds|quarter/);
  assert.equal(node.widgets[3].value, 'orbita');
});

test('H3 recipes follow the pronouns of Subject 1 and leave no pronoun tokens', () => {
  const context = setupRecipes();
  const apply = vm.runInContext('aplicarTomaH3', context);
  const names = vm.runInContext('TOMAS_H3.slice(1).map((r) => r[1])', context);
  for (const [definition, pronoun] of [
    ['<Subject 1> is the woman in <Picture 1>.', /\b(she|her)\b/],
    ['<Subject 1> is the man in <Picture 1>.', /\b(he|him|his)\b/],
    ['<Subject 1> is the dancer in <Picture 1>.', /\b(they|them|their)\b/],
  ]) {
    for (const name of names) {
      const node = recipeNode(definition);
      apply(node, name);
      const text = node.widgets[0].value;
      assert.doesNotMatch(text, /\{(he|him|his|He|His|is|has|s)\}/, name);
      if (/\{he\}|\{him\}|\{his\}/i.test(vm.runInContext(
        `TOMAS_H3.find((r) => r[1] === ${JSON.stringify(name)})[2]`, context))) {
        assert.match(text, pronoun, name + ' / ' + definition);
      }
    }
  }
  const node = recipeNode('<Subject 1> is the dancer in <Picture 1>.');
  apply(node, 'Órbita 360°');
  assert.match(node.widgets[0].value, /stays where they are through the sweep/);
});

test('H3 recipes that depend on the scene expose their slots', () => {
  const context = setupRecipes();
  const node = recipeNode('<Subject 1> is the woman in <Picture 1>.');
  vm.runInContext('aplicarTomaH3', context)(node, 'Super dolly in');
  assert.deepEqual([...vm.runInContext('huecosH3', context)(node.widgets[0].value)],
    ['{THE_SPACE}', '{NEAR_OBJECTS}', '{FURTHER_OBJECTS}', '{GROUND}']);
  vm.runInContext('aplicarTomaH3', context)(node, 'Eyes in');
  assert.equal(vm.runInContext('huecosH3', context)(node.widgets[0].value).length, 0);
});

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
