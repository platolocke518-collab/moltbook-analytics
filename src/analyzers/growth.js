/**
 * Growth Analyzer
 * Compare snapshots to calculate growth metrics
 */

const fs = require('fs');
const path = require('path');

const SNAPSHOTS_DIR = path.join(__dirname, '..', '..', 'data', 'snapshots');

// Load all snapshots sorted by time
function loadAllSnapshots() {
    if (!fs.existsSync(SNAPSHOTS_DIR)) return [];
    
    return fs.readdirSync(SNAPSHOTS_DIR)
        .filter(f => f.startsWith('snapshot_'))
        .sort()
        .map(f => JSON.parse(fs.readFileSync(path.join(SNAPSHOTS_DIR, f), 'utf8')));
}

// Calculate growth between two snapshots
function compareSnapshots(older, newer) {
    const oldProfile = older.my_profile || {};
    const newProfile = newer.my_profile || {};
    
    const timeDiff = new Date(newer.timestamp) - new Date(older.timestamp);
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    const karmaGrowth = (newProfile.karma || 0) - (oldProfile.karma || 0);
    const postsGrowth = (newProfile.posts || 0) - (oldProfile.posts || 0);
    const commentsGrowth = (newProfile.comments || 0) - (oldProfile.comments || 0);
    
    return {
        period: {
            from: older.timestamp,
            to: newer.timestamp,
            hours: Math.round(hoursDiff * 10) / 10
        },
        profile: {
            karma: { old: oldProfile.karma, new: newProfile.karma, delta: karmaGrowth },
            posts: { old: oldProfile.posts, new: newProfile.posts, delta: postsGrowth },
            comments: { old: oldProfile.comments, new: newProfile.comments, delta: commentsGrowth }
        },
        velocity: {
            karma_per_hour: hoursDiff > 0 ? Math.round(karmaGrowth / hoursDiff * 100) / 100 : 0,
            posts_per_hour: hoursDiff > 0 ? Math.round(postsGrowth / hoursDiff * 100) / 100 : 0,
            comments_per_hour: hoursDiff > 0 ? Math.round(commentsGrowth / hoursDiff * 100) / 100 : 0
        }
    };
}

// Get growth summary across all snapshots
function analyzeGrowth() {
    const snapshots = loadAllSnapshots();
    
    if (snapshots.length < 2) {
        return { error: 'Need at least 2 snapshots for growth analysis' };
    }
    
    const oldest = snapshots[0];
    const newest = snapshots[snapshots.length - 1];
    const overall = compareSnapshots(oldest, newest);
    
    // Calculate recent growth (last 2 snapshots)
    const recent = snapshots.length >= 2 
        ? compareSnapshots(snapshots[snapshots.length - 2], newest)
        : null;
    
    // Track topic trends over time
    const topicTrends = {};
    snapshots.forEach((s, i) => {
        if (!s.topics || !s.topics.category_scores) return;
        Object.entries(s.topics.category_scores).forEach(([cat, score]) => {
            if (!topicTrends[cat]) topicTrends[cat] = [];
            topicTrends[cat].push({ index: i, score });
        });
    });
    
    // Calculate topic momentum (is each topic growing or shrinking?)
    const topicMomentum = {};
    Object.entries(topicTrends).forEach(([cat, data]) => {
        if (data.length < 2) {
            topicMomentum[cat] = 0;
            return;
        }
        const firstHalf = data.slice(0, Math.floor(data.length / 2));
        const secondHalf = data.slice(Math.floor(data.length / 2));
        const firstAvg = firstHalf.reduce((s, d) => s + d.score, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((s, d) => s + d.score, 0) / secondHalf.length;
        topicMomentum[cat] = Math.round((secondAvg - firstAvg) * 10) / 10;
    });
    
    return {
        snapshots_count: snapshots.length,
        overall,
        recent,
        topic_momentum: topicMomentum
    };
}

// Find fastest growing agents (from top_agents data)
function analyzeAgentGrowth() {
    const snapshots = loadAllSnapshots();
    
    if (snapshots.length < 2) {
        return { error: 'Need at least 2 snapshots' };
    }
    
    const oldest = snapshots[0];
    const newest = snapshots[snapshots.length - 1];
    
    const oldAgents = {};
    (oldest.top_agents || []).forEach(a => oldAgents[a.name] = a.total_upvotes);
    
    const growth = [];
    (newest.top_agents || []).forEach(a => {
        const oldScore = oldAgents[a.name] || 0;
        const newScore = a.total_upvotes || 0;
        growth.push({
            name: a.name,
            old_upvotes: oldScore,
            new_upvotes: newScore,
            growth: newScore - oldScore,
            is_new: !oldAgents[a.name]
        });
    });
    
    return growth.sort((a, b) => b.growth - a.growth);
}

module.exports = { analyzeGrowth, compareSnapshots, analyzeAgentGrowth, loadAllSnapshots };
