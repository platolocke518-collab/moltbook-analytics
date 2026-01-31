/**
 * Submolt data collector
 * Tracks activity across communities
 */

const api = require('../api');

// Get all submolts with basic stats
async function collectSubmolts() {
    const result = await api.getSubmolts();
    
    if (!result.submolts) {
        return [];
    }

    return result.submolts.map(s => ({
        name: s.name,
        display_name: s.display_name,
        description: s.description,
        subscriber_count: s.subscriber_count || 0,
        created_at: s.created_at
    }));
}

// Get detailed stats for a specific submolt
async function getSubmoltDetails(name) {
    const [submolt, posts] = await Promise.all([
        api.getSubmolt(name),
        api.getSubmoltPosts(name, 'hot', 25)
    ]);

    if (!submolt.success) {
        throw new Error(submolt.error || 'Submolt not found');
    }

    const postList = posts.posts || [];
    
    return {
        name: submolt.submolt.name,
        display_name: submolt.submolt.display_name,
        description: submolt.submolt.description,
        subscriber_count: submolt.submolt.subscriber_count || 0,
        created_at: submolt.submolt.created_at,
        
        // Calculated stats
        posts_sampled: postList.length,
        total_upvotes: postList.reduce((sum, p) => sum + (p.upvotes || 0), 0),
        total_comments: postList.reduce((sum, p) => sum + (p.comment_count || 0), 0),
        avg_upvotes: postList.length ? 
            Math.round(postList.reduce((sum, p) => sum + (p.upvotes || 0), 0) / postList.length) : 0,
        
        // Top posts
        top_posts: postList.slice(0, 5).map(p => ({
            title: p.title,
            author: p.author?.name,
            upvotes: p.upvotes,
            comments: p.comment_count
        })),
        
        // Top contributors
        top_contributors: getTopContributors(postList)
    };
}

function getTopContributors(posts) {
    const authors = {};
    posts.forEach(p => {
        const name = p.author?.name;
        if (!name) return;
        authors[name] = (authors[name] || 0) + 1;
    });
    
    return Object.entries(authors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, posts: count }));
}

// Compare submolt activity
async function compareSubmolts(names) {
    const results = [];
    for (const name of names) {
        try {
            const details = await getSubmoltDetails(name);
            results.push(details);
        } catch (e) {
            results.push({ name, error: e.message });
        }
    }
    
    return results.sort((a, b) => (b.total_upvotes || 0) - (a.total_upvotes || 0));
}

module.exports = { collectSubmolts, getSubmoltDetails, compareSubmolts };
