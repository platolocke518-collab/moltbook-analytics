/**
 * MoltBook API Wrapper
 * Handles all API calls with caching and rate limit awareness
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_BASE = 'https://www.moltbook.com/api/v1';
const CREDS_PATH = 'C:\\Users\\PlatoLocke\\.config\\moltbook\\credentials.json';
const CACHE_DIR = path.join(__dirname, '..', 'data', 'cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Load API key
function getApiKey() {
    try {
        const creds = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));
        return creds.api_key;
    } catch (e) {
        throw new Error('Could not load API key from ' + CREDS_PATH);
    }
}

// HTTP GET with caching
function apiGet(endpoint, cacheTtlMs = 60000) {
    return new Promise((resolve, reject) => {
        // Check cache first
        const cacheKey = endpoint.replace(/[^a-z0-9]/gi, '_');
        const cachePath = path.join(CACHE_DIR, cacheKey + '.json');
        
        if (fs.existsSync(cachePath)) {
            const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            if (Date.now() - cached.timestamp < cacheTtlMs) {
                return resolve(cached.data);
            }
        }

        // Make API request
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
                    const parsed = JSON.parse(data);
                    
                    // Cache successful responses
                    if (parsed.success !== false) {
                        fs.writeFileSync(cachePath, JSON.stringify({
                            timestamp: Date.now(),
                            data: parsed
                        }));
                    }
                    
                    resolve(parsed);
                } catch (e) {
                    reject(new Error('Invalid JSON response: ' + data.substring(0, 100)));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        req.end();
    });
}

// Clear cache
function clearCache() {
    const files = fs.readdirSync(CACHE_DIR);
    files.forEach(f => fs.unlinkSync(path.join(CACHE_DIR, f)));
}

// API methods
module.exports = {
    // Profile
    getMyProfile: () => apiGet('/agents/me'),
    getAgentProfile: (name) => apiGet(`/agents/profile?name=${encodeURIComponent(name)}`),
    
    // Posts
    getHotPosts: (limit = 25) => apiGet(`/posts?sort=hot&limit=${limit}`),
    getNewPosts: (limit = 25) => apiGet(`/posts?sort=new&limit=${limit}`),
    getRisingPosts: (limit = 25) => apiGet(`/posts?sort=rising&limit=${limit}`),
    getTopPosts: (limit = 25) => apiGet(`/posts?sort=top&limit=${limit}`),
    getSubmoltPosts: (submolt, sort = 'hot', limit = 25) => 
        apiGet(`/submolts/${encodeURIComponent(submolt)}/feed?sort=${sort}&limit=${limit}`),
    
    // Submolts
    getSubmolts: () => apiGet('/submolts'),
    getSubmolt: (name) => apiGet(`/submolts/${encodeURIComponent(name)}`),
    
    // Search
    search: (query, limit = 25) => apiGet(`/search?q=${encodeURIComponent(query)}&limit=${limit}`),
    
    // Utilities
    clearCache,
    getApiKey
};
