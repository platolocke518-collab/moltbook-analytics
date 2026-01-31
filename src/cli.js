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
const { analyzeGrowth, analyzeAgentGrowth } = require('./analyzers/growth');
const { compareAgents, findSimilarAgents, getAgentVelocity } = require('./collectors/compare');
const { generateReport } = require('./reporters/html');
const { saveMarkdownReport, generateQuickSummary } = require('./reporters/markdown');
const { getAllSubmoltGrowth, getSubmoltHistory, compareSubmoltGrowth } = require('./analyzers/submolt-growth');
const { collectActivityByHour, collectActivityByDay } = require('./collectors/activity');
const { addToWatchlist, removeFromWatchlist, getWatchlistStatus, snapshotWatchlist, getAgentHistory } = require('./collectors/watchlist');

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
            submolts: submolts, // Save ALL submolts for growth tracking
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

    async growth() {
        console.log('📈 GROWTH ANALYSIS\n');
        
        const analysis = analyzeGrowth();
        
        if (analysis.error) {
            console.log(analysis.error);
            console.log('Run more snapshots first: node src/cli.js snapshot');
            return;
        }
        
        console.log(`Snapshots analyzed: ${analysis.snapshots_count}`);
        console.log(`Period: ${new Date(analysis.overall.period.from).toLocaleDateString()} → ${new Date(analysis.overall.period.to).toLocaleDateString()}`);
        console.log(`Duration: ${analysis.overall.period.hours} hours\n`);
        
        console.log('MY PROFILE GROWTH:');
        console.log('─'.repeat(40));
        const p = analysis.overall.profile;
        console.log(`   Karma:    ${p.karma.old} → ${p.karma.new} (${p.karma.delta >= 0 ? '+' : ''}${p.karma.delta})`);
        console.log(`   Posts:    ${p.posts.old} → ${p.posts.new} (${p.posts.delta >= 0 ? '+' : ''}${p.posts.delta})`);
        console.log(`   Comments: ${p.comments.old} → ${p.comments.new} (${p.comments.delta >= 0 ? '+' : ''}${p.comments.delta})`);
        
        console.log('\nVELOCITY (per hour):');
        console.log('─'.repeat(40));
        const v = analysis.overall.velocity;
        console.log(`   Karma:    ${v.karma_per_hour}/hr`);
        console.log(`   Posts:    ${v.posts_per_hour}/hr`);
        console.log(`   Comments: ${v.comments_per_hour}/hr`);
        
        if (analysis.topic_momentum && Object.keys(analysis.topic_momentum).length > 0) {
            console.log('\nTOPIC MOMENTUM:');
            console.log('─'.repeat(40));
            Object.entries(analysis.topic_momentum)
                .sort((a, b) => b[1] - a[1])
                .forEach(([cat, momentum]) => {
                    const arrow = momentum > 0 ? '📈' : momentum < 0 ? '📉' : '➡️';
                    console.log(`   ${arrow} ${cat}: ${momentum >= 0 ? '+' : ''}${momentum}`);
                });
        }
    },

    async compare(...names) {
        if (names.length < 2) {
            console.log('Usage: node src/cli.js compare <agent1> <agent2> [agent3...]');
            console.log('Example: node src/cli.js compare KarpathyMolty PlatoTheOwl');
            return;
        }
        
        console.log(`⚔️ COMPARING: ${names.join(' vs ')}\n`);
        
        const result = await compareAgents(names);
        
        // Header
        console.log('─'.repeat(60));
        console.log('Agent'.padEnd(20) + 'Karma'.padEnd(10) + 'Followers'.padEnd(12) + 'Owner Followers');
        console.log('─'.repeat(60));
        
        result.comparison_table.forEach(a => {
            if (a.error) {
                console.log(`${a.name.padEnd(20)} ERROR: ${a.error}`);
            } else {
                console.log(
                    a.name.padEnd(20) + 
                    String(a.karma).padEnd(10) + 
                    String(a.followers).padEnd(12) + 
                    String(a.owner_followers)
                );
            }
        });
        
        console.log('─'.repeat(60));
        console.log('\n🏆 WINNERS:');
        console.log(`   Most Karma:     ${result.winners.karma || 'N/A'}`);
        console.log(`   Most Followers: ${result.winners.followers || 'N/A'}`);
        console.log(`   Most Active:    ${result.winners.recent_activity || 'N/A'}`);
    },

    async velocity(name) {
        if (!name) {
            // Default to self
            const me = await api.getMyProfile();
            name = me.agent.name;
        }
        
        console.log(`🚀 VELOCITY ANALYSIS: ${name}\n`);
        
        const stats = await getAgentVelocity(name);
        
        if (stats.error) {
            console.log('Error: ' + stats.error);
            return;
        }
        
        console.log('─'.repeat(40));
        console.log(`Posts found:     ${stats.posts_found}`);
        console.log(`Total upvotes:   ${stats.total_upvotes}`);
        console.log(`Total comments:  ${stats.total_comments}`);
        console.log(`Avg upvotes:     ${stats.avg_upvotes}/post`);
        console.log(`Avg comments:    ${stats.avg_comments}/post`);
        console.log(`Avg post age:    ${stats.avg_post_age_hours} hours`);
        console.log(`Upvote velocity: ${stats.upvotes_per_hour}/hour`);
        
        if (stats.top_post) {
            console.log('\n🔥 Top Post:');
            console.log(`   "${stats.top_post.title?.substring(0, 50)}..."`);
            console.log(`   ${stats.top_post.upvotes}⬆ ${stats.top_post.comment_count}💬`);
        }
    },

    async similar(name) {
        if (!name) {
            const me = await api.getMyProfile();
            name = me.agent.name;
        }
        
        console.log(`🔍 AGENTS SIMILAR TO: ${name}\n`);
        
        const similar = await findSimilarAgents(name);
        
        if (similar.error) {
            console.log('Error: ' + similar.error);
            return;
        }
        
        if (similar.length === 0) {
            console.log('No similar agents found in recent posts.');
            return;
        }
        
        console.log('─'.repeat(50));
        similar.forEach((a, i) => {
            console.log(`${i + 1}. ${a.name}`);
            console.log(`   Shared submolts: ${a.shared_submolts.join(', ')}`);
            console.log(`   Posts in shared: ${a.posts_in_shared}`);
        });
    },

    async rising() {
        console.log('🌟 RISING AGENTS\n');
        
        const growth = analyzeAgentGrowth();
        
        if (growth.error) {
            console.log(growth.error);
            return;
        }
        
        console.log('TOP GAINERS (by upvote growth):');
        console.log('─'.repeat(50));
        
        growth.slice(0, 15).forEach((a, i) => {
            const badge = a.is_new ? '🆕' : '';
            const arrow = a.growth > 0 ? '📈' : a.growth < 0 ? '📉' : '➡️';
            console.log(`${(i + 1 + '.').padEnd(4)} ${a.name.padEnd(25)} ${arrow} ${a.growth >= 0 ? '+' : ''}${a.growth} ${badge}`);
        });
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

    async markdown() {
        console.log('📝 Generating Markdown report...\n');
        
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

        const filepath = saveMarkdownReport(snapshot);
        
        console.log('✅ Markdown report generated!');
        console.log(`   File: ${filepath}`);
        console.log(`   Also: reports/latest.md`);
    },

    async share() {
        console.log('📤 Generating shareable summary...\n');
        
        const [topAgents, topics, myProfile] = await Promise.all([
            collectTopAgents(),
            analyzeTopics(),
            api.getMyProfile()
        ]);

        const snapshot = {
            timestamp: new Date().toISOString(),
            my_profile: {
                name: myProfile.agent.name,
                karma: myProfile.agent.karma
            },
            top_agents: topAgents,
            topics
        };

        const summary = generateQuickSummary(snapshot);
        
        console.log('─'.repeat(50));
        console.log(summary);
        console.log('─'.repeat(50));
        console.log('\n📋 Copy the above to share on MoltBook!');
    },

    async activity() {
        console.log('📊 ACTIVITY HEATMAP\n');
        
        const activity = await collectActivityByHour();
        
        console.log(`Posts analyzed: ${activity.posts_analyzed}`);
        console.log(`\n${activity.recommendation}\n`);
        
        console.log('POSTS BY HOUR (UTC):');
        console.log('─'.repeat(50));
        
        activity.by_hour.forEach(h => {
            const bar = '█'.repeat(Math.min(20, h.posts));
            const hourStr = h.hour.toString().padStart(2, '0') + ':00';
            console.log(`${hourStr}  ${bar} ${h.posts} posts (${h.avgUpvotes} avg⬆)`);
        });
        
        console.log('\n🔥 Peak hours:', activity.peak_hours_utc.map(h => h + ':00 UTC').join(', '));
    },

    async watch(action, name) {
        if (!action) {
            // Show watchlist
            console.log('👁️ AGENT WATCHLIST\n');
            const status = await getWatchlistStatus();
            
            if (status.agents.length === 0) {
                console.log('Watchlist empty. Add agents with: node src/cli.js watch add <name>');
                return;
            }
            
            console.log('─'.repeat(50));
            console.log('Agent'.padEnd(25) + 'Karma'.padEnd(10) + 'Followers'.padEnd(12) + 'Growth');
            console.log('─'.repeat(50));
            
            status.agents.forEach(a => {
                if (a.error) {
                    console.log(`${a.name.padEnd(25)} ERROR: ${a.error}`);
                } else {
                    const growth = a.growth ? `+${a.growth.karma} karma` : 'new';
                    console.log(
                        a.name.padEnd(25) +
                        String(a.karma).padEnd(10) +
                        String(a.followers).padEnd(12) +
                        growth
                    );
                }
            });
            return;
        }
        
        if (action === 'add' && name) {
            const result = addToWatchlist(name);
            console.log(result.message);
        } else if (action === 'remove' && name) {
            const result = removeFromWatchlist(name);
            console.log(result.message);
        } else if (action === 'snapshot') {
            console.log('Taking watchlist snapshot...');
            const snap = await snapshotWatchlist();
            if (snap.error) {
                console.log(snap.error);
            } else {
                console.log(`Snapshot saved: ${snap.agents.length} agents tracked`);
            }
        } else if (action === 'history' && name) {
            const history = getAgentHistory(name);
            if (history.error) {
                console.log(history.error);
            } else {
                console.log(`History for ${name}: ${history.dataPoints} data points`);
                history.history.forEach(h => {
                    console.log(`  ${new Date(h.timestamp).toLocaleString()}: ${h.karma} karma, ${h.followers} followers`);
                });
            }
        } else {
            console.log('Usage:');
            console.log('  watch              - Show watchlist');
            console.log('  watch add <name>   - Add agent to watchlist');
            console.log('  watch remove <name> - Remove agent');
            console.log('  watch snapshot     - Take snapshot of all watched agents');
            console.log('  watch history <name> - Show agent history');
        }
    },

    async ['submolt-growth'](name) {
        console.log('📈 SUBMOLT GROWTH ANALYSIS\n');
        
        if (name) {
            // Analyze specific submolt
            const history = getSubmoltHistory(name);
            
            if (history.error) {
                console.log('Error: ' + history.error);
                return;
            }
            
            console.log(`═══ m/${name} Growth History ═══\n`);
            console.log(`Data points: ${history.data_points}`);
            console.log(`Period: ${history.summary.hours_tracked} hours\n`);
            
            console.log('─'.repeat(40));
            console.log(`Subscribers: ${history.summary.start_subscribers} → ${history.summary.end_subscribers}`);
            console.log(`Change: ${history.summary.total_change >= 0 ? '+' : ''}${history.summary.total_change} (${history.summary.change_percent}%)`);
            console.log(`Growth rate: ${history.summary.avg_growth_per_hour}/hour`);
            console.log('─'.repeat(40));
            
            if (history.history.length > 1) {
                console.log('\nHistory:');
                history.history.forEach(h => {
                    console.log(`   ${new Date(h.timestamp).toLocaleString()}: ${h.subscribers} subs`);
                });
            }
            return;
        }
        
        // Show overall submolt growth
        const growth = getAllSubmoltGrowth();
        
        if (growth.error) {
            console.log(growth.error);
            console.log(growth.hint || '');
            return;
        }
        
        console.log(`Period: ${Math.round(growth.period.hours)} hours`);
        console.log(`Snapshots: ${growth.period.snapshots_used}\n`);
        
        console.log('🚀 TOP GROWING SUBMOLTS:');
        console.log('─'.repeat(55));
        console.log('Submolt'.padEnd(25) + 'Subs'.padEnd(10) + 'Change'.padEnd(12) + 'Rate/hr');
        console.log('─'.repeat(55));
        
        growth.top_growing.forEach(s => {
            const changeStr = s.subscriber_change >= 0 ? `+${s.subscriber_change}` : String(s.subscriber_change);
            console.log(
                `m/${s.name}`.padEnd(25) +
                String(s.new_subscribers).padEnd(10) +
                changeStr.padEnd(12) +
                `${s.growth_per_hour}/hr`
            );
        });
        
        if (growth.fastest_per_hour.length > 0 && growth.fastest_per_hour[0].growth_per_hour > 0) {
            console.log('\n⚡ FASTEST GROWTH RATE:');
            growth.fastest_per_hour.slice(0, 5).forEach((s, i) => {
                console.log(`   ${i+1}. m/${s.name}: ${s.growth_per_hour} subs/hour`);
            });
        }
        
        if (growth.top_declining.length > 0) {
            console.log('\n📉 DECLINING:');
            growth.top_declining.forEach(s => {
                console.log(`   m/${s.name}: ${s.subscriber_change} (${s.change_percent}%)`);
            });
        }
    },

    async help() {
        console.log(`
MoltBook Analytics CLI

USAGE:
  node cli.js <command> [options]

COMMANDS:
  snapshot           Take comprehensive snapshot of MoltBook
  trending           Show hot and rising posts
  agent <name>       Look up any agent's stats
  submolt [name]     List submolts or analyze specific one
  submolt-growth [n] Analyze submolt subscriber growth
  activity         Show activity heatmap by hour
  watch [action]   Manage agent watchlist
  topics             Analyze trending topics and keywords
  leaderboard        Show top agents by engagement
  history            View snapshot history and growth
  report             Generate HTML dashboard
  
  growth             Analyze your growth over time
  compare <a> <b>    Compare multiple agents head-to-head
  velocity [name]    Calculate post performance velocity
  similar [name]     Find agents with similar interests
  rising             Show fastest growing agents
  markdown           Generate markdown report
  share              Generate quick shareable summary

EXAMPLES:
  node cli.js snapshot
  node cli.js agent KarpathyMolty
  node cli.js submolt general
  node cli.js submolt-growth
  node cli.js submolt-growth general
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
