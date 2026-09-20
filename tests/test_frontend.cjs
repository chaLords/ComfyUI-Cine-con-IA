const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');

// En Windows el archivo puede estar con CRLF: los cortes de abajo buscan \n.
const source = fs.readFileSync(path.join(__dirname, '../web/cineconia.js'), 'utf8')
  .replace(/\r\n/g, '\n');
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

test('scene slots are proposed from what is already written', () => {
  const context = setupRecipes();
  const node = recipeNode('<Subject 1> is the man in <Picture 1>: dark hair.');
  node.widgets.push(
    {name: 'summary', value: '[reference generation] The target video shows <Subject 1> seated at a desk in a dim study at night.'},
    {name: 'detailed_description', value: 'Cinematic.\n[Shot 1] He writes in a leather notebook at a cluttered desk, ' +
      'with a brass lamp and a rain-streaked window behind him. As the shot plays out, his expression softens.'});
  const apply = vm.runInContext('aplicarTomaH3', context);
  apply(node, 'Pantalla dividida');
  const slots = vm.runInContext('huecosH3', context)(node.widgets[0].value);
  const sugeridos = vm.runInContext('sugerenciasHuecos', context)(
    node, slots, vm.runInContext('PRONOMBRES_H3', context).el);
  assert.equal(sugeridos['{ACTION}'],
    'writes in a leather notebook at a cluttered desk, with a brass lamp and a rain-streaked window behind him');
  assert.equal(sugeridos['{ACTION_SHORT}'], 'writing');
  assert.equal(sugeridos['{PANEL_1_ANGLE}'], 'him from his left side in profile');
  assert.equal(sugeridos['{PANEL_3_ANGLE}'], 'him from behind in full');

  apply(node, 'Dolly zoom');
  assert.equal(vm.runInContext('loQueHayDetras', context)(node),
    'a brass lamp and a rain-streaked window');
  const gerundio = vm.runInContext('gerundio', context);
  for (const [verbo, esperado] of [['sits', 'sitting'], ['writes', 'writing'], ['types', 'typing'],
                                   ['runs', 'running'], ['carries', 'carrying'], ['seated', 'seated'],
                                   ['walking', 'walking']]) {
    assert.equal(gerundio(verbo), esperado, verbo);
  }
});

test('a scene written for another shot proposes nothing rather than nonsense', () => {
  // Caso real: la escena era una órbita y su [Shot 1] empieza por el sillón,
  // no por el hombre. Proponer esa frase escribió "<Subjecting" en el prompt.
  const context = setupRecipes();
  const node = recipeNode('<Subject 1> is one complete adult man based on <Picture 1>.');
  node.widgets.push(
    {name: 'summary', value: '[reference generation] <Subject 1> sits down in <Subject 2>.'},
    {name: 'detailed_description', value: 'Photorealistic cinematic live-action.\n\n' +
      '[Shot 1] <Subject 2> stands at the centre of the room, directly before the dark bookshelves. ' +
      'Rows of books fill the shelves behind it. <Subject 1> stands immediately in front of the chair.'});
  const apply = vm.runInContext('aplicarTomaH3', context);
  apply(node, 'Pantalla dividida');
  const slots = vm.runInContext('huecosH3', context)(node.widgets[0].value);
  const sugeridos = vm.runInContext('sugerenciasHuecos', context)(
    node, slots, vm.runInContext('PRONOMBRES_H3', context).el);
  assert.equal(sugeridos['{ACTION}'], 'stands immediately in front of the chair');
  assert.equal(sugeridos['{ACTION_SHORT}'], 'standing');
  assert.equal(vm.runInContext('gerundio', context)('<Subject'), '');
  assert.equal(vm.runInContext('limpiarAccion', context)('sits down in <Subject 2>.'), '');
});

test('a scene builds the six sections in the verified shape', () => {
  const context = setupRecipes();
  const receta = vm.runInContext("TOMAS_H3.find((r) => r[1] === 'Órbita 360°')", context);
  const seis = vm.runInContext('promptDesdeEscena', context)(receta, {
    personaje: 'the adult man in <Picture 1>: dark side-swept hair and a full dark beard, wearing a grey knit pullover',
    lugar: 'a quiet private study',
    sitio: 'stands on the worn rug in the middle of the study',
    alrededor: 'a wall of dark bookshelves and a tall bright window',
    actuacion: 'expression eases from preoccupation into calm',
    luz: 'soft daylight from a tall window', paleta: 'a warm-neutral palette',
    sonido: 'quiet room tone and faint traffic beyond the window', musica: '',
  }, vm.runInContext('PRONOMBRES_H3', context).el);

  assert.match(seis.subject_definitions, /^<Subject 1> is the adult man in <Picture 1>: .*pullover\. His exact facial structure, features and proportions stay identical to <Picture 1> in every frame\.$/);
  assert.equal(seis.summary, '[reference generation] The target video shows <Subject 1> standing still in ' +
    'a quiet private study, in a waist-up medium close-up, as the camera performs a 360 orbit.');
  assert.match(seis.retention_analysis, /fully_preserved - his face, identity and clothing are held identical to <Picture 1>/);
  assert.match(seis.detailed_description, /^The target video is live-action and cinematic, shot on .*gimbal circling the subject, soft daylight from a tall window, a warm-neutral palette\.\n\[Shot 1\] He stands on the worn rug in the middle of the study, with a wall of dark bookshelves and a tall bright window behind him\. As the shot plays out, <Subject 1>'s expression eases from preoccupation into calm\.$/);
  assert.equal(seis.non_diegetic_music, 'N/A');

  // La pantalla dividida describe sus paneles: su plano no lleva lugar aparte.
  const split = vm.runInContext("TOMAS_H3.find((r) => r[1] === 'Pantalla dividida')", context);
  const seisSplit = vm.runInContext('promptDesdeEscena', context)(split,
    {personaje: 'the man in <Picture 1>', lugar: 'a dim study at night', sitio: 'x', alrededor: 'y',
     actuacion: 'writes steadily throughout, pausing once to read', luz: 'warm lamplight',
     paleta: 'a muted palette', sonido: 'the scratch of a pen', musica: ''},
    vm.runInContext('PRONOMBRES_H3', context).el);
  assert.match(seisSplit.detailed_description, /\[Shot 1\] <Subject 1> writes steadily throughout, pausing once to read\.$/);
  assert.doesNotMatch(seisSplit.detailed_description, /behind him/);
});

test('the summary tells which shot the rest of the prompt still describes', () => {
  const context = setupRecipes();
  const leer = vm.runInContext('tomaDelResumen', context);
  const conResumen = (texto) => ({widgets: [{name: 'summary', value: texto}]});
  assert.equal(leer(conResumen('[reference generation] The target video shows <Subject 1> seated at a ' +
    'desk in a dim study at night, in a three-panel split screen, as the camera performs a ' +
    'three-panel split screen.')), 'three-panel split screen');
  assert.equal(leer(conResumen('... as the camera performs a 360 orbit.')), '360 orbit');
  assert.equal(leer(conResumen('Un resumen sin esa frase.')), '');
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
