'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { haversineMeters, evaluateGeofence } = require('../utils/geo');

const CLASSROOM = { id: 'room', name: 'Room 407', lat: 24.01296, lon: 89.280835 };
const OTHER = { id: 'other', name: 'Other site', lat: 24.841355, lon: 89.381426 };
const RULES = { locations: [CLASSROOM, OTHER], radiusMeters: 10, maxAccuracyMeters: 30 };

// ~1 m of latitude in degrees
const M = 1 / 111195;

const check = (dLatMeters, accuracy = 5, extra = {}) =>
  evaluateGeofence({
    latitude: CLASSROOM.lat + dLatMeters * M,
    longitude: CLASSROOM.lon,
    accuracy,
    ...RULES,
    ...extra,
  });

test('haversine matches known distances', () => {
  assert.equal(haversineMeters(10, 20, 10, 20), 0);
  // One degree of latitude is ~111.2 km.
  assert.ok(Math.abs(haversineMeters(0, 0, 1, 0) - 111195) < 100);
  // Symmetric.
  assert.equal(haversineMeters(24.0, 89.2, 24.8, 89.3), haversineMeters(24.8, 89.3, 24.0, 89.2));
});

test('inside the classroom passes', () => {
  const r = check(0);
  assert.equal(r.ok, true);
  assert.ok(r.distance < 0.01);
  assert.equal(r.location.id, 'room');
});

test('9 m passes, 10 m is the limit, 11 m fails', () => {
  assert.equal(check(9).ok, true);
  assert.equal(check(9.9).ok, true);
  const out = check(10.5);
  assert.equal(out.ok, false);
  assert.equal(out.code, 'LOCATION_OUT_OF_RANGE');
  assert.equal(check(11).ok, false);
  assert.equal(check(500).ok, false);
});

test('the radius is measured against the CLOSEST allowed location', () => {
  const r = evaluateGeofence({ latitude: OTHER.lat, longitude: OTHER.lon, accuracy: 5, ...RULES });
  assert.equal(r.ok, true);
  assert.equal(r.location.id, 'other');
});

test('a poor GPS fix is rejected even when its centre is inside the fence', () => {
  const r = check(2, 120);
  assert.equal(r.ok, false);
  assert.equal(r.code, 'LOW_GPS_ACCURACY');
  assert.equal(check(2, 30).ok, true, 'exactly at the limit is accepted');
  assert.equal(check(2, 31).ok, false);
});

test('missing or malformed input is rejected', () => {
  const base = { accuracy: 5, ...RULES };
  assert.equal(evaluateGeofence({ latitude: undefined, longitude: 89, ...base }).code, 'MISSING_COORDINATES');
  assert.equal(evaluateGeofence({ latitude: 'abc', longitude: 89, ...base }).code, 'MISSING_COORDINATES');
  assert.equal(evaluateGeofence({ latitude: null, longitude: null, ...base }).code, 'MISSING_COORDINATES');
  assert.equal(evaluateGeofence({ latitude: 91, longitude: 89, ...base }).code, 'MISSING_COORDINATES');
  assert.equal(evaluateGeofence({ latitude: 24, longitude: 181, ...base }).code, 'MISSING_COORDINATES');
  assert.equal(evaluateGeofence({ latitude: CLASSROOM.lat, longitude: CLASSROOM.lon, ...RULES }).code, 'MISSING_ACCURACY');
  assert.equal(evaluateGeofence({ latitude: CLASSROOM.lat, longitude: CLASSROOM.lon, accuracy: -1, ...RULES }).code, 'MISSING_ACCURACY');
});

test('numeric strings are accepted (JSON clients may stringify)', () => {
  const r = evaluateGeofence({ latitude: String(CLASSROOM.lat), longitude: String(CLASSROOM.lon), accuracy: '4', ...RULES });
  assert.equal(r.ok, true);
});

test('relaxed (dev) mode still measures distance but does not enforce it', () => {
  const r = check(5000, 500, { relaxed: true });
  assert.equal(r.ok, true);
  assert.equal(r.relaxed, true);
  assert.ok(r.distance > 4000);
  // Garbage coordinates are still rejected in relaxed mode.
  assert.equal(evaluateGeofence({ latitude: 'x', longitude: 'y', accuracy: 1, ...RULES, relaxed: true }).ok, false);
});
