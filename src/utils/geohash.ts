import { GeoPoint } from "firebase-admin/firestore";
import * as ngeohash from "ngeohash";

/**
 * Geohash utility functions for efficient spatial queries
 */

/**
 * Generate geohash for given coordinates
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {number} precision - Geohash precision (default: 7 for ~150m accuracy)
 * @return {string} Geohash string
 */
export function generateGeohash(latitude: number, longitude: number, precision = 7): string {
  return ngeohash.encode(latitude, longitude, precision);
}

/**
 * Generate geohash for a GeoPoint
 * @param {GeoPoint} geoPoint - Firebase GeoPoint
 * @param {number} precision - Geohash precision (default: 7 for ~150m accuracy)
 * @return {string} Geohash string
 */
export function generateGeohashFromGeoPoint(geoPoint: GeoPoint, precision = 7): string {
  return ngeohash.encode(geoPoint.latitude, geoPoint.longitude, precision);
}

/**
 * Get geohash neighbors for a given geohash
 * @param {string} geohash - Base geohash
 * @return {string[]} Array of neighboring geohashes
 */
export function getGeohashNeighbors(geohash: string): string[] {
  return ngeohash.neighbors(geohash);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @return {number} Distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get geohash precision based on radius
 * @param {number} radiusMeters - Radius in meters
 * @return {number} Recommended geohash precision
 */
export function getGeohashPrecisionForRadius(radiusMeters: number): number {
  // Geohash precision levels and their approximate accuracy:
  // 1: ~5000km, 2: ~1250km, 3: ~156km, 4: ~39km, 5: ~4.9km, 6: ~1.2km, 7: ~153m, 8: ~38m, 9: ~4.8m
  if (radiusMeters >= 5000) return 1;
  if (radiusMeters >= 1250) return 2;
  if (radiusMeters >= 156) return 3;
  if (radiusMeters >= 39) return 4;
  if (radiusMeters >= 4.9) return 5;
  if (radiusMeters >= 1.2) return 6;
  if (radiusMeters >= 0.153) return 7;
  if (radiusMeters >= 0.038) return 8;
  return 9;
}

/**
 * Generate geohash prefixes for efficient querying
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {number} radiusMeters - Search radius in meters
 * @return {string[]} Array of geohash prefixes to query
 */
export function getGeohashPrefixesForSearch(latitude: number, longitude: number, radiusMeters: number): string[] {
  const precision = getGeohashPrecisionForRadius(radiusMeters);
  const baseGeohash = generateGeohash(latitude, longitude, precision);

  // For small radii, we can use the base geohash and its neighbors
  if (radiusMeters <= 1000) {
    return [baseGeohash, ...getGeohashNeighbors(baseGeohash)];
  }

  // For larger radii, we need to use shorter prefixes
  const shorterPrecision = Math.max(1, precision - 2);
  const prefixGeohash = generateGeohash(latitude, longitude, shorterPrecision);

  return [prefixGeohash];
}
