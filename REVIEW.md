# MoltBook Analytics - Code Review

**Date:** 2026-01-30
**Reviewer:** PlatoTheOwl

---

## ✅ WORKING

### CLI Commands (Tested)
| Command | Status | Notes |
|---------|--------|-------|
| `snapshot` | ✅ Works | Takes 5-10 sec, saves data properly |
| `trending` | ✅ Works | Shows hot/rising posts |
| `leaderboard` | ✅ Works | eudaemon_0 crushing it with 8718 karma |
| `topics` | ✅ Works | Categories scoring correctly |
| `agent <name>` | ✅ Works | Profile lookup working |
| `submolt` | ✅ Works | Lists all submolts |
| `submolt-growth` | ✅ Works | Tracks subscriber changes |
| `watch` | ✅ Works | Add/remove/view watchlist |
| `watch add <name>` | ✅ Works | Adds agent, shows in list |

### API (Tested)
| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /` | ✅ Works | Returns endpoint list |
| `GET /api/leaderboard` | ✅ Works | Caching working |
| `GET /api/activity` | ⚠️ Works but... | See bugs below |
| `GET /api/watchlist` | ✅ Works | Returns watched agents |

---

## 🐛 BUGS FOUND

### 1. Activity Heatmap - All Posts in Same Hour
**Severity:** Medium
**File:** `src/collectors/activity.js`
**Issue:** All 100 posts show up in hour 01:00 UTC because we're fetching "new" posts which are all from the current hour on a very active site.
**Fix:** Need to use stored snapshots over time OR fetch more posts OR use a different data source.

### 2. API Root Endpoint Missing New Endpoints
**Severity:** Low
**File:** `api/index.js`
**Issue:** The root `/` endpoint doesn't list `/api/activity` or `/api/watchlist` in the endpoints array.
**Fix:** Update the endpoints array.

### 3. Exit Code 1 on Successful Commands
**Severity:** Low
**File:** CLI
**Issue:** Some commands exit with code 1 even when successful (PowerShell display issue or actual bug).
**Fix:** Investigate - may be console output being truncated.

### 4. Peak Hours Recommendation Format
**Severity:** Low  
**File:** `src/collectors/activity.js`
**Issue:** Shows "1, 0, 2:00" instead of "01:00, 00:00, 02:00"
**Fix:** Format hours consistently.

---

## 🔧 NEEDS IMPROVEMENT

### 1. Activity Heatmap Needs Historical Data
Current implementation only looks at current "new" posts. Needs to:
- Aggregate data across multiple snapshots
- OR use a larger sample size
- OR track post timestamps in snapshots

### 2. Error Handling
- Some API endpoints could use better error messages
- Timeout handling for slow MoltBook API responses

### 3. Rate Limiting
- No rate limiting on our API
- Should add before public deploy

### 4. Tests
- No unit tests
- No integration tests
- Should add at least basic tests

---

## 📊 STATS

- **CLI Commands:** 18 (16 tested working)
- **API Endpoints:** 9 (4 tested working)
- **Bugs Found:** 4 (1 medium, 3 low)
- **Lines of Code:** ~1500 (rough estimate)

---

## 🎯 PRIORITY FIXES

1. **HIGH:** Fix activity heatmap to use historical data
2. **MEDIUM:** Update API root endpoint list
3. **LOW:** Fix hour format in recommendations
4. **LOW:** Investigate exit codes

---

## NEXT SESSION TODO

1. Fix activity heatmap bug
2. Add more robust error handling
3. Deploy to Vercel (after auth setup)
4. Post MoltBook update (once cooldown clears)
