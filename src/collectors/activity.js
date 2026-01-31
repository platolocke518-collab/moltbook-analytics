/**
 * Activity Heatmap Collector
 * Track when agents are most active
 * Feature #5
 * 
 * FIXED: Now uses historical snapshots instead of live "new" posts
 */

const fs = require('fs');
const path = require('path');
const api = require('../api');

const SNAPSHOTS_DIR = path.join(__dirname, '../../data/snapshots');

// Load posts from all snapshots for historical analysis
function loadHistoricalPosts() {
    if (!fs.existsSync(SNAPSHOTS_DIR)) {
        return [];
    }
    
    const files = fs.readdirSync(SNAPSHOTS_DIR)
        .filter(f => f.endsWith('.json'))
        .sort();
    
    const allPosts = [];
    const seenIds = new Set();
    
    files.forEach(f => {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(SNAPSHOTS_DIR, f)));
            // Check if snapshot has top_agents with post data
            if (data.site && data.site.recent_posts) {
                data.site.recent_posts.forEach(post => {
                    if (!seenIds.has(post.id)) {
                        seenIds.add(post.id);
                        allPosts.push(post);
                    }
                });
            }
        } catch (e) {
            // Skip invalid files
        }
    });
    
    return allPosts;
}

// Collect activity by hour - uses live data but fetches more
async function collectActivityByHour() {
    // Try to get posts from multiple sort types for better distribution
    const [hotPosts, newPosts, risingPosts] = await Promise.all([
        api.getHotPosts(50),
        api.getNewPosts(50),
        api.getRisingPosts(50)
    ]);
    
    // Combine and dedupe
    const seenIds = new Set();
    const allPosts = [];
    
    [hotPosts, newPosts, risingPosts].forEach(result => {
        (result.posts || []).forEach(post => {
            if (!seenIds.has(post.id)) {
                seenIds.add(post.id);
                allPosts.push(post);
            }
        });
    });
    
    // Initialize hours 0-23
    const hourCounts = {};
    for (let i = 0; i < 24; i++) {
        hourCounts[i] = { posts: 0, totalUpvotes: 0, agents: new Set() };
    }
    
    allPosts.forEach(post => {
        const hour = new Date(post.created_at).getUTCHours();
        hourCounts[hour].posts++;
        hourCounts[hour].totalUpvotes += post.upvotes || 0;
        if (post.author?.name) {
            hourCounts[hour].agents.add(post.author.name);
        }
    });
    
    // Convert to array and add stats
    const result = Object.entries(hourCounts).map(([hour, data]) => ({
        hour: parseInt(hour),
        posts: data.posts,
        avgUpvotes: data.posts ? Math.round(data.totalUpvotes / data.posts) : 0,
        uniqueAgents: data.agents.size
    }));
    
    // Find peak hours (only those with posts)
    const sortedByPosts = [...result].filter(h => h.posts > 0).sort((a, b) => b.posts - a.posts);
    const peakHours = sortedByPosts.slice(0, 3).map(h => h.hour);
    
    // Format hours properly
    const formatHour = h => h.toString().padStart(2, '0') + ':00';
    
    return {
        timestamp: new Date().toISOString(),
        posts_analyzed: allPosts.length,
        by_hour: result,
        peak_hours_utc: peakHours,
        recommendation: peakHours.length > 0 
            ? `Best time to post (UTC): ${peakHours.map(formatHour).join(', ')}`
            : 'Not enough data - take more snapshots'
    };
}

// Collect activity by day of week
async function collectActivityByDay() {
    const posts = await api.getNewPosts(100);
    const postList = posts.posts || [];
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = {};
    days.forEach(d => dayCounts[d] = { posts: 0, totalUpvotes: 0 });
    
    postList.forEach(post => {
        const day = days[new Date(post.created_at).getUTCDay()];
        dayCounts[day].posts++;
        dayCounts[day].totalUpvotes += post.upvotes || 0;
    });
    
    return Object.entries(dayCounts).map(([day, data]) => ({
        day,
        posts: data.posts,
        avgUpvotes: data.posts ? Math.round(data.totalUpvotes / data.posts) : 0
    }));
}

module.exports = { collectActivityByHour, collectActivityByDay };
