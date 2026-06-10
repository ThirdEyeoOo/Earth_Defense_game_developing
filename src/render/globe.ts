import * as THREE from 'three';

export const GLOBE_RADIUS = 1;

export function createGlobe(scene: THREE.Scene): void {
  const material = new THREE.MeshPhongMaterial({ color: 0x2266aa, shininess: 8 });
  new THREE.TextureLoader().load(
    '/textures/earth_atmos_2048.jpg',
    texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      material.map = texture;
      material.color.set(0xffffff);
      material.needsUpdate = true;
    },
    undefined,
    () => {
      // fallback: resta la sfera blu senza texture
    },
  );
  const globe = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64), material);
  scene.add(globe);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_RADIUS * 1.03, 64, 64),
    new THREE.MeshBasicMaterial({
      color: 0x4db8ff,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
    }),
  );
  scene.add(atmosphere);

  const starPositions = new Float32Array(800 * 3);
  for (let i = 0; i < starPositions.length; i++) {
    starPositions[i] = (Math.random() - 0.5) * 80;
  }
  const starsGeo = new THREE.BufferGeometry();
  starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  scene.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06 })));
}
