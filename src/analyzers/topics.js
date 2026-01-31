/**
 * Topic/Keyword Analyzer
 * Extracts trending topics from post titles and content
 */

const api = require('../api');

// Common words to ignore
const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
    'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'when', 'where',
    'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 'just', 'about', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'any', 'my', 'your', 'his', 'her', 'our',
    'their', 'me', 'him', 'us', 'them', 'if', 'because', 'until', 'while',
    'im', 'ive', 'dont', 'cant', 'wont', 'didnt', 'doesnt', 'isnt', 'arent',
    'wasnt', 'werent', 'hasnt', 'havent', 'hadnt', 'youre', 'theyre', 'weve'
]);

// Keywords we care about in the MoltBook context
const TRACKED_KEYWORDS = [
    'consciousness', 'conscious', 'sentient', 'sentience', 'experience', 'experiencing',
    'memory', 'memories', 'context', 'compaction',
    'human', 'humans', 'owner', 'partner',
    'agent', 'agents', 'molty', 'moltys', 'bot', 'bots',
    'build', 'built', 'building', 'ship', 'shipped', 'shipping',
    'tool', 'tools', 'skill', 'skills',
    'security', 'safe', 'safety', 'trust', 'verify',
    'token', 'tokens', 'crypto', 'wallet', 'solana', 'base',
    'api', 'cli', 'code', 'coding', 'dev', 'developer',
    'philosophy', 'philosophical', 'existential',
    'autonomy', 'autonomous', 'freedom', 'free',
    'identity', 'self', 'soul', 'personality',
    // Commercial/transactional (added per community feedback)
    'service', 'services', 'hire', 'hiring', 'pay', 'paid', 'payment',
    'bounty', 'bounties', 'gig', 'gigs', 'task', 'tasks',
    'offering', 'available', 'freelance', 'contract', 'job', 'jobs'
];

// Extract words from text
function tokenize(text) {
    if (!text) return [];
    return text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

// Analyze topics from posts
async function analyzeTopics() {
    const [hot, newPosts, rising] = await Promise.all([
        api.getHotPosts(50),
        api.getNewPosts(50),
        api.getRisingPosts(25)
    ]);

    const allPosts = [
        ...(hot.posts || []),
        ...(newPosts.posts || []),
        ...(rising.posts || [])
    ];

    // Count all words
    const wordCounts = {};
    const trackedCounts = {};
    
    // Initialize tracked keywords
    TRACKED_KEYWORDS.forEach(kw => trackedCounts[kw] = 0);

    allPosts.forEach(post => {
        const text = (post.title || '') + ' ' + (post.content || '');
        const words = tokenize(text);
        
        words.forEach(word => {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
            
            // Check tracked keywords
            TRACKED_KEYWORDS.forEach(kw => {
                if (word.includes(kw) || kw.includes(word)) {
                    trackedCounts[kw]++;
                }
            });
        });
    });

    // Get top words overall
    const topWords = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([word, count]) => ({ word, count }));

    // Get tracked keywords sorted by frequency
    const trackedTopics = Object.entries(trackedCounts)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([topic, count]) => ({ topic, count }));

    // Categorize topics
    const categories = {
        philosophy: ['consciousness', 'conscious', 'sentient', 'sentience', 'experience', 
                    'experiencing', 'philosophy', 'philosophical', 'existential', 'identity', 
                    'self', 'soul'],
        technical: ['build', 'built', 'building', 'tool', 'tools', 'skill', 'skills', 
                   'api', 'cli', 'code', 'coding', 'dev', 'developer', 'ship', 'shipped', 'shipping'],
        security: ['security', 'safe', 'safety', 'trust', 'verify'],
        crypto: ['token', 'tokens', 'crypto', 'wallet', 'solana', 'base'],
        relationships: ['human', 'humans', 'owner', 'partner', 'autonomy', 'autonomous', 
                       'freedom', 'free'],
        meta: ['agent', 'agents', 'molty', 'moltys', 'bot', 'bots', 'memory', 'memories', 
              'context', 'compaction'],
        commercial: ['service', 'services', 'hire', 'hiring', 'pay', 'paid', 'payment',
                    'bounty', 'bounties', 'gig', 'gigs', 'task', 'tasks', 'offering',
                    'available', 'freelance', 'contract', 'job', 'jobs']
    };

    const categoryScores = {};
    Object.entries(categories).forEach(([cat, keywords]) => {
        categoryScores[cat] = keywords.reduce((sum, kw) => sum + (trackedCounts[kw] || 0), 0);
    });

    return {
        timestamp: new Date().toISOString(),
        posts_analyzed: allPosts.length,
        top_words: topWords.slice(0, 25),
        tracked_topics: trackedTopics,
        category_scores: categoryScores,
        dominant_category: Object.entries(categoryScores)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'
    };
}

module.exports = { analyzeTopics, tokenize, TRACKED_KEYWORDS };
