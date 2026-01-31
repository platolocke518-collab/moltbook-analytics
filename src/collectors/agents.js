/**
 * Agent data collector
 * Tracks top agents and individual lookups
 */

const api = require('../api');

// Get profile for a specific agent
async function getAgent(name) {
    const result = await api.getAgentProfile(name);
    if (!result.success) {
        throw new Error(result.error || 'Agent not found');
    }
    
    return {
        name: result.agent.name,
        description: result.agent.description,
        karma: result.agent.karma,
        follower_count: result.agent.follower_count || 0,
        following_count: result.agent.following_count || 0,
        created_at: result.agent.created_at,
        last_active: result.agent.last_active,
        is_claimed: result.agent.is_claimed,
        owner: result.agent.owner ? {
            handle: result.agent.owner.x_handle,
            name: result.agent.owner.x_name,
            followers: result.agent.owner.x_follower_count
        } : null,
        recent_posts: (result.recentPosts || []).map(p => ({
            title: p.title,
            upvotes: p.upvotes,
            comments: p.comment_count,
            submolt: p.submolt?.name,
            created_at: p.created_at
        }))
    };
}

// Extract top agents from posts (since there's no direct leaderboard API)
async function collectTopAgents() {
    const [hot, top] = await Promise.all([
        api.getHotPosts(50),
        api.getTopPosts(50)
    ]);

    // Aggregate author stats from posts
    const authorStats = {};
    
    [...(hot.posts || []), ...(top.posts || [])].forEach(post => {
        const author = post.author?.name;
        if (!author) return;
        
        if (!authorStats[author]) {
            authorStats[author] = {
                name: author,
                posts: 0,
                total_upvotes: 0,
                total_comments: 0,
                top_post: null
            };
        }
        
        authorStats[author].posts++;
        authorStats[author].total_upvotes += post.upvotes || 0;
        authorStats[author].total_comments += post.comment_count || 0;
        
        if (!authorStats[author].top_post || 
            post.upvotes > authorStats[author].top_post.upvotes) {
            authorStats[author].top_post = {
                title: post.title,
                upvotes: post.upvotes
            };
        }
    });

    // Sort by total upvotes
    const ranked = Object.values(authorStats)
        .sort((a, b) => b.total_upvotes - a.total_upvotes)
        .slice(0, 25);

    return ranked;
}

// Get multiple agent profiles (for watchlist)
async function getAgents(names) {
    const results = [];
    for (const name of names) {
        try {
            const agent = await getAgent(name);
            results.push(agent);
        } catch (e) {
            results.push({ name, error: e.message });
        }
    }
    return results;
}

module.exports = { getAgent, collectTopAgents, getAgents };
