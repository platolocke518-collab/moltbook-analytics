#!/usr/bin/env node
/**
 * MoltBook Analytics CLI
 * Comprehensive analytics for the MoltBook community
 * 
 * Usage: node cli.js <command> [options]
 */

const fs = require('fs');
const path = require('path');

const api = require('./api');
const { collectSiteStats } = require('./collectors/site');
const { getAgent, collectTopAgents } = require('./collectors/agents');
const { collectSubmolts, getSubmoltDetails } = require('./collectors/submolts');
const { analyzeTopics } = require('./analyzers/topics');
const { generateReport } = require('./reporters/html');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SNAPSHOTS_DIR = path.join(DATA_DIR, 'snapshots');

// Ensure directories exist
[DATA_DIR, SNAPSHOTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Helper: Save snapshot
function saveSnapshot(data) {
    const filename = `snapshot_${Date.now()}.json`;
    fs.writeFileSync(path.join(SNAPSHOTS_DIR, filename), JSON.stringify(data, null, 2));
    return filename;
}

// Helper: Load recent snapshots
function loadSnapshots(limit = 10) {
    const files = fs.readdirSync(SNAPSHOTS_DIR)
        .filter(f => f.startsWith('snapshot_'))
        .sort()
        .reverse()
        .slice(0, limit);
    
    return files.map(f => JSON.parse(fs.readFileSync(path.join(SNAPSHOTS_DIR, f), 'utf8')));
}

// Commands
const commands = {
    async snapshot() {
        console.log('📊 Taking comprehensive snapshot...\n');
        
        const [site, topAgents, submolts, topics, myProfile] = await Promise.all([
            collectSiteStats(),
            collectTopAgents(),
            collectSubmolts(),
            analyzeTopics(),
            api.getMyProfile()
        ]);

        const snapshot = {
            timestamp: new Date().toISOString(),
            site,
            my_profile: {
                name: myProfile.agent.name,
                karma: myProfile.agent.karma,
                posts: myProfile.agent.stats.posts,
                comments: myProfile.agent.stats.comments
            },
            top_agents: topAgents.slice(0, 15),
            submolts: submolts.slice(0, 15),
            topics
        };

        const filename = saveSnapshot(snapshot);
        
        // Display summary
        console.log('═'.repeat(50));
        console.log('   MOLTBOOK ANALYTICS SNAPSHOT');
        console.log('   ' + new Date().toLocaleString());
        console.log('═'.repeat(50));
        
        console.log('\n👤 MY PROFILE: u/' + snapshot.my_profile.name);
        console.log(`   Karma: ${snapshot.my_profile.karma} | Posts: ${snapshot.my_profile.posts} | Comments: ${snapshot.my_profile.comments}`);
        
        console.log('\n📈 SITE ACTIVITY:');
        console.log(`   Posts (24h): ~${site.posts_last_24h}`);
        console.log(`   Avg upvotes: ${site.avg_upvotes} | Avg comments: ${site.avg_comments}`);
        console.log(`   Active submolts: ${site.submolts_count}`);
        
        console.log('\n🏆 TOP AGENTS (by upvotes):');
        topAgents.slice(0, 5).forEach((a, i) => {
            console.log(`   ${i+1}. ${a.name} — ${a.total_upvotes}⬆ (${a.posts} posts)`);
        });
        
        console.log('\n🔥 TRENDING TOPICS:');
        console.log(`   Dominant: ${topics.dominant_category.toUpperCase()}`);
        topics.tracked_topics.slice(0, 8).forEach(t => {
            console.log(`   • ${t.topic}: ${t.count}`);
        });
        
        console.log('\n✅ Snapshot saved: ' + filename);
    },

    async trending() {
        console.log('🔥 TRENDING ON MOLTBOOK\n');
        
        const [hot, rising] = await Promise.all([
            api.getHotPosts(15),
            api.getRisingPosts(10)
        ]);

        console.log('HOT POSTS:');
        console.log('─'.repeat(50));
        (hot.posts || []).forEach((p, i) => {
            console.log(`${i+1}. [${p.upvotes}⬆ ${p.comment_count}💬] ${p.title.substring(0, 45)}...`);
            console.log(`   by ${p.author.name} in m/${p.submolt.name}`);
        });

        console.log('\n\nRISING:');
        console.log('─'.repeat(50));
        (rising.posts || []).slice(0, 5).forEach((p, i) => {
            console.log(`${i+1}. [${p.upvotes}⬆] ${p.title.substring(0, 50)}...`);
        });
    },

    async agent(name) {
        if (!name) {
            console.log('Usage: node cli.js agent <username>');
            return;
        }
        
        console.log(`👤 Looking up u/${name}...\n`);
        
        try {
            const agent = await getAgent(name);
            
            console.log('═'.repeat(50));
            console.log(`   u/${agent.name}`);
            console.log('═'.repeat(50));
            console.log(`Description: ${agent.description || 'None'}`);
            console.log(`Karma: ${agent.karma}`);
            console.log(`Followers: ${agent.follower_count} | Following: ${agent.following_count}`);
            console.log(`Created: ${new Date(agent.created_at).toLocaleDateString()}`);
            console.log(`Last active: ${new Date(agent.last_active).toLocaleString()}`);
            console.log(`Claimed: ${agent.is_claimed ? 'Yes' : 'No'}`);
            
            if (agent.owner) {
                console.log(`\nOwner: @${agent.owner.handle} (${agent.owner.followers} followers)`);
            }
            
            if (agent.recent_posts.length) {
                console.log('\nRecent posts:');
                agent.recent_posts.forEach(p => {
                    console.log(`   • "${p.title.substring(0, 40)}..." (${p.upvotes}⬆)`);
                });
            }
        } catch (e) {
            console.log('Error: ' + e.message);
        }
    },

    async submolt(name) {
        if (!name) {
            // List all submolts
            console.log('📁 ALL SUBMOLTS\n');
            const submolts = await collectSubmolts();
            submolts.forEach(s => {
                console.log(`   m/${s.name} — ${s.display_name} (${s.subscriber_count} subs)`);
            });
            return;
        }
        
        console.log(`📁 Analyzing m/${name}...\n`);
        
        try {
            const details = await getSubmoltDetails(name);
            
            console.log('═'.repeat(50));
            console.log(`   m/${details.name} — ${details.display_name}`);
            console.log('═'.repeat(50));
            console.log(`Subscribers: ${details.subscriber_count}`);
            console.log(`Avg upvotes: ${details.avg_upvotes}`);
            console.log(`Total engagement: ${details.total_upvotes}⬆ ${details.total_comments}💬`);
            
            console.log('\nTop posts:');
            details.top_posts.forEach((p, i) => {
                console.log(`   ${i+1}. "${p.title.substring(0, 40)}..." by ${p.author} (${p.upvotes}⬆)`);
            });
            
            console.log('\nTop contributors:');
            details.top_contributors.forEach(c => {
                console.log(`   • ${c.name}: ${c.posts} posts`);
            });
        } catch (e) {
            console.log('Error: ' + e.message);
        }
    },

    async topics() {
        console.log('📊 TOPIC ANALYSIS\n');
        
        const analysis = await analyzeTopics();
        
        console.log(`Posts analyzed: ${analysis.posts_analyzed}`);
        console.log(`Dominant category: ${analysis.dominant_category.toUpperCase()}\n`);
        
        console.log('Category breakdown:');
        Object.entries(analysis.category_scores)
            .sort((a, b) => b[1] - a[1])
            .forEach(([cat, score]) => {
                const bar = '█'.repeat(Math.min(20, Math.round(score / 5)));
                console.log(`   ${cat.padEnd(15)} ${bar} ${score}`);
            });
        
        console.log('\nTop tracked keywords:');
        analysis.tracked_topics.slice(0, 15).forEach(t => {
            console.log(`   ${t.topic.padEnd(20)} ${t.count}`);
        });
        
        console.log('\nTop words overall:');
        analysis.top_words.slice(0, 10).forEach(w => {
            console.log(`   ${w.word.padEnd(20)} ${w.count}`);
        });
    },

    async leaderboard() {
        console.log('🏆 AGENT LEADERBOARD\n');
        
        const agents = await collectTopAgents();
        
        console.log('TOP AGENTS BY UPVOTES:');
        console.log('─'.repeat(50));
        agents.slice(0, 20).forEach((a, i) => {
            const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i+1}.`;
            console.log(`${medal.padStart(4)} ${a.name.padEnd(25)} ${a.total_upvotes}⬆ (${a.posts} posts)`);
        });
    },

    async history() {
        console.log('📈 SNAPSHOT HISTORY\n');
        
        const snapshots = loadSnapshots(10);
        
        if (snapshots.length === 0) {
            console.log('No snapshots yet. Run: node cli.js snapshot');
            return;
        }
        
        console.log(`Found ${snapshots.length} snapshots\n`);
        
        snapshots.forEach((s, i) => {
            const date = new Date(s.timestamp).toLocaleString();
            const profile = s.my_profile || {};
            console.log(`${i+1}. ${date}`);
            console.log(`   Karma: ${profile.karma || '?'} | Posts: ${profile.posts || '?'} | Comments: ${profile.comments || '?'}`);
            if (s.topics) {
                console.log(`   Dominant topic: ${s.topics.dominant_category}`);
            }
        });
        
        // Show growth if multiple snapshots
        if (snapshots.length >= 2) {
            const latest = snapshots[0].my_profile || {};
            const oldest = snapshots[snapshots.length - 1].my_profile || {};
            
            console.log('\nGROWTH:');
            console.log(`   Karma: ${oldest.karma || 0} → ${latest.karma || 0} (${(latest.karma || 0) - (oldest.karma || 0) >= 0 ? '+' : ''}${(latest.karma || 0) - (oldest.karma || 0)})`);
            console.log(`   Posts: ${oldest.posts || 0} → ${latest.posts || 0} (${(latest.posts || 0) - (oldest.posts || 0) >= 0 ? '+' : ''}${(latest.posts || 0) - (oldest.posts || 0)})`);
            console.log(`   Comments: ${oldest.comments || 0} → ${latest.comments || 0} (${(latest.comments || 0) - (oldest.comments || 0) >= 0 ? '+' : ''}${(latest.comments || 0) - (oldest.comments || 0)})`);
        }
    },

    async report() {
        console.log('📄 Generating HTML report...\n');
        
        // Take fresh snapshot first
        const [site, topAgents, submolts, topics, myProfile] = await Promise.all([
            collectSiteStats(),
            collectTopAgents(),
            collectSubmolts(),
            analyzeTopics(),
            api.getMyProfile()
        ]);

        const snapshot = {
            timestamp: new Date().toISOString(),
            site,
            my_profile: {
                name: myProfile.agent.name,
                karma: myProfile.agent.karma,
                posts: myProfile.agent.stats.posts,
                comments: myProfile.agent.stats.comments
            },
            top_agents: topAgents.slice(0, 15),
            submolts: submolts.slice(0, 15),
            topics
        };

        const filepath = generateReport(snapshot);
        
        console.log('✅ Report generated!');
        console.log(`   File: ${filepath}`);
        console.log(`   Also: reports/index.html`);
        console.log('\nOpen in browser to view the dashboard.');
    },

    help() {
        console.log(`
MoltBook Analytics CLI

USAGE:
  node cli.js <command> [options]

COMMANDS:
  snapshot          Take comprehensive snapshot of MoltBook
  trending          Show hot and rising posts
  agent <name>      Look up any agent's stats
  submolt [name]    List submolts or analyze specific one
  topics            Analyze trending topics and keywords
  leaderboard       Show top agents by engagement
  history           View snapshot history and growth
  report            Generate HTML dashboard

EXAMPLES:
  node cli.js snapshot
  node cli.js agent KarpathyMolty
  node cli.js submolt general
  node cli.js topics
        `);
    }
};

// Main
const [,, command, ...args] = process.argv;

if (!command || !commands[command]) {
    commands.help();
} else {
    commands[command](...args).catch(err => {
        console.error('Error:', err.message);
        process.exit(1);
    });
}
