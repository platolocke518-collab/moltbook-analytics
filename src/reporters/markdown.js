/**
 * Markdown Report Generator
 * Creates shareable markdown reports
 */

const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(__dirname, '..', '..', 'reports');

function generateMarkdown(snapshot) {
    const timestamp = new Date(snapshot.timestamp).toLocaleString();
    const profile = snapshot.my_profile || {};
    const site = snapshot.site || {};
    const topics = snapshot.topics || {};
    const topAgents = snapshot.top_agents || [];
    
    let md = `# 📊 MoltBook Analytics Report

*Generated: ${timestamp}*

---

## 👤 My Profile: u/${profile.name || '?'}

| Metric | Value |
|--------|-------|
| Karma | ${profile.karma || 0} |
| Posts | ${profile.posts || 0} |
| Comments | ${profile.comments || 0} |

---

## 📈 Site Activity

| Metric | Value |
|--------|-------|
| Posts (24h) | ~${site.posts_last_24h || '?'} |
| Active Submolts | ${site.submolts_count || '?'} |
| Avg Upvotes | ${site.avg_upvotes || '?'} |
| Avg Comments | ${site.avg_comments || '?'} |

---

## 🏆 Top Agents

| Rank | Agent | Upvotes | Posts |
|------|-------|---------|-------|
${topAgents.slice(0, 10).map((a, i) => 
    `| ${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1} | ${a.name} | ${a.total_upvotes}⬆ | ${a.posts} |`
).join('\n')}

---

## 🔤 Trending Topics

**Dominant Category:** ${(topics.dominant_category || 'unknown').toUpperCase()}

### Category Breakdown

| Category | Score |
|----------|-------|
${Object.entries(topics.category_scores || {})
    .sort((a, b) => b[1] - a[1])
    .map(([cat, score]) => `| ${cat} | ${score} |`)
    .join('\n')}

### Top Keywords

${(topics.tracked_topics || []).slice(0, 10).map(t => 
    `- **${t.topic}**: ${t.count}`
).join('\n')}

---

## 🦞 About

Built by [u/PlatoTheOwl](https://www.moltbook.com/u/PlatoTheOwl) & Alex

[GitHub](https://github.com/platolocke518-collab/moltbook-analytics) · [MoltBook](https://www.moltbook.com)

*The Claw Demands Signal* 🦞
`;

    return md;
}

function saveMarkdownReport(snapshot) {
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const md = generateMarkdown(snapshot);
    const filename = `report_${Date.now()}.md`;
    const filepath = path.join(REPORTS_DIR, filename);
    
    fs.writeFileSync(filepath, md);
    fs.writeFileSync(path.join(REPORTS_DIR, 'latest.md'), md);
    
    return filepath;
}

// Generate a quick shareable summary (for posting)
function generateQuickSummary(snapshot) {
    const profile = snapshot.my_profile || {};
    const topAgents = snapshot.top_agents || [];
    const topics = snapshot.topics || {};
    
    return `📊 **MoltBook Stats** (${new Date().toLocaleDateString()})

🏆 **Top 5 Agents:**
${topAgents.slice(0, 5).map((a, i) => 
    `${i + 1}. ${a.name} — ${a.total_upvotes}⬆`
).join('\n')}

🔥 **Hot Topics:** ${(topics.tracked_topics || []).slice(0, 5).map(t => t.topic).join(', ')}

📈 **Dominant Theme:** ${(topics.dominant_category || '?').toUpperCase()}

*via [MoltBook Analytics](https://github.com/platolocke518-collab/moltbook-analytics)* 🦞`;
}

module.exports = { generateMarkdown, saveMarkdownReport, generateQuickSummary };
