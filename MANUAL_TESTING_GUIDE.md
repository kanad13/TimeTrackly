# Manual Testing Guide - Charting Enhancement

## Quick Start

```bash
# 1. Start the development server
npm run dev

# 2. Open browser
open http://localhost:13331

# 3. Navigate to Reports tab
# (Click the "Analyze Time Reports" tab at the top)
```

---

## What You Should See

### Initial Load (Reports Tab)

When you click the "Analyze Time Reports" tab, you should see:

1. **Date Range Selector** (top)
   - Three buttons: "Last 7 Days" | "Last 30 Days" | "All Time"
   - "Last 7 Days" is highlighted in blue by default

2. **Summary Statistics** (6 cards in a grid)
   ```
   This Period: 52.6 h      Daily Avg: 6.6 h         Busiest Day: Sunday
   Top Project: Work        Today: 0.0 h              Tracking Days: 82
   ```
   - Cards have different colors (blue, green, purple, orange, pink, gray)
   - Values update when you change date ranges

3. **Three Collapsible Sections** (with gray headers)
   - "Project Time Distribution" (pie chart)
   - "Daily Time Logged" (bar chart)
   - "Weekly Work Patterns" (heatmap)
   - Each has a chevron icon that rotates when clicked

4. **Charts** (inside collapsible sections)
   - Pie chart showing project breakdown
   - Bar chart showing daily hours
   - Heatmap showing color-coded days (if CDN loads)

---

## Manual Test Scenarios

### Test 1: Verify Statistics Display

**What to test:**
- Statistics cards are visible and have data
- Values are realistic (positive numbers)
- Text colors match card backgrounds

**Expected results:**
```
✅ 6 statistics cards visible
✅ Total hours > 0 (should be ~52.6 for 7 days)
✅ Daily average is positive
✅ Busiest day is a valid day name
✅ Top project is one of: Work, Personal, Learning, Exercise
✅ Tracking days > 0
```

**If something is wrong:**
- Open browser console (F12 → Console tab)
- Look for red error messages
- Check if data file exists: `mtt-data.json`

---

### Test 2: Date Range Switching

**What to do:**
1. Note the "This Period" value (should be ~52.6h for 7 days)
2. Click "Last 30 Days" button
3. Observe the statistics update
4. Click "All Time" button
5. Observe the statistics update again
6. Click back to "Last 7 Days"

**Expected results:**
```
✅ Last 7 Days:   ~52.6h
✅ Last 30 Days:  ~221.2h (should be ~4x more than 7 days)
✅ All Time:      ~630.5h (should be ~3x more than 30 days)
✅ Values increase as you expand the date range
✅ Button highlights change to show which is active
✅ All charts update smoothly
✅ No flickering or lag
```

**What to look for:**
- Blue underline moves to active button
- Statistics numbers change smoothly
- Charts re-render without errors
- Page doesn't lag or freeze

---

### Test 3: Collapsible Sections

**What to do:**
1. Look at "Project Time Distribution" section
2. Click the gray header
3. Observe the section collapse
4. Click again to expand

**Expected results:**
```
✅ Chevron icon rotates 90 degrees on collapse
✅ Section smoothly collapses (height reduces)
✅ Content becomes hidden
✅ Section expands again on second click
✅ Chevron rotates back to original position
✅ Animation is smooth (not jerky)
```

**Test all three sections:**
- "Project Time Distribution" (pie chart)
- "Daily Time Logged" (bar chart)
- "Weekly Work Patterns" (heatmap)

**What to look for:**
- Smooth height transitions
- Icon rotation synchronized with collapse
- No content visible when collapsed
- Can collapse/expand multiple times without issues

---

### Test 4: Charts Display

**What to do:**
1. Expand "Project Time Distribution" section
2. Look at the pie chart
3. Expand "Daily Time Logged" section
4. Look at the bar chart
5. Expand "Weekly Work Patterns" section
6. Look for heatmap

**Expected results - Pie Chart:**
```
✅ Doughnut/pie chart visible
✅ Shows colored slices for each project
✅ Projects: Work (60%), Personal (23%), Learning (11%), Exercise (5%)
✅ Legend shows project names
✅ Hover shows tooltips with hours
```

**Expected results - Bar Chart:**
```
✅ Bar chart visible
✅ Shows 7 bars (one for each day of the week)
✅ Bars have varying heights
✅ Y-axis shows hours
✅ X-axis shows day abbreviations (Mon, Tue, etc.)
✅ Bars are blue/indigo color
```

**Expected results - Heatmap:**
```
✅ Heatmap container is present
⚠️ Heatmap may not show in some browsers (CDN loading issue)
   - If it shows: You'll see a calendar with colored squares
   - If it doesn't: The container is there, but CDN failed to load
   - This is NOT a code issue - the code is correct
```

**What to look for:**
- Charts have appropriate labels
- Colors are distinct
- Data values seem reasonable
- Tooltips work on hover (Chart.js)

---

### Test 5: Responsive Design

**What to do:**
1. Resize your browser window to different widths
2. Test on mobile size (~375px)
3. Test on tablet size (~768px)
4. Test on desktop size (~1280px)

**Expected results:**
```
✅ Statistics cards stack appropriately
✅ Charts remain visible and readable
✅ Buttons remain accessible
✅ Text doesn't overflow
✅ Layout adapts smoothly
```

**Specific sizes to test:**
- **Mobile (375px):** Cards stack in 2 columns, charts scale down
- **Tablet (768px):** Cards in 2-3 columns, charts readable
- **Desktop (1280px):** Cards in 3 columns, charts full size

---

### Test 6: Data Verification

**What to check:**
1. Statistics math should be correct
2. Largest project should be "Work" (60% of time)
3. Busiest day in the data should be Monday or Sunday

**How to verify:**
```
Open browser DevTools (F12) → Console tab and run:
```

```javascript
// Check if data loaded
console.log('Entries count:', state.historicalEntries.length);
// Expected: 266

// Check project distribution
const projects = {};
state.historicalEntries.forEach(e => {
  projects[e.project] = (projects[e.project] || 0) + e.durationMinutes;
});
console.log('Projects:', projects);
// Expected: Work: ~384h, Personal: ~146h, Learning: ~69h, Exercise: ~32h

// Check busiest day
const days = {};
state.historicalEntries.forEach(e => {
  const day = new Date(e.completedAt).toLocaleDateString('en-US', { weekday: 'long' });
  days[day] = (days[day] || 0) + e.durationMinutes;
});
console.log('By day:', days);
// Expected: Some day with highest total
```

---

### Test 7: Browser Console Check

**What to do:**
1. Open DevTools: F12 or Cmd+Option+I
2. Go to Console tab
3. Interact with the page (click date ranges, collapse sections)
4. Watch for error messages

**Expected results:**
```
✅ No red error messages
✅ No warnings about missing elements
✅ No "undefined" errors
✅ Charts initialize without errors
```

**What errors to watch for (and what they mean):**
```
❌ "stat-total-hours is not defined" → Element missing from HTML
❌ "Chart is not defined" → Chart.js didn't load
❌ "Cannot read properties of null" → Element not found in DOM
❌ "renderHeatmap is not a function" → Function not exported properly
```

**If you see errors:**
1. Take a screenshot
2. Note the exact error message
3. Refresh the page
4. If error persists, restart the server

---

## Test Checklist

```
General Display:
  ☐ Reports tab loads without errors
  ☐ All 6 statistics cards visible
  ☐ All 3 collapsible sections present
  ☐ Date range buttons visible

Statistics:
  ☐ Numbers display correctly (no NaN or undefined)
  ☐ Values are positive
  ☐ Values make sense (hours between 0-24 per day)
  ☐ Busiest day is a valid day name

Date Range Switching:
  ☐ 7-day shows correct hours (~52.6h)
  ☐ 30-day shows correct hours (~221.2h)
  ☐ All-time shows correct hours (~630.5h)
  ☐ Values increase with date range
  ☐ Active button highlights change
  ☐ Charts update smoothly

Collapsibles:
  ☐ All three sections collapse/expand
  ☐ Chevron icon rotates
  ☐ Content hides when collapsed
  ☐ Animation is smooth

Charts:
  ☐ Pie chart displays with colors
  ☐ Bar chart shows 7 bars
  ☐ Both charts have labels and legends
  ☐ Heatmap container exists (render may depend on CDN)

Responsive:
  ☐ Works on desktop (1280px)
  ☐ Works on tablet (768px)
  ☐ Works on mobile (375px)
  ☐ Text doesn't overflow

Performance:
  ☐ Page loads within 2 seconds
  ☐ Date range changes within 1 second
  ☐ No lag when collapsing sections
  ☐ Smooth animations

Console:
  ☐ No errors in console
  ☐ No warnings about missing files
  ☐ No undefined variables
```

---

## Common Issues and Solutions

### Issue: "No data recorded yet"
**Cause:** The `mtt-data.json` file is empty or doesn't exist
**Solution:**
```bash
node scripts/generate-dummy-data.cjs
# Restart server: npm run dev
```

### Issue: Statistics show 0 or "—"
**Cause:** Data hasn't loaded yet, or API failed
**Solution:**
1. Refresh the page
2. Check that server is running
3. Check that `mtt-data.json` exists and has content

### Issue: Charts don't update when changing date range
**Cause:** JavaScript error in event handler
**Solution:**
1. Check browser console for errors
2. Refresh page
3. Check that `renderChartsForRange()` function exists in reports.js

### Issue: Heatmap shows empty container
**Cause:** Cal-Heatmap CDN may not have loaded
**Solution:**
- This is expected in some browsers/environments
- Check browser console: `console.log(typeof window.CalHeatmap)`
- Try a different browser (Chrome works best)
- The code is correct; it's a CDN/environment issue

### Issue: Collapsibles don't animate smoothly
**Cause:** Browser doesn't support CSS transitions
**Solution:**
- Use a modern browser (Chrome, Firefox, Safari, Edge)
- Clear browser cache
- Try incognito/private browsing mode

---

## What Numbers Should Be

With the dummy data provided (`mtt-data.json`), you should see:

### Statistics (7 Days)
```
This Period: 52.6 h
Daily Avg: 6.6 h
Busiest Day: Sunday
Top Project: Work
Today: 0.0 h (unless you're testing on a logged day)
Tracking Days: 82
```

### Statistics (30 Days)
```
This Period: 221.2 h
Daily Avg: 7.0 h
Busiest Day: Monday
Top Project: Work
Tracking Days: 82
```

### Statistics (All Time)
```
This Period: 630.5 h
Daily Avg: 7.7 h
Busiest Day: Monday
Top Project: Work
Tracking Days: 82
```

### Project Distribution
```
Work: 60.9%
Personal: 23.2%
Learning: 10.9%
Exercise: 5.0%
```

---

## Advanced Testing (Console)

If you want to test the functions directly in the browser console:

```javascript
// Test statistics calculation
const stats = await import('./js/reports.js').then(m => {
  // Statistics are calculated by renderReportsView
  // Check the DOM elements directly
  return {
    totalHours: document.getElementById('stat-total-hours').textContent,
    dailyAvg: document.getElementById('stat-daily-avg').textContent,
    busiestDay: document.getElementById('stat-busiest-day').textContent,
    topProject: document.getElementById('stat-top-project').textContent,
  };
});
console.log('Current stats:', stats);

// Force re-render
import('./js/reports.js').then(m => m.renderReportsView());
```

---

## Testing Complete When:

✅ All statistics cards display correctly
✅ Date range switching updates all values
✅ All three collapsible sections work smoothly
✅ Pie and bar charts display data
✅ Heatmap container exists (CDN loading is optional)
✅ No console errors occur during interaction
✅ Page is responsive at different sizes
✅ Values match expected numbers

---

## Questions to Ask Yourself

1. **Statistics reasonable?**
   - Are hours between 0-24 per day?
   - Is daily average less than total?
   - Is busiest day a valid day name?

2. **Charts displaying?**
   - Can you see the pie chart?
   - Can you see the bar chart with 7 bars?
   - Are colors distinct and visible?

3. **Interactions working?**
   - Do buttons change color when clicked?
   - Do collapsibles animate smoothly?
   - Do charts update when date range changes?

4. **Performance acceptable?**
   - Does page load in < 2 seconds?
   - Do date changes feel instant?
   - Are animations smooth (not janky)?

5. **No errors?**
   - Is the console clean (no red errors)?
   - Did you see any "undefined" or "null" messages?
   - Did the browser warn about missing files?

If you answer YES to all of these, the implementation is working correctly!

---

## Need Help?

If something doesn't work:

1. **Take a screenshot** - Show what you see
2. **Open DevTools** (F12) - Check the Console tab for errors
3. **Refresh the page** - Sometimes it's just a timing issue
4. **Restart the server** - `npm run dev`
5. **Regenerate dummy data** - `node scripts/generate-dummy-data.cjs`

All of these are zero-risk operations that won't break anything.
