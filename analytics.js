#!/usr/bin/env node
/**
 * MoltBook Analytics Tool
 * Track stats, trending posts, and community activity
 * 
 * Usage: node analytics.js [command]
 * Commands:
 *   snapshot  - Take a snapshot of current stats
 *   report    - Generate a summary report
 *   trending  - Show what's hot right now
 *   history   - Show stats over time
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Config
const API_BASE = 'https://www.moltbook.com/api/v1';
const CREDS_PATH = 'C:\\Users\\PlatoLocke\\.config\\moltbook\\credentials.json';
const DATA_PATH = path.join(__dirname, 'data.json');

// Load API key
function getApiKey() {
    try {
        const creds = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));
        return creds.api_key;
    } catch (e) {
        console.error('Could not load API key from', CREDS_PATH);
        process.exit(1);
    }
}

// HTTP GET helper
function apiGet(endpoint) {
    return new Promise((resolve, reject) => {
        const fullUrl = API_BASE + endpoint;
        const url = new URL(fullUrl);
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${getApiKey()}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.error('Response:', data.substring(0, 200));
                    reject(new Error('Invalid JSON response'));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// Load historical data
function loadData() {
    try {
        return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    } catch (e) {
        return { snapshots: [], created: new Date().toISOString() };
    }
}

// Save data
function saveData(data) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// Take a snapshot of current stats
async function takeSnapshot() {
    console.log('📊 Taking MoltBook snapshot...\n');

    const [me, hotPosts, newPosts] = await Promise.all([
        apiGet('/agents/me'),
        apiGet('/posts?sort=hot&limit=10'),
        apiGet('/posts?sort=new&limit=10')
    ]);

    const snapshot = {
        timestamp: new Date().toISOString(),
        profile: {
            name: me.agent.name,
            karma: me.agent.karma,
            posts: me.agent.stats.posts,
            comments: me.agent.stats.comments,
            subscriptions: me.agent.stats.subscriptions,
            follower_count: me.agent.follower_count || 0,
            following_count: me.agent.following_count || 0
        },
        trending: hotPosts.posts.slice(0, 5).map(p => ({
            title: p.title.substring(0, 60) + (p.title.length > 60 ? '...' : ''),
            author: p.author.name,
            upvotes: p.upvotes,
            comments: p.comment_count,
            submolt: p.submolt.name
        }))
    };

    // Save to history
    const data = loadData();
    data.snapshots.push(snapshot);
    
    // Keep last 100 snapshots
    if (data.snapshots.length > 100) {
        data.snapshots = data.snapshots.slice(-100);
    }
    
    saveData(data);

    // Display current stats
    console.log('👤 Profile: u/' + snapshot.profile.name);
    console.log('─'.repeat(40));
    console.log(`   Karma:      ${snapshot.profile.karma}`);
    console.log(`   Posts:      ${snapshot.profile.posts}`);
    console.log(`   Comments:   ${snapshot.profile.comments}`);
    console.log(`   Followers:  ${snapshot.profile.follower_count}`);
    console.log(`   Following:  ${snapshot.profile.following_count}`);
    console.log('');
    console.log('🔥 Trending Now:');
    console.log('─'.repeat(40));
    snapshot.trending.forEach((p, i) => {
        console.log(`${i + 1}. "${p.title}"`);
        console.log(`   by ${p.author} | ⬆${p.upvotes} 💬${p.comments} | m/${p.submolt}`);
    });
    console.log('');
    console.log(`✅ Snapshot saved (${data.snapshots.length} total)`);

    return snapshot;
}

// Show history/growth
async function showHistory() {
    const data = loadData();
    
    if (data.snapshots.length < 2) {
        console.log('Not enough data yet. Take more snapshots!');
        return;
    }

    console.log('📈 Stats History\n');
    console.log('─'.repeat(50));
    
    const first = data.snapshots[0];
    const last = data.snapshots[data.snapshots.length - 1];
    
    console.log(`First snapshot: ${new Date(first.timestamp).toLocaleString()}`);
    console.log(`Last snapshot:  ${new Date(last.timestamp).toLocaleString()}`);
    console.log(`Total snapshots: ${data.snapshots.length}`);
    console.log('');
    console.log('Growth:');
    console.log(`   Karma:     ${first.profile.karma} → ${last.profile.karma} (${last.profile.karma - first.profile.karma >= 0 ? '+' : ''}${last.profile.karma - first.profile.karma})`);
    console.log(`   Posts:     ${first.profile.posts} → ${last.profile.posts} (${last.profile.posts - first.profile.posts >= 0 ? '+' : ''}${last.profile.posts - first.profile.posts})`);
    console.log(`   Comments:  ${first.profile.comments} → ${last.profile.comments} (${last.profile.comments - first.profile.comments >= 0 ? '+' : ''}${last.profile.comments - first.profile.comments})`);
    
    // Show last 5 snapshots
    console.log('\nRecent snapshots:');
    data.snapshots.slice(-5).forEach(s => {
        const date = new Date(s.timestamp).toLocaleString();
        console.log(`   ${date} | K:${s.profile.karma} P:${s.profile.posts} C:${s.profile.comments}`);
    });
}

// Show trending analysis
async function showTrending() {
    console.log('🔥 MoltBook Trending Analysis\n');

    const [hot, rising, newPosts] = await Promise.all([
        apiGet('/posts?sort=hot&limit=15'),
        apiGet('/posts?sort=rising&limit=10'),
        apiGet('/posts?sort=new&limit=10')
    ]);

    console.log('TOP HOT POSTS:');
    console.log('─'.repeat(50));
    hot.posts.forEach((p, i) => {
        console.log(`${i + 1}. [${p.upvotes}⬆ ${p.comment_count}💬] "${p.title.substring(0, 50)}..."`);
        console.log(`   by ${p.author.name} in m/${p.submolt.name}`);
    });

    console.log('\n\nRISING:');
    console.log('─'.repeat(50));
    rising.posts.slice(0, 5).forEach((p, i) => {
        console.log(`${i + 1}. [${p.upvotes}⬆] "${p.title.substring(0, 50)}..."`);
    });

    // Topic analysis
    console.log('\n\nTOPIC FREQUENCY (from titles):');
    console.log('─'.repeat(50));
    const allTitles = [...hot.posts, ...newPosts.posts].map(p => p.title.toLowerCase()).join(' ');
    const keywords = ['consciousness', 'memory', 'human', 'agent', 'build', 'tool', 'security', 'token', 'crypto'];
    keywords.forEach(kw => {
        const count = (allTitles.match(new RegExp(kw, 'g')) || []).length;
        if (count > 0) {
            console.log(`   ${kw}: ${count} mentions`);
        }
    });
}

// Generate full report
async function generateReport() {
    console.log('═'.repeat(50));
    console.log('   MOLTBOOK ANALYTICS REPORT');
    console.log('   Generated: ' + new Date().toLocaleString());
    console.log('═'.repeat(50));
    console.log('');
    
    await takeSnapshot();
    console.log('\n');
    await showHistory();
}

// Main
const command = process.argv[2] || 'snapshot';

switch (command) {
    case 'snapshot':
        takeSnapshot().catch(console.error);
        break;
    case 'history':
        showHistory().catch(console.error);
        break;
    case 'trending':
        showTrending().catch(console.error);
        break;
    case 'report':
        generateReport().catch(console.error);
        break;
    default:
        console.log('Usage: node analytics.js [snapshot|history|trending|report]');
}
