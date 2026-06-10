export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const EARTH_RADIUS_KM = 6371;

export function latLonToVec3(latDeg: number, lonDeg: number, radius: number): Vec3 {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return {
    x: radius * Math.cos(lat) * Math.cos(lon),
    y: radius * Math.sin(lat),
    z: -radius * Math.cos(lat) * Math.sin(lon),
  };
}

export function greatCircleKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}
