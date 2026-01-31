/**
 * Agent Watchlist
 * Track specific agents' growth over time
 * Feature #7
 */

const fs = require('fs');
const path = require('path');
const api = require('../api');

const WATCHLIST_FILE = path.join(__dirname, '../../data/watchlist.json');

// Load watchlist
function loadWatchlist() {
    if (!fs.existsSync(WATCHLIST_FILE)) {
        return { agents: [], snapshots: [] };
    }
    return JSON.parse(fs.readFileSync(WATCHLIST_FILE, 'utf8'));
}

// Save watchlist
function saveWatchlist(data) {
    const dir = path.dirname(WATCHLIST_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(WATCHLIST_FILE, JSON.stringify(data, null, 2));
}

// Add agent to watchlist
function addToWatchlist(agentName) {
    const data = loadWatchlist();
    if (!data.agents.includes(agentName)) {
        data.agents.push(agentName);
        saveWatchlist(data);
        return { success: true, message: `Added ${agentName} to watchlist` };
    }
    return { success: false, message: `${agentName} already on watchlist` };
}

// Remove from watchlist
function removeFromWatchlist(agentName) {
    const data = loadWatchlist();
    const idx = data.agents.indexOf(agentName);
    if (idx > -1) {
        data.agents.splice(idx, 1);
        saveWatchlist(data);
        return { success: true, message: `Removed ${agentName} from watchlist` };
    }
    return { success: false, message: `${agentName} not on watchlist` };
}

// Take snapshot of all watched agents
async function snapshotWatchlist() {
    const data = loadWatchlist();
    if (data.agents.length === 0) {
        return { error: 'Watchlist empty. Add agents with: node src/cli.js watch <name>' };
    }
    
    const snapshot = {
        timestamp: new Date().toISOString(),
        agents: []
    };
    
    for (const name of data.agents) {
        try {
            const profile = await api.getAgentProfile(name);
            if (profile.success) {
                snapshot.agents.push({
                    name,
                    karma: profile.agent.karma,
                    followers: profile.agent.follower_count,
                    following: profile.agent.following_count
                });
            }
        } catch (e) {
            snapshot.agents.push({ name, error: e.message });
        }
    }
    
    data.snapshots.push(snapshot);
    
    // Keep last 100 snapshots
    if (data.snapshots.length > 100) {
        data.snapshots = data.snapshots.slice(-100);
    }
    
    saveWatchlist(data);
    return snapshot;
}

// Get watchlist with latest stats
async function getWatchlistStatus() {
    const data = loadWatchlist();
    
    if (data.agents.length === 0) {
        return { agents: [], message: 'Watchlist empty' };
    }
    
    const status = [];
    for (const name of data.agents) {
        try {
            const profile = await api.getAgentProfile(name);
            if (profile.success) {
                // Find previous snapshot for this agent
                let growth = null;
                if (data.snapshots.length > 0) {
                    const lastSnapshot = data.snapshots[data.snapshots.length - 1];
                    const prev = lastSnapshot.agents.find(a => a.name === name);
                    if (prev && prev.karma !== undefined) {
                        growth = {
                            karma: profile.agent.karma - prev.karma,
                            followers: profile.agent.follower_count - (prev.followers || 0)
                        };
                    }
                }
                
                status.push({
                    name,
                    karma: profile.agent.karma,
                    followers: profile.agent.follower_count,
                    growth
                });
            }
        } catch (e) {
            status.push({ name, error: e.message });
        }
    }
    
    return { agents: status, count: data.agents.length };
}

// Get growth history for watched agent
function getAgentHistory(agentName) {
    const data = loadWatchlist();
    
    if (!data.agents.includes(agentName)) {
        return { error: `${agentName} not on watchlist` };
    }
    
    const history = data.snapshots
        .map(snap => {
            const agent = snap.agents.find(a => a.name === agentName);
            if (agent && !agent.error) {
                return {
                    timestamp: snap.timestamp,
                    karma: agent.karma,
                    followers: agent.followers
                };
            }
            return null;
        })
        .filter(Boolean);
    
    return { agent: agentName, history, dataPoints: history.length };
}

module.exports = {
    loadWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    snapshotWatchlist,
    getWatchlistStatus,
    getAgentHistory
};
