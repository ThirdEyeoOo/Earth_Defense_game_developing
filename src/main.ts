import { cmdBuildSquadron } from './sim/commands';
import { createNewGame } from './sim/state';
import { tick } from './sim/tick';
import { spawnUfo } from './sim/ufos';
import { CityLayer } from './render/cities';
import { EffectsLayer } from './render/effects';
import { createGlobe } from './render/globe';
import { createScene } from './render/scene';
import { UnitLayer } from './render/units';

const state = createNewGame(Date.now() % 100000);
// scenario di prova: difesa e attacco su Roma
state.credits = 9999;
cmdBuildSquadron(state, 'rome');
spawnUfo(state, 'rome');

const ctx = createScene(document.getElementById('scene-container')!);
createGlobe(ctx.scene);
const cityLayer = new CityLayer(ctx.scene, state.cities);
const unitLayer = new UnitLayer(ctx.scene);
const effects = new EffectsLayer(ctx.scene);

let last = performance.now();
let acc = 0;
function frame(now: number) {
  acc += now - last;
  last = now;
  while (acc >= 500) {
    // tick accelerato per la prova visiva
    acc -= 500;
    tick(state);
  }
  cityLayer.update(state, null);
  unitLayer.update(state);
  effects.update(state, unitLayer);
  ctx.controls.update();
  ctx.renderer.render(ctx.scene, ctx.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
