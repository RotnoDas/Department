'use strict';

const EARTH_RADIUS_METERS = 6371008.8;

/** Great-circle distance in meters (haversine). */
function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') return NaN;
  return Number(value);
};

/** Closest allowed classroom location to a point. */
function nearestLocation(lat, lon, locations) {
  let best = null;
  for (const location of locations) {
    const distance = haversineMeters(lat, lon, location.lat, location.lon);
    if (!best || distance < best.distance) best = { location, distance };
  }
  return best;
}

/**
 * Validate a device position against the allowed classroom locations.
 *
 * `relaxed` is only used in dev mode: the distance is still measured and reported, but neither
 * the radius nor the GPS-accuracy limit is enforced.
 *
 * Returns { ok, code?, message?, distance, location, accuracy, latitude, longitude, relaxed }.
 */
function evaluateGeofence({
  latitude,
  longitude,
  accuracy,
  locations,
  radiusMeters,
  maxAccuracyMeters,
  relaxed = false,
}) {
  const lat = toFiniteNumber(latitude);
  const lon = toFiniteNumber(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return {
      ok: false,
      code: 'MISSING_COORDINATES',
      message: 'Your device location is required to verify that you are in the classroom.',
    };
  }

  const nearest = nearestLocation(lat, lon, locations);
  const distance = nearest.distance;
  const acc = toFiniteNumber(accuracy);
  const base = {
    distance,
    location: nearest.location,
    accuracy: Number.isFinite(acc) ? acc : null,
    latitude: lat,
    longitude: lon,
    relaxed,
  };

  if (relaxed) return { ok: true, ...base };

  if (!Number.isFinite(acc) || acc < 0) {
    return {
      ok: false,
      code: 'MISSING_ACCURACY',
      message: 'Your device did not report how accurate its location is. Turn on precise location and try again.',
      ...base,
    };
  }
  if (acc > maxAccuracyMeters) {
    return {
      ok: false,
      code: 'LOW_GPS_ACCURACY',
      message: `Your location is too imprecise (±${Math.round(acc)} m, needs ±${maxAccuracyMeters} m or better). Use a phone with GPS, turn on precise location, move near a window and try again.`,
      ...base,
    };
  }
  if (distance > radiusMeters) {
    return {
      ok: false,
      code: 'LOCATION_OUT_OF_RANGE',
      message: `You are ${Math.round(distance)} m from the classroom. You must be within ${radiusMeters} m to give attendance.`,
      ...base,
    };
  }
  return { ok: true, ...base };
}

module.exports = {
  haversineMeters,
  nearestLocation,
  evaluateGeofence,
};
