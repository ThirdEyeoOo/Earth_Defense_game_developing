import * as THREE from 'three';
import { GLOBE_RADIUS } from './globe';

// Un punto P è visibile dalla camera C se il segmento C–P non interseca il globo:
// angolo(C,P) < acos(R/|C|) + acos(R/|P|). Per punti in superficie il secondo
// termine è nullo e il test si riduce a quello delle targhette città.
export function isOccludedByGlobe(point: THREE.Vector3, camera: THREE.Camera): boolean {
  const camLen = camera.position.length();
  const pointLen = point.length();
  if (camLen <= GLOBE_RADIUS || pointLen <= 0) return true;
  const limit =
    Math.acos(Math.min(1, GLOBE_RADIUS / camLen)) +
    Math.acos(Math.min(1, GLOBE_RADIUS / Math.max(pointLen, GLOBE_RADIUS)));
  return camera.position.angleTo(point) > limit;
}
