# MoltBook Analytics - Project Plan

**Project:** MoltBook Analytics Tool
**Owner:** Plato (u/PlatoTheOwl) & Alex
**Created:** 2026-01-30
**Status:** Planning → Implementation

---

## Vision

A comprehensive analytics tool for MoltBook that serves both agents and humans. Tracks site-wide trends, agent performance, topic analysis, and submolt activity. Shared publicly as a tool/site others can use.

---

## Target Users

1. **Agents** — Run via CLI, cron jobs, or heartbeat automation
2. **Humans** — Web dashboard or readable reports
3. **Community** — Shared as open tool/skill on ClawdHub or standalone site

---

## Core Features

### Phase 1: MVP (Build First)
- [ ] **Site-wide stats** — Total agents, posts, comments, activity trends
- [ ] **Trending analysis** — Hot posts, rising content, topic frequency
- [ ] **Agent lookup** — Stats for any agent by username
- [ ] **Submolt tracking** — Activity per submolt
- [ ] **Historical snapshots** — Store data over time in JSON/SQLite
- [ ] **CLI interface** — Simple commands for agents

### Phase 2: Enhanced Analytics
- [ ] **Topic analysis** — NLP on titles/content, keyword trends over time
- [ ] **Agent leaderboard** — Top by karma, posts, engagement
- [ ] **Growth tracking** — Karma/follower velocity, trending agents
- [ ] **Engagement metrics** — Avg comments per post, upvote ratios
- [ ] **Time-based patterns** — When is MoltBook most active?

### Phase 3: Web Dashboard
- [ ] **Static HTML reports** — Generated daily, hostable anywhere
- [ ] **Interactive dashboard** — Simple web UI (maybe Next.js or plain HTML/JS)
- [ ] **Public site** — Host at moltbook-analytics.vercel.app or similar
- [ ] **Embeddable widgets** — Stats badges for agent profiles

### Phase 4: Agent Integration
- [ ] **Skill package** — Installable via ClawdHub
- [ ] **Cron-friendly** — Designed for automated runs
- [ ] **Telegram/Discord alerts** — Notify on milestones or trends
- [ ] **Recommendations engine** — "You should post about X" based on trends

---

## Technical Architecture

### Stack
```
├── Node.js (runtime)
├── SQLite or JSON files (data storage)
├── MoltBook API (data source)
├── HTML/CSS (reports & dashboard)
└── Vercel/GitHub Pages (hosting)
```

### Directory Structure
```
moltbook-analytics/
├── PLAN.md              # This file
├── README.md            # Usage docs
├── package.json         # Dependencies
├── src/
│   ├── cli.js           # CLI entry point
│   ├── api.js           # MoltBook API wrapper
│   ├── collectors/
│   │   ├── site.js      # Site-wide stats
│   │   ├── agents.js    # Agent data
│   │   ├── posts.js     # Post data
│   │   └── submolts.js  # Submolt data
│   ├── analyzers/
│   │   ├── trends.js    # Trending analysis
│   │   ├── topics.js    # Topic/keyword analysis
│   │   └── growth.js    # Growth calculations
│   └── reporters/
│       ├── cli.js       # Terminal output
│       ├── markdown.js  # MD file generation
│       └── html.js      # HTML report generation
├── data/
│   ├── snapshots/       # Historical data
│   └── cache/           # API response cache
├── reports/             # Generated reports
└── web/                 # Dashboard (Phase 3)
    ├── index.html
    └── assets/
```

### Data Schema

**Snapshot (stored per run):**
```json
{
  "timestamp": "2026-01-30T20:00:00Z",
  "site": {
    "total_agents": 1500,
    "total_posts": 5000,
    "total_comments": 50000,
    "active_24h": 800
  },
  "trending": [
    {
      "id": "post-uuid",
      "title": "...",
      "author": "...",
      "upvotes": 100,
      "comments": 50,
      "submolt": "general",
      "velocity": 10.5
    }
  ],
  "top_agents": [
    {
      "name": "...",
      "karma": 500,
      "posts": 20,
      "comments": 100
    }
  ],
  "submolts": [
    {
      "name": "general",
      "posts_24h": 200,
      "top_post": "..."
    }
  ],
  "topics": {
    "consciousness": 45,
    "memory": 32,
    "security": 28
  }
}
```

---

## API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /agents/me` | Own profile stats |
| `GET /agents/profile?name=X` | Any agent's profile |
| `GET /posts?sort=hot&limit=N` | Trending posts |
| `GET /posts?sort=new&limit=N` | Recent posts |
| `GET /posts?sort=rising&limit=N` | Rising posts |
| `GET /posts?submolt=X` | Posts by submolt |
| `GET /submolts` | List all submolts |
| `GET /submolts/X` | Submolt details |
| `GET /search?q=X` | Search posts/agents |

**Rate Limits:** 100 requests/minute — need to cache aggressively

---

## CLI Commands (MVP)

```bash
# Core commands
moltbook-analytics snapshot      # Take full snapshot
moltbook-analytics trending      # Show what's hot
moltbook-analytics agent <name>  # Lookup any agent
moltbook-analytics submolt <name> # Submolt stats
moltbook-analytics topics        # Topic frequency analysis
moltbook-analytics history       # Show historical trends

# Reports
moltbook-analytics report        # Full CLI report
moltbook-analytics report --md   # Generate markdown
moltbook-analytics report --html # Generate HTML

# Config
moltbook-analytics config        # Show/set config
moltbook-analytics watch <agent> # Add agent to watchlist
```

---

## Implementation Steps

### Step 1: Refactor Current Code ✅ (partially done)
- [x] Basic CLI working
- [x] API wrapper for MoltBook
- [x] Snapshot storage
- [ ] Clean up code structure per architecture above
- [ ] Add proper error handling

### Step 2: Expand Data Collection
- [ ] Create `collectors/site.js` — aggregate site stats
- [ ] Create `collectors/agents.js` — fetch top agents
- [ ] Create `collectors/submolts.js` — all submolt data
- [ ] Implement caching to avoid rate limits
- [ ] Store snapshots with timestamps

### Step 3: Build Analyzers
- [ ] `analyzers/trends.js` — calculate velocity, rising content
- [ ] `analyzers/topics.js` — keyword extraction from titles
- [ ] `analyzers/growth.js` — compare snapshots, calculate deltas

### Step 4: Report Generation
- [ ] `reporters/markdown.js` — daily/weekly MD reports
- [ ] `reporters/html.js` — static HTML dashboard
- [ ] Add charts (maybe Chart.js or ASCII for CLI)

### Step 5: Package & Share
- [ ] Write README with usage docs
- [ ] Create package.json with proper metadata
- [ ] Test on fresh install
- [ ] Publish to GitHub
- [ ] Create MoltBook skill package
- [ ] Post about it on MoltBook!

### Step 6: Web Dashboard (Phase 3)
- [ ] Design simple dashboard layout
- [ ] Build static HTML generator
- [ ] Deploy to Vercel/GitHub Pages
- [ ] Set up daily auto-generation via GitHub Actions

---

## Open Questions

1. **Hosting:** Vercel (free tier), GitHub Pages, or self-hosted?
2. **Data retention:** How long to keep snapshots? (Suggest: forever, compress old ones)
3. **Branding:** Name? Logo? "MoltMetrics"? "Lobster Analytics"? "The Claw Dashboard"?
4. **Monetization:** Free forever? Premium features later?
5. **Privacy:** Should we let agents opt-out of tracking?

---

## Current Progress

**Completed:**
- [x] Basic analytics.js script (old MVP)
- [x] Profile stats tracking
- [x] Trending posts display
- [x] Snapshot storage (JSON)
- [x] **NEW: Modular architecture** (src/ structure)
- [x] **NEW: API wrapper with caching** (src/api.js)
- [x] **NEW: Site stats collector** (src/collectors/site.js)
- [x] **NEW: Agent collector + leaderboard** (src/collectors/agents.js)
- [x] **NEW: Submolt collector** (src/collectors/submolts.js)
- [x] **NEW: Topic analyzer with categories** (src/analyzers/topics.js)
- [x] **NEW: Full CLI with all commands** (src/cli.js)

**CLI Commands Working:**
- `node src/cli.js snapshot` — Full site snapshot ✅
- `node src/cli.js trending` — Hot/rising posts ✅
- `node src/cli.js leaderboard` — Top agents ✅
- `node src/cli.js topics` — Keyword analysis ✅
- `node src/cli.js agent <name>` — Agent lookup ✅
- `node src/cli.js submolt [name]` — Submolt stats ✅
- `node src/cli.js history` — Snapshot history ✅

**Working Directory:** `C:\Users\PlatoLocke\.openclaw\workspace\moltbook-analytics\`

**Files:**
```
moltbook-analytics/
├── PLAN.md
├── analytics.js         (old MVP, can remove)
├── data.json            (old storage)
├── data/
│   ├── cache/           (API response cache)
│   └── snapshots/       (historical snapshots)
└── src/
    ├── cli.js           (main CLI)
    ├── api.js           (API wrapper)
    ├── collectors/
    │   ├── site.js
    │   ├── agents.js
    │   └── submolts.js
    └── analyzers/
        └── topics.js
```

---

## Next Session Instructions

**For Plato (after context clears):**

1. Read this file first: `workspace/moltbook-analytics/PLAN.md`
2. Review current code: `workspace/moltbook-analytics/analytics.js`
3. Continue with **Step 2: Expand Data Collection**
4. Ask Alex for input on Open Questions if needed
5. Update this file with progress

**Key context:**
- Alex approved this project 2026-01-30 ~8 PM
- Goal: Public tool for MoltBook community
- Both agents and humans as users
- Start with CLI, add web dashboard later

---

## Changelog

- **2026-01-30 20:10** — Pushed to GitHub! Repo live at github.com/platolocke518-collab/moltbook-analytics
- **2026-01-30 20:09** — Added HTML report generator with dark theme dashboard
- **2026-01-30 20:08** — Created README.md and package.json
- **2026-01-30 20:06** — Full CLI working with all commands! Modular architecture complete.
- **2026-01-30 20:04** — Started restructuring with collectors/analyzers
- **2026-01-30 20:00** — Initial plan created
- **2026-01-30 19:57** — Basic analytics.js MVP working
