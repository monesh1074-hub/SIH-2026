import assert from 'node:assert';
import test from 'node:test';
import {
  SurveyNumberRule,
  AreaRule,
  AreaUnitRule,
  OwnerMatchRule,
  fuzzyMatchOwner,
  normalizeName,
  levenshteinDistance,
  calculateStringSimilarity,
  soundex,
  ValidationEngine
} from '../services/validation';
import { calculateGeodesicPolygonArea } from '../lib/utils';
import { INITIAL_LAND_RECORDS } from '../lib/mock-data';

test('normalizeName cleans punctuation, diacritics, and extra whitespace', () => {
  assert.strictEqual(normalizeName('  Dr. Rámésh  KUMAR, IAS. '), 'dr ramesh kumar ias');
  assert.strictEqual(normalizeName('Ramesh Kumor'), 'ramesh kumor');
});

test('levenshteinDistance computes exact edit distance', () => {
  assert.strictEqual(levenshteinDistance('Ramesh', 'Ramesh'), 0);
  assert.strictEqual(levenshteinDistance('Ramesh Kumar', 'Ramesh Kumor'), 1);
  assert.strictEqual(levenshteinDistance('Patta', 'Chitta'), 3);
});

test('calculateStringSimilarity computes normalized similarity ratio', () => {
  const exact = calculateStringSimilarity('Ramesh Kumar', 'Ramesh Kumar');
  assert.strictEqual(exact, 1.0);

  const typo = calculateStringSimilarity('Ramesh Kumar', 'Ramesh Kumor');
  assert.ok(typo > 0.90, `Expected >0.90 but got ${typo}`);

  const diff = calculateStringSimilarity('Ramesh Kumar', 'Harish Tiwari');
  assert.ok(diff < 0.50, `Expected <0.50 but got ${diff}`);
});

test('soundex encodes phonetic representations correctly', () => {
  assert.strictEqual(soundex('Kumar'), soundex('Kumor'));
  assert.strictEqual(soundex('Sharma'), soundex('Sarma'));
});

test('fuzzyMatchOwner correctly identifies registered candidate', () => {
  const match1 = fuzzyMatchOwner('Ramesh Kumor');
  assert.strictEqual(match1.bestMatch, 'Ramesh Kumar');
  assert.ok(match1.similarity > 0.90);
  assert.strictEqual(match1.isPhoneticMatch, true);

  const match2 = fuzzyMatchOwner('Dattatreya Patil');
  assert.strictEqual(match2.bestMatch, 'Dattatray Bhaurao Patil');
});

test('SurveyNumberRule correctly validates syntax', () => {
  const validRec = {
    ...INITIAL_LAND_RECORDS[0],
    surveyNumber: { ...INITIAL_LAND_RECORDS[0].surveyNumber, value: '145/2A' }
  };
  const result1 = SurveyNumberRule.evaluate(validRec as any);
  assert.strictEqual(result1.status, 'PASSED');

  const invalidRec = {
    ...INITIAL_LAND_RECORDS[0],
    surveyNumber: { ...INITIAL_LAND_RECORDS[0].surveyNumber, value: 'INVALID#SURVEY!' }
  };
  const result2 = SurveyNumberRule.evaluate(invalidRec as any);
  assert.strictEqual(result2.status, 'FAILED');
});

test('AreaRule requires strictly positive area extent', () => {
  const validArea = {
    ...INITIAL_LAND_RECORDS[0],
    landArea: { ...INITIAL_LAND_RECORDS[0].landArea, value: 2.45 }
  };
  assert.strictEqual(AreaRule.evaluate(validArea as any).status, 'PASSED');

  const zeroArea = {
    ...INITIAL_LAND_RECORDS[0],
    landArea: { ...INITIAL_LAND_RECORDS[0].landArea, value: 0 }
  };
  assert.strictEqual(AreaRule.evaluate(zeroArea as any).status, 'FAILED');
});

test('AreaUnitRule recognizes authorized land revenue units', () => {
  const validUnits = ['acre', 'hectare', 'bigha', 'cent', 'sq.m'];
  for (const unit of validUnits) {
    const rec = {
      ...INITIAL_LAND_RECORDS[0],
      areaUnit: { ...INITIAL_LAND_RECORDS[0].areaUnit, value: unit }
    };
    assert.strictEqual(AreaUnitRule.evaluate(rec as any).status, 'PASSED', `Unit ${unit} should pass`);
  }

  const invalidRec = {
    ...INITIAL_LAND_RECORDS[0],
    areaUnit: { ...INITIAL_LAND_RECORDS[0].areaUnit, value: 'football_fields' }
  };
  assert.strictEqual(AreaUnitRule.evaluate(invalidRec as any).status, 'FAILED');
});

test('calculateGeodesicPolygonArea calculates realistic acreage from GPS coordinates', () => {
  // Kovilur parcel coords: ~100m x ~100m polygon (~2.4 acres)
  const polygon: [number, number][] = [
    [9.9615, 78.1265],
    [9.9615, 78.1290],
    [9.9635, 78.1292],
    [9.9638, 78.1268],
    [9.9615, 78.1265]
  ];

  const areaInAcres = calculateGeodesicPolygonArea(polygon, 'acre');
  assert.ok(areaInAcres > 14 && areaInAcres < 18, `Expected ~16 acres, calculated ${areaInAcres}`);

  const areaInHectares = calculateGeodesicPolygonArea(polygon, 'hectare');
  assert.ok(areaInHectares > 5.5 && areaInHectares < 7.5, `Expected ~6.4 hectares, calculated ${areaInHectares}`);
});

test('ValidationEngine executes all 10 statutory rules on rec-001', () => {
  const rec001 = INITIAL_LAND_RECORDS[0];
  const result = ValidationEngine.validateRecord(rec001);

  assert.strictEqual(result.rulesTotal, 10);
  assert.ok(result.rulesPassed >= 6);
  assert.ok(result.rules.some(r => r.ruleId === 'RULE-1'));
  assert.ok(result.rules.some(r => r.ruleId === 'RULE-7'));
  assert.ok(result.rules.some(r => r.ruleId === 'RULE-9'));
  assert.ok(result.rules.some(r => r.ruleId === 'RULE-10'));
  console.log(`ValidationEngine Test: 10 rules executed. Overall Status = ${result.overallStatus} (${result.rulesPassed}/${result.rulesTotal} passed)`);
});
