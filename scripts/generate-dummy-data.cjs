#!/usr/bin/env node

/**
 * Dummy Data Generator for TimeTrackly Charts Testing
 *
 * Generates 12 weeks of realistic time tracking data with:
 * - Multiple projects with realistic time distributions
 * - Weekday/weekend patterns
 * - Varying daily amounts to test heatmap color gradients
 * - Sufficient data to test all chart features
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DAYS_BACK = 84; // 12 weeks
const PROJECTS = [
  { name: 'Work', weight: 0.45, dailyMin: 6, dailyMax: 10 },
  { name: 'Personal', weight: 0.25, dailyMin: 2, dailyMax: 5 },
  { name: 'Learning', weight: 0.20, dailyMin: 1, dailyMax: 4 },
  { name: 'Exercise', weight: 0.10, dailyMin: 0.5, dailyMax: 2 }
];

/**
 * Generate realistic dummy data entries
 */
function generateDummyData() {
  const entries = [];
  const now = new Date();
  let entryId = 1;

  for (let daysBack = DAYS_BACK; daysBack >= 0; daysBack--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysBack);

    // Skip some days randomly (to show gaps in heatmap)
    if (Math.random() < 0.05) continue;

    // Determine daily pattern
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseMultiplier = isWeekend ? 0.6 : 1.0;

    // Add noise to specific days
    let dayMultiplier = baseMultiplier;
    if (dayOfWeek === 4) dayMultiplier = 1.3; // Busiest on Thursday
    if (isWeekend) dayMultiplier = baseMultiplier;

    // Generate entries for this day
    PROJECTS.forEach(project => {
      // Skip projects some days (not all projects every day)
      if (Math.random() < 0.15) return;

      // Calculate duration with realistic variation
      const baseDuration = project.weight * (project.dailyMin + project.dailyMax) / 2;
      const variance = (Math.random() - 0.5) * (project.dailyMax - project.dailyMin) * 0.5;
      const duration = Math.max(
        project.dailyMin,
        Math.min(project.dailyMax, (baseDuration + variance) * dayMultiplier)
      );

      const durationMinutes = Math.round(duration * 60);
      const durationMs = durationMinutes * 60 * 1000;

      // Create entry
      const startTime = new Date(date);
      startTime.setHours(Math.floor(Math.random() * 12) + 7); // 7am-7pm
      startTime.setMinutes(Math.floor(Math.random() * 60));

      const endTime = new Date(startTime);
      endTime.setTime(endTime.getTime() + durationMs);

      entries.push({
        project: project.name,
        task: `Task ${entryId}`,
        totalDurationMs: durationMs,
        durationSeconds: Math.round(durationMs / 1000),
        createdAt: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: `Sample ${project.name} task`
      });
      entryId++;
    });
  }

  return entries.sort((a, b) => new Date(a.endTime) - new Date(b.endTime));
}

/**
 * Calculate statistics for verification
 */
function calculateStats(entries) {
  if (entries.length === 0) return null;

  const totalMinutes = entries.reduce((sum, e) => sum + (e.totalDurationMs / 60000), 0);
  const totalHours = totalMinutes / 60;

  const uniqueDays = new Set(
    entries.map(e => new Date(e.endTime).toLocaleDateString())
  ).size;

  const projectStats = {};
  entries.forEach(e => {
    projectStats[e.project] = (projectStats[e.project] || 0) + (e.totalDurationMs / 60000);
  });

  const dayStats = {};
  entries.forEach(e => {
    const day = new Date(e.endTime).toLocaleDateString('en-US', { weekday: 'long' });
    dayStats[day] = (dayStats[day] || 0) + (e.totalDurationMs / 60000);
  });

  return {
    totalHours: (totalHours).toFixed(1),
    totalEntries: entries.length,
    uniqueDays: uniqueDays,
    avgPerDay: (totalHours / uniqueDays).toFixed(1),
    projects: Object.entries(projectStats)
      .map(([name, minutes]) => ({
        name,
        hours: (minutes / 60).toFixed(1),
        percentage: ((minutes / totalMinutes) * 100).toFixed(1)
      }))
      .sort((a, b) => b.hours - a.hours),
    busiest: Object.entries(dayStats)
      .map(([day, minutes]) => ({ day, hours: (minutes / 60).toFixed(1) }))
      .sort((a, b) => b.hours - a.hours)[0]
  };
}

/**
 * Main execution
 */
function main() {
  console.log('🔄 Generating dummy data...');

  const entries = generateDummyData();
  const stats = calculateStats(entries);

  // Save to file
  const dataPath = path.join(__dirname, '..', 'mtt-data.json');
  fs.writeFileSync(dataPath, JSON.stringify(entries, null, 2));

  console.log('\n✅ Dummy data generated successfully!\n');
  console.log('📊 Data Statistics:');
  console.log(`   Total Entries: ${stats.totalEntries}`);
  console.log(`   Total Hours: ${stats.totalHours}h`);
  console.log(`   Unique Days Tracked: ${stats.uniqueDays}`);
  console.log(`   Average Per Day: ${stats.avgPerDay}h`);
  console.log(`\n📈 Project Distribution:`);
  stats.projects.forEach(p => {
    console.log(`   ${p.name}: ${p.hours}h (${p.percentage}%)`);
  });
  console.log(`\n🔥 Busiest Day: ${stats.busiest.day} (${stats.busiest.hours}h)`);
  console.log(`\n💾 Data saved to: ${dataPath}`);
  console.log('\n✨ Ready to test charts in the Reports tab!');
}

main();
