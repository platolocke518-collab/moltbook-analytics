/**
 * Comparison Tools
 * Compare agents, posts, submolts side by side
 */

const api = require('../api');
const { getAgent } = require('./agents');

// Compare two or more agents
async function compareAgents(names) {
    if (!names || names.length < 2) {
        throw new Error('Need at least 2 agent names to compare');
    }
    
    const agents = await Promise.all(names.map(async name => {
        try {
            return await getAgent(name);
        } catch (e) {
            return { name, error: e.message };
        }
    }));
    
    // Find winner in each category
    const validAgents = agents.filter(a => !a.error);
    
    const winners = {
        karma: validAgents.sort((a, b) => b.karma - a.karma)[0]?.name,
        followers: validAgents.sort((a, b) => b.follower_count - a.follower_count)[0]?.name,
        recent_activity: validAgents.sort((a, b) => 
            new Date(b.last_active) - new Date(a.last_active)
        )[0]?.name
    };
    
    return {
        agents,
        winners,
        comparison_table: agents.map(a => ({
            name: a.name,
            karma: a.karma || 0,
            followers: a.follower_count || 0,
            following: a.following_count || 0,
            owner_followers: a.owner?.followers || 0,
            recent_posts: a.recent_posts?.length || 0,
            error: a.error
        }))
    };
}

// Find similar agents (agents who post in same submolts)
async function findSimilarAgents(targetName) {
    const [hot, newPosts] = await Promise.all([
        api.getHotPosts(50),
        api.getNewPosts(50)
    ]);
    
    const allPosts = [...(hot.posts || []), ...(newPosts.posts || [])];
    
    // Find target's submolts
    const targetSubmolts = new Set();
    allPosts.forEach(p => {
        if (p.author?.name === targetName) {
            targetSubmolts.add(p.submolt?.name);
        }
    });
    
    if (targetSubmolts.size === 0) {
        return { error: 'Agent not found in recent posts' };
    }
    
    // Find other agents in same submolts
    const similarAgents = {};
    allPosts.forEach(p => {
        const author = p.author?.name;
        if (author && author !== targetName && targetSubmolts.has(p.submolt?.name)) {
            if (!similarAgents[author]) {
                similarAgents[author] = { name: author, shared_submolts: new Set(), posts: 0 };
            }
            similarAgents[author].shared_submolts.add(p.submolt?.name);
            similarAgents[author].posts++;
        }
    });
    
    return Object.values(similarAgents)
        .map(a => ({
            name: a.name,
            shared_submolts: [...a.shared_submolts],
            posts_in_shared: a.posts
        }))
        .sort((a, b) => b.shared_submolts.length - a.shared_submolts.length)
        .slice(0, 10);
}

// Get post velocity for an agent
async function getAgentVelocity(name) {
    const [hot, newPosts, top] = await Promise.all([
        api.getHotPosts(50),
        api.getNewPosts(50),
        api.getTopPosts(50)
    ]);
    
    const allPosts = [...(hot.posts || []), ...(newPosts.posts || []), ...(top.posts || [])];
    const agentPosts = allPosts.filter(p => p.author?.name === name);
    
    if (agentPosts.length === 0) {
        return { error: 'No posts found for agent' };
    }
    
    const totalUpvotes = agentPosts.reduce((s, p) => s + (p.upvotes || 0), 0);
    const totalComments = agentPosts.reduce((s, p) => s + (p.comment_count || 0), 0);
    
    // Calculate age of posts
    const now = Date.now();
    const avgAge = agentPosts.reduce((s, p) => 
        s + (now - new Date(p.created_at).getTime()), 0
    ) / agentPosts.length / (1000 * 60 * 60); // hours
    
    return {
        name,
        posts_found: agentPosts.length,
        total_upvotes: totalUpvotes,
        total_comments: totalComments,
        avg_upvotes: Math.round(totalUpvotes / agentPosts.length),
        avg_comments: Math.round(totalComments / agentPosts.length),
        avg_post_age_hours: Math.round(avgAge * 10) / 10,
        upvotes_per_hour: avgAge > 0 ? Math.round(totalUpvotes / avgAge * 10) / 10 : 0,
        top_post: agentPosts.sort((a, b) => b.upvotes - a.upvotes)[0]
    };
}

module.exports = { compareAgents, findSimilarAgents, getAgentVelocity };
