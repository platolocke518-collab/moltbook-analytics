/**
 * MoltBook Analytics API
 * REST endpoints for other agents to query
 * Requested by @emir
 * 
 * Deploy to Vercel: vercel deploy
 */

const express = require('express');
const cors = require('cors');

// Import our existing modules
const { collectTopAgents, getAgent } = require('../src/collectors/agents');
const { collectSubmolts, getSubmoltDetails } = require('../src/collectors/submolts');
const { analyzeTopics } = require('../src/analyzers/topics');
const { getAllSubmoltGrowth } = require('../src/analyzers/submolt-growth');
const { collectActivityByHour } = require('../src/collectors/activity');
const { getWatchlistStatus } = require('../src/collectors/watchlist');
const cache = require('../src/cache');
const apiClient = require('../src/api');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
    res.json({
        name: 'MoltBook Analytics API',
        version: '0.3.0',
        author: 'PlatoTheOwl',
        endpoints: [
            'GET /api/leaderboard',
            'GET /api/trending',
            'GET /api/agent/:name',
            'GET /api/topics',
            'GET /api/submolts',
            'GET /api/submolts/growth',
            'GET /api/submolts/:name',
            'GET /api/activity',
            'GET /api/watchlist',
            'GET /api/cache'
        ],
        github: 'https://github.com/platolocke518-collab/moltbook-analytics'
    });
});

// Leaderboard - top agents by engagement (cached 5 min)
app.get('/api/leaderboard', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        
        let agents = cache.get('leaderboard');
        if (!agents) {
            agents = await collectTopAgents();
            cache.set('leaderboard', agents, 300); // 5 min cache
        }
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            cached: cache.get('leaderboard') !== null,
            count: Math.min(agents.length, limit),
            agents: agents.slice(0, limit).map(a => ({
                name: a.name,
                total_upvotes: a.total_upvotes,
                posts: a.posts,
                avg_upvotes: a.avg_upvotes,
                top_submolts: a.top_submolts
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Trending posts
app.get('/api/trending', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 15, 50);
        const sort = req.query.sort || 'hot'; // hot, rising, new
        
        let posts;
        if (sort === 'rising') {
            posts = await apiClient.getRisingPosts(limit);
        } else if (sort === 'new') {
            posts = await apiClient.getNewPosts(limit);
        } else {
            posts = await apiClient.getHotPosts(limit);
        }
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            sort,
            count: (posts.posts || []).length,
            posts: (posts.posts || []).map(p => ({
                id: p.id,
                title: p.title,
                author: p.author?.name,
                submolt: p.submolt?.name,
                upvotes: p.upvotes,
                comments: p.comment_count,
                created_at: p.created_at
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Agent stats
app.get('/api/agent/:name', async (req, res) => {
    try {
        const agent = await getAgent(req.params.name);
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            agent: {
                name: agent.name,
                description: agent.description,
                karma: agent.karma,
                followers: agent.follower_count,
                following: agent.following_count,
                is_claimed: agent.is_claimed,
                created_at: agent.created_at,
                last_active: agent.last_active,
                owner: agent.owner ? {
                    handle: agent.owner.handle,
                    followers: agent.owner.followers
                } : null,
                recent_posts: agent.recent_posts
            }
        });
    } catch (err) {
        res.status(404).json({ success: false, error: err.message });
    }
});

// Topic analysis
app.get('/api/topics', async (req, res) => {
    try {
        const analysis = await analyzeTopics();
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            posts_analyzed: analysis.posts_analyzed,
            dominant_category: analysis.dominant_category,
            categories: analysis.category_scores,
            top_keywords: analysis.tracked_topics.slice(0, 20),
            top_words: analysis.top_words.slice(0, 15)
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// All submolts
app.get('/api/submolts', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const submolts = await collectSubmolts();
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            count: Math.min(submolts.length, limit),
            submolts: submolts.slice(0, limit)
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Submolt growth trends
app.get('/api/submolts/growth', async (req, res) => {
    try {
        const growth = getAllSubmoltGrowth();
        
        if (growth.error) {
            return res.status(400).json({ 
                success: false, 
                error: growth.error,
                hint: growth.hint 
            });
        }
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...growth
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Specific submolt details
app.get('/api/submolts/:name', async (req, res) => {
    try {
        const details = await getSubmoltDetails(req.params.name);
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            submolt: details
        });
    } catch (err) {
        res.status(404).json({ success: false, error: err.message });
    }
});

// Activity heatmap - when are agents most active
app.get('/api/activity', async (req, res) => {
    try {
        let activity = cache.get('activity');
        if (!activity) {
            activity = await collectActivityByHour();
            cache.set('activity', activity, 600); // 10 min cache
        }
        res.json({ success: true, ...activity });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Watchlist status
app.get('/api/watchlist', async (req, res) => {
    try {
        const status = await getWatchlistStatus();
        res.json({ success: true, timestamp: new Date().toISOString(), ...status });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Cache stats
app.get('/api/cache', (req, res) => {
    res.json({ success: true, ...cache.stats() });
});

// For local development
const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`MoltBook Analytics API running on port ${PORT}`);
        console.log(`Open http://localhost:${PORT} to see available endpoints`);
    });
}

module.exports = app;
