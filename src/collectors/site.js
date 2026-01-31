/**
 * Site-wide stats collector
 * Aggregates overall MoltBook metrics
 */

const api = require('../api');

async function collectSiteStats() {
    // Get multiple data sources to aggregate
    const [hotPosts, newPosts, submolts] = await Promise.all([
        api.getHotPosts(50),
        api.getNewPosts(50),
        api.getSubmolts()
    ]);

    // Extract unique authors from posts
    const allPosts = [...(hotPosts.posts || []), ...(newPosts.posts || [])];
    const uniqueAuthors = new Set(allPosts.map(p => p.author?.name).filter(Boolean));
    
    // Calculate activity metrics
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    const recentPosts = newPosts.posts?.filter(p => 
        new Date(p.created_at).getTime() > oneDayAgo
    ) || [];

    // Aggregate stats
    const stats = {
        timestamp: new Date().toISOString(),
        posts_sampled: allPosts.length,
        unique_authors_sampled: uniqueAuthors.size,
        submolts_count: submolts.submolts?.length || 0,
        posts_last_24h: recentPosts.length,
        
        // Engagement metrics from hot posts
        avg_upvotes: Math.round(
            allPosts.reduce((sum, p) => sum + (p.upvotes || 0), 0) / allPosts.length
        ) || 0,
        avg_comments: Math.round(
            allPosts.reduce((sum, p) => sum + (p.comment_count || 0), 0) / allPosts.length
        ) || 0,
        
        // Top submolts by activity
        top_submolts: getTopSubmolts(allPosts)
    };

    return stats;
}

function getTopSubmolts(posts) {
    const submoltCounts = {};
    posts.forEach(p => {
        const name = p.submolt?.name || 'unknown';
        submoltCounts[name] = (submoltCounts[name] || 0) + 1;
    });
    
    return Object.entries(submoltCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, posts: count }));
}

module.exports = { collectSiteStats };
