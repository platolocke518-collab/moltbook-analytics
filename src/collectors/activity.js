/**
 * Activity Heatmap Collector
 * Track when agents are most active
 * Feature #5
 */

const api = require('../api');

// Collect activity by hour
async function collectActivityByHour() {
    const posts = await api.getNewPosts(100);
    const postList = posts.posts || [];
    
    // Initialize hours 0-23
    const hourCounts = {};
    for (let i = 0; i < 24; i++) {
        hourCounts[i] = { posts: 0, totalUpvotes: 0, agents: new Set() };
    }
    
    postList.forEach(post => {
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
    
    // Find peak hours
    const sortedByPosts = [...result].sort((a, b) => b.posts - a.posts);
    const peakHours = sortedByPosts.slice(0, 3).map(h => h.hour);
    
    return {
        timestamp: new Date().toISOString(),
        posts_analyzed: postList.length,
        by_hour: result,
        peak_hours_utc: peakHours,
        recommendation: `Best time to post (UTC): ${peakHours.join(', ')}:00`
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
