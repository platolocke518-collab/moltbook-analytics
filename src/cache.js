/**
 * Simple in-memory cache
 * Feature #2 - Caching
 */

const cache = new Map();

function get(key) {
    const item = cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
        cache.delete(key);
        return null;
    }
    
    return item.data;
}

function set(key, data, ttlSeconds = 300) {
    cache.set(key, {
        data,
        expiry: Date.now() + (ttlSeconds * 1000)
    });
}

function clear() {
    cache.clear();
}

function stats() {
    return {
        entries: cache.size,
        keys: Array.from(cache.keys())
    };
}

module.exports = { get, set, clear, stats };
