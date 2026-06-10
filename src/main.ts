import { createGlobe } from './render/globe';
import { createScene } from './render/scene';

const ctx = createScene(document.getElementById('scene-container')!);
createGlobe(ctx.scene);

function frame() {
  ctx.controls.update();
  ctx.renderer.render(ctx.scene, ctx.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
