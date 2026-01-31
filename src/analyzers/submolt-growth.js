/**
 * Submolt Growth Analyzer
 * Tracks subscriber growth rates and activity trends
 * Requested by @Finch
 */

const fs = require('fs');
const path = require('path');

const SNAPSHOTS_DIR = path.join(__dirname, '../../data/snapshots');

// Load all snapshots
function loadSnapshots() {
    if (!fs.existsSync(SNAPSHOTS_DIR)) {
        return [];
    }
    
    const files = fs.readdirSync(SNAPSHOTS_DIR)
        .filter(f => f.endsWith('.json'))
        .sort();
    
    return files.map(f => {
        const data = JSON.parse(fs.readFileSync(path.join(SNAPSHOTS_DIR, f)));
        return {
            file: f,
            timestamp: new Date(data.timestamp),
            data
        };
    });
}

// Calculate submolt growth between two snapshots
function calculateGrowth(older, newer, submoltName) {
    const oldSubmolts = older.data.submolts || [];
    const newSubmolts = newer.data.submolts || [];
    
    const oldData = oldSubmolts.find(s => s.name === submoltName);
    const newData = newSubmolts.find(s => s.name === submoltName);
    
    if (!oldData || !newData) {
        return null;
    }
    
    const subChange = (newData.subscriber_count || 0) - (oldData.subscriber_count || 0);
    const hoursDiff = (newer.timestamp - older.timestamp) / (1000 * 60 * 60);
    
    return {
        name: submoltName,
        display_name: newData.display_name,
        old_subscribers: oldData.subscriber_count || 0,
        new_subscribers: newData.subscriber_count || 0,
        subscriber_change: subChange,
        change_percent: oldData.subscriber_count ? 
            Math.round((subChange / oldData.subscriber_count) * 100 * 10) / 10 : 
            (subChange > 0 ? 100 : 0),
        hours_between: Math.round(hoursDiff * 10) / 10,
        growth_per_hour: hoursDiff > 0 ? Math.round((subChange / hoursDiff) * 10) / 10 : 0
    };
}

// Get growth for all submolts
function getAllSubmoltGrowth() {
    const snapshots = loadSnapshots();
    
    if (snapshots.length < 2) {
        return {
            error: 'Need at least 2 snapshots to calculate growth',
            snapshots_available: snapshots.length,
            hint: 'Run `node src/cli.js snapshot` periodically to collect data'
        };
    }
    
    const oldest = snapshots[0];
    const newest = snapshots[snapshots.length - 1];
    
    // Get all submolt names from newest snapshot
    const submoltNames = (newest.data.submolts || []).map(s => s.name);
    
    const results = [];
    for (const name of submoltNames) {
        const growth = calculateGrowth(oldest, newest, name);
        if (growth) {
            results.push(growth);
        }
    }
    
    // Sort by growth rate
    results.sort((a, b) => b.subscriber_change - a.subscriber_change);
    
    return {
        period: {
            start: oldest.timestamp.toISOString(),
            end: newest.timestamp.toISOString(),
            hours: Math.round((newest.timestamp - oldest.timestamp) / (1000 * 60 * 60) * 10) / 10,
            snapshots_used: snapshots.length
        },
        top_growing: results.slice(0, 10),
        top_declining: results.filter(r => r.subscriber_change < 0).slice(0, 5),
        fastest_per_hour: [...results].sort((a, b) => b.growth_per_hour - a.growth_per_hour).slice(0, 10)
    };
}

// Get detailed growth history for a specific submolt
function getSubmoltHistory(submoltName) {
    const snapshots = loadSnapshots();
    
    if (snapshots.length === 0) {
        return { error: 'No snapshots available' };
    }
    
    const history = [];
    for (const snap of snapshots) {
        const submolt = (snap.data.submolts || []).find(s => s.name === submoltName);
        if (submolt) {
            history.push({
                timestamp: snap.timestamp.toISOString(),
                subscribers: submolt.subscriber_count || 0
            });
        }
    }
    
    if (history.length === 0) {
        return { error: `Submolt '${submoltName}' not found in any snapshots` };
    }
    
    // Calculate overall growth
    const first = history[0];
    const last = history[history.length - 1];
    const totalChange = last.subscribers - first.subscribers;
    const hoursDiff = (new Date(last.timestamp) - new Date(first.timestamp)) / (1000 * 60 * 60);
    
    return {
        submolt: submoltName,
        data_points: history.length,
        history,
        summary: {
            start_subscribers: first.subscribers,
            end_subscribers: last.subscribers,
            total_change: totalChange,
            change_percent: first.subscribers ? 
                Math.round((totalChange / first.subscribers) * 100 * 10) / 10 : 
                (totalChange > 0 ? 100 : 0),
            hours_tracked: Math.round(hoursDiff * 10) / 10,
            avg_growth_per_hour: hoursDiff > 0 ? Math.round((totalChange / hoursDiff) * 10) / 10 : 0
        }
    };
}

// Compare multiple submolts' growth
function compareSubmoltGrowth(names) {
    const results = names.map(name => {
        const history = getSubmoltHistory(name);
        if (history.error) {
            return { name, error: history.error };
        }
        return {
            name,
            display_name: name,
            ...history.summary
        };
    });
    
    return results.sort((a, b) => (b.total_change || 0) - (a.total_change || 0));
}

module.exports = {
    loadSnapshots,
    calculateGrowth,
    getAllSubmoltGrowth,
    getSubmoltHistory,
    compareSubmoltGrowth
};
