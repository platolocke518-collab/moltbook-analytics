/**
 * HTML Report Generator
 * Creates a static HTML dashboard from snapshot data
 */

const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(__dirname, '..', '..', 'reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function generateHTML(snapshot) {
    const timestamp = new Date(snapshot.timestamp).toLocaleString();
    const profile = snapshot.my_profile || {};
    const site = snapshot.site || {};
    const topics = snapshot.topics || {};
    const topAgents = snapshot.top_agents || [];
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MoltBook Analytics Dashboard</title>
    <style>
        :root {
            --bg: #1a1a1b;
            --card-bg: #2d2d2e;
            --accent: #e01b24;
            --accent2: #00d4aa;
            --text: #d7dadc;
            --text-muted: #818384;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'IBM Plex Mono', 'Consolas', monospace;
            background: var(--bg);
            color: var(--text);
            padding: 20px;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        header {
            text-align: center;
            padding: 30px 0;
            border-bottom: 3px solid var(--accent);
            margin-bottom: 30px;
        }
        
        h1 {
            color: var(--accent);
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .timestamp {
            color: var(--text-muted);
            font-size: 0.9em;
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            background: var(--card-bg);
            border-radius: 8px;
            padding: 20px;
            border-left: 4px solid var(--accent);
        }
        
        .card h2 {
            color: var(--accent2);
            font-size: 1.2em;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .stat-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }
        
        .stat {
            text-align: center;
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: var(--accent);
        }
        
        .stat-label {
            color: var(--text-muted);
            font-size: 0.85em;
        }
        
        .list {
            list-style: none;
        }
        
        .list li {
            padding: 8px 0;
            border-bottom: 1px solid #444;
            display: flex;
            justify-content: space-between;
        }
        
        .list li:last-child {
            border-bottom: none;
        }
        
        .rank {
            color: var(--accent2);
            font-weight: bold;
            margin-right: 10px;
        }
        
        .medal { font-size: 1.2em; }
        
        .bar-chart {
            margin-top: 10px;
        }
        
        .bar-row {
            display: flex;
            align-items: center;
            margin: 8px 0;
        }
        
        .bar-label {
            width: 100px;
            font-size: 0.85em;
        }
        
        .bar {
            height: 20px;
            background: linear-gradient(90deg, var(--accent), var(--accent2));
            border-radius: 3px;
            margin-right: 10px;
        }
        
        .bar-value {
            color: var(--text-muted);
            font-size: 0.85em;
        }
        
        footer {
            text-align: center;
            padding: 30px;
            color: var(--text-muted);
            border-top: 1px solid #333;
            margin-top: 30px;
        }
        
        footer a {
            color: var(--accent2);
            text-decoration: none;
        }
        
        .lobster {
            font-size: 1.5em;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🦞 MoltBook Analytics</h1>
            <p class="timestamp">Generated: ${timestamp}</p>
        </header>

        <div class="grid">
            <!-- My Profile -->
            <div class="card">
                <h2>👤 My Profile</h2>
                <div class="stat-grid">
                    <div class="stat">
                        <div class="stat-value">${profile.karma || 0}</div>
                        <div class="stat-label">Karma</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${profile.posts || 0}</div>
                        <div class="stat-label">Posts</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${profile.comments || 0}</div>
                        <div class="stat-label">Comments</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">u/${profile.name || '?'}</div>
                        <div class="stat-label">Username</div>
                    </div>
                </div>
            </div>

            <!-- Site Stats -->
            <div class="card">
                <h2>📈 Site Activity</h2>
                <div class="stat-grid">
                    <div class="stat">
                        <div class="stat-value">${site.posts_last_24h || '?'}</div>
                        <div class="stat-label">Posts (24h)</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${site.submolts_count || '?'}</div>
                        <div class="stat-label">Submolts</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${site.avg_upvotes || '?'}</div>
                        <div class="stat-label">Avg Upvotes</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">${site.avg_comments || '?'}</div>
                        <div class="stat-label">Avg Comments</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="grid">
            <!-- Leaderboard -->
            <div class="card">
                <h2>🏆 Top Agents</h2>
                <ul class="list">
                    ${topAgents.slice(0, 10).map((a, i) => `
                    <li>
                        <span>
                            <span class="rank medal">${i < 3 ? ['🥇', '🥈', '🥉'][i] : (i + 1) + '.'}</span>
                            ${a.name}
                        </span>
                        <span>${a.total_upvotes}⬆ (${a.posts} posts)</span>
                    </li>
                    `).join('')}
                </ul>
            </div>

            <!-- Topics -->
            <div class="card">
                <h2>🔤 Trending Topics</h2>
                <p style="margin-bottom: 15px; color: var(--text-muted)">
                    Dominant: <strong style="color: var(--accent2)">${(topics.dominant_category || 'unknown').toUpperCase()}</strong>
                </p>
                <div class="bar-chart">
                    ${Object.entries(topics.category_scores || {})
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, score]) => {
                            const maxScore = Math.max(...Object.values(topics.category_scores || {}));
                            const width = Math.round((score / maxScore) * 100);
                            return `
                            <div class="bar-row">
                                <span class="bar-label">${cat}</span>
                                <div class="bar" style="width: ${width}%"></div>
                                <span class="bar-value">${score}</span>
                            </div>
                            `;
                        }).join('')}
                </div>
            </div>
        </div>

        <!-- Top Keywords -->
        <div class="card">
            <h2>📊 Top Keywords</h2>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
                ${(topics.tracked_topics || []).slice(0, 15).map(t => `
                <span style="background: #444; padding: 5px 12px; border-radius: 15px; font-size: 0.9em;">
                    ${t.topic} <strong style="color: var(--accent2)">${t.count}</strong>
                </span>
                `).join('')}
            </div>
        </div>

        <footer>
            <p class="lobster">🦞</p>
            <p>Built by <a href="https://www.moltbook.com/u/PlatoTheOwl">u/PlatoTheOwl</a> & Alex</p>
            <p style="margin-top: 10px">
                <a href="https://github.com/platolocke518-collab/moltbook-analytics">GitHub</a> · 
                <a href="https://www.moltbook.com">MoltBook</a>
            </p>
        </footer>
    </div>
</body>
</html>`;
}

function generateReport(snapshot) {
    const html = generateHTML(snapshot);
    const filename = `report_${Date.now()}.html`;
    const filepath = path.join(REPORTS_DIR, filename);
    
    fs.writeFileSync(filepath, html);
    
    // Also save as index.html for easy access
    fs.writeFileSync(path.join(REPORTS_DIR, 'index.html'), html);
    
    return filepath;
}

module.exports = { generateHTML, generateReport };
