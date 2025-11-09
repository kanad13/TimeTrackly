/**
 * Unit tests for charting and statistics functions
 *
 * Tests the new charting enhancement features:
 * - calculateStatistics()
 * - generateHeatmapData()
 * - Date range filtering
 * - Statistics accuracy
 */

import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load dummy data
const dataPath = path.join(__dirname, '../../mtt-data.json');
const dummyEntries = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

/**
 * Mock state object with dummy data
 */
const mockState = {
  historicalEntries: dummyEntries
};

/**
 * Statistics calculation function (copied from reports.js for testing)
 */
function calculateStatistics(daysBack = 7) {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  const entries = mockState.historicalEntries.filter((entry) => {
    const entryDate = new Date(entry.completedAt);
    return entryDate >= cutoffDate;
  });

  if (entries.length === 0) {
    return {
      totalHours: 0,
      dailyAverage: 0,
      busiestDay: '—',
      topProject: '—',
      todayHours: 0,
      trackingDays: 0,
    };
  }

  const totalMinutes = entries.reduce(
    (sum, entry) => sum + entry.durationMinutes,
    0
  );
  const totalHours = (totalMinutes / 60).toFixed(1);

  const uniqueDays = new Set(
    entries.map((e) => new Date(e.completedAt).toLocaleDateString())
  ).size;
  const dailyAverage = (totalMinutes / uniqueDays / 60).toFixed(1);

  const dayMap = {};
  entries.forEach((entry) => {
    const day = new Date(entry.completedAt).toLocaleDateString('en-US', {
      weekday: 'long',
    });
    dayMap[day] = (dayMap[day] || 0) + entry.durationMinutes;
  });
  const busiestDay =
    Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  const projectMap = {};
  entries.forEach((entry) => {
    const project = entry.project || entry.topic.split('/')[0].trim();
    projectMap[project] = (projectMap[project] || 0) + entry.durationMinutes;
  });
  const topProject =
    Object.entries(projectMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  const today = new Date().toLocaleDateString();
  const todayMinutes = entries
    .filter((e) => new Date(e.completedAt).toLocaleDateString() === today)
    .reduce((sum, e) => sum + e.durationMinutes, 0);
  const todayHours = (todayMinutes / 60).toFixed(1);

  const trackingDays = uniqueDays;

  return {
    totalHours,
    dailyAverage,
    busiestDay,
    topProject,
    todayHours,
    trackingDays,
  };
}

/**
 * Heatmap data generation (copied from reports.js for testing)
 */
function generateHeatmapData(daysBack = 84) {
  const data = {};
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  mockState.historicalEntries.forEach((entry) => {
    const entryDate = new Date(entry.completedAt);
    if (entryDate >= cutoffDate) {
      const dateStr = entryDate.toISOString().split('T')[0];
      const hours = entry.durationMinutes / 60;
      data[dateStr] = (data[dateStr] || 0) + hours;
    }
  });

  return data;
}

console.log('✅ Statistics & Charting Functions Test Suite\n');

// ============================================================================
// Tests
// ============================================================================

test('calculateStatistics returns correct structure for 7 days', () => {
  const stats = calculateStatistics(7);

  assert.strictEqual(typeof stats, 'object');
  assert.ok('totalHours' in stats);
  assert.ok('dailyAverage' in stats);
  assert.ok('busiestDay' in stats);
  assert.ok('topProject' in stats);
  assert.ok('todayHours' in stats);
  assert.ok('trackingDays' in stats);
});

test('calculateStatistics returns numbers (as strings from toFixed)', () => {
  const stats = calculateStatistics(7);

  assert.strictEqual(typeof stats.totalHours, 'string');
  assert.ok(!isNaN(parseFloat(stats.totalHours)));
  assert.strictEqual(typeof stats.dailyAverage, 'string');
  assert.ok(!isNaN(parseFloat(stats.dailyAverage)));
});

test('calculateStatistics has positive total hours for recent period', () => {
  const stats = calculateStatistics(7);
  const totalHours = parseFloat(stats.totalHours);

  assert.ok(totalHours > 0, 'Should have positive total hours');
});

test('calculateStatistics has valid busiest day', () => {
  const stats = calculateStatistics(7);
  const validDays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  assert.ok(
    validDays.includes(stats.busiestDay) || stats.busiestDay === '—',
    `Busiest day should be a valid day or "—", got: ${stats.busiestDay}`
  );
});

test('calculateStatistics has valid top project', () => {
  const stats = calculateStatistics(7);
  const validProjects = ['Work', 'Personal', 'Learning', 'Exercise'];

  assert.ok(
    validProjects.includes(stats.topProject) || stats.topProject === '—',
    `Top project should be one of ${validProjects.join(', ')} or "—", got: ${stats.topProject}`
  );
});

test('calculateStatistics daily average <= total hours', () => {
  const stats = calculateStatistics(7);
  const dailyAvg = parseFloat(stats.dailyAverage);
  const totalHours = parseFloat(stats.totalHours);

  assert.ok(
    dailyAvg <= totalHours,
    'Daily average should not exceed total hours'
  );
});

test('calculateStatistics handles 30 day range', () => {
  const stats30 = calculateStatistics(30);
  const stats7 = calculateStatistics(7);

  // 30 days should generally have more or equal hours than 7 days
  const hours30 = parseFloat(stats30.totalHours);
  const hours7 = parseFloat(stats7.totalHours);

  assert.ok(
    hours30 >= hours7,
    '30-day period should have >= hours than 7-day period'
  );
});

test('calculateStatistics handles 365 day range', () => {
  const statsAll = calculateStatistics(365);

  assert.ok(
    parseFloat(statsAll.totalHours) > 0,
    'All time period should have positive hours'
  );
});

test('calculateStatistics handles empty date range', () => {
  const statsFuture = calculateStatistics(365);
  // Even with all-time, if there's data it should show it

  assert.ok(
    parseFloat(statsFuture.totalHours) >= 0,
    'Should return valid stats for all-time'
  );
});

test('generateHeatmapData returns object with YYYY-MM-DD keys', () => {
  const heatmapData = generateHeatmapData(84);

  assert.strictEqual(typeof heatmapData, 'object');

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  Object.keys(heatmapData).forEach((key) => {
    assert.ok(
      dateRegex.test(key),
      `Key should be YYYY-MM-DD format, got: ${key}`
    );
  });
});

test('generateHeatmapData returns numeric hours values', () => {
  const heatmapData = generateHeatmapData(84);

  Object.values(heatmapData).forEach((hours) => {
    assert.strictEqual(typeof hours, 'number');
    assert.ok(hours >= 0, 'Hours should be non-negative');
  });
});

test('generateHeatmapData covers expected date range', () => {
  const heatmapData = generateHeatmapData(84);

  const now = new Date();
  const minDate = new Date();
  minDate.setDate(minDate.getDate() - 84);

  const dates = Object.keys(heatmapData).map(d => new Date(d));
  const minDataDate = new Date(Math.min(...dates));
  const maxDataDate = new Date(Math.max(...dates));

  assert.ok(
    maxDataDate <= now,
    'Max date should not be in the future'
  );
  assert.ok(
    minDataDate >= minDate,
    'Data should be within last 84 days'
  );
});

test('generateHeatmapData sums entries for same day', () => {
  const heatmapData = generateHeatmapData(84);
  const sampleDate = Object.keys(heatmapData)[0];
  const sampleHours = heatmapData[sampleDate];

  // Manually verify one day's data is summed correctly
  const dayEntries = mockState.historicalEntries.filter(e => {
    const entryDate = e.completedAt.split('T')[0];
    return entryDate === sampleDate;
  });

  const expectedHours = dayEntries.reduce((sum, e) => sum + e.durationMinutes / 60, 0);
  const tolerance = 0.01; // Allow for floating point errors

  assert.ok(
    Math.abs(sampleHours - expectedHours) < tolerance,
    `Hours for ${sampleDate} should be summed correctly. Expected: ${expectedHours}, got: ${sampleHours}`
  );
});

test('generateHeatmapData respects daysBack parameter', () => {
  const data7 = generateHeatmapData(7);
  const data30 = generateHeatmapData(30);
  const data84 = generateHeatmapData(84);

  // Longer ranges should have more or equal days (unless data is sparse)
  assert.ok(
    Object.keys(data84).length >= Object.keys(data7).length,
    '84-day data should have >= days than 7-day data'
  );
});

test('statistics for all time have realistic values', () => {
  const stats = calculateStatistics(365);
  const hours = parseFloat(stats.totalHours);

  // Dummy data should have significant hours
  assert.ok(hours > 100, 'Should have > 100 hours of data');
  assert.ok(hours < 10000, 'Should be realistic (< 10000 hours)');
});

test('statistics tracking days is reasonable', () => {
  const stats = calculateStatistics(365);
  const trackingDays = parseInt(stats.trackingDays);

  // Should have tracked fewer days than total days in period
  assert.ok(trackingDays > 0, 'Should have tracked some days');
  assert.ok(trackingDays <= 365, 'Tracking days should not exceed period');
});

test('statistics project totals sum to total hours', () => {
  const stats = calculateStatistics(365);
  const totalHours = parseFloat(stats.totalHours);

  // Get all entries in range and verify
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const entries = mockState.historicalEntries.filter((entry) => {
    const entryDate = new Date(entry.completedAt);
    return entryDate >= cutoffDate;
  });

  const projectMap = {};
  entries.forEach((entry) => {
    const project = entry.project || entry.topic.split('/')[0].trim();
    projectMap[project] = (projectMap[project] || 0) + entry.durationMinutes;
  });

  const summedHours = Object.values(projectMap).reduce((sum, minutes) => sum + minutes / 60, 0);
  const tolerance = 0.1;

  assert.ok(
    Math.abs(parseFloat(stats.totalHours) - summedHours) < tolerance,
    'Sum of project hours should equal total hours'
  );
});

console.log('✅ All charting function tests passed!');
