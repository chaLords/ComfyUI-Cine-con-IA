// Escalar y Refinar necesita el nodo MinimaxH3LatentUpscaler3D de otro paquete.
// La ficha del nodo avisa si falta, antes de ejecutar.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../web/cineconia.js'), 'utf8')
  .replace(/\r\n/g, '\n');
const inicio = source.indexOf('function hayEscaladorH3(');
const trozo = source.slice(inicio, source.indexOf('\n}\n', inicio) + 3);

function hay(liteGraph) {
  const ctx = vm.createContext({ LiteGraph: liteGraph });
  vm.runInContext(trozo, ctx);
  return vm.runInContext('hayEscaladorH3()', ctx);
}

test('sabe si el escalador latente de H3 está instalado', () => {
  assert.equal(hay({ registered_node_types: { MinimaxH3LatentUpscaler3D: {} } }), true);
  assert.equal(hay({ registered_node_types: { KSampler: {} } }), false);
});

test('sin LiteGraph todavía no avisa de nada', () => {
  assert.equal(hay(undefined), null);
});

test('la ficha de Escalar y Refinar usa el aviso', () => {
  const ficha = source.slice(source.indexOf('if (n === "CineEscalarRefinar")'), source.indexOf('if (n === "CineSalida")'));
  assert.match(ficha, /hayEscaladorH3\(\) === false/);
  assert.match(ficha, /Minimax H3 Latent Upscaler/);
});
