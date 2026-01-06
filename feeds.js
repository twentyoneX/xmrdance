// MoneroDance RSS Feed Loader - Fixed Version
// Handles CORS issues and implements robust error handling

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const FEED_TIMEOUT = 15000; // 15 seconds

const feedSources = {
  news: [
    { name: 'Monero Observer', url: 'https://monero.observer/feed/', category: 'MONERO OBSERVER' },
    { name: 'Revuo Monero', url: 'https://revuo-xmr.com/rss.xml', category: 'REVUO MONERO' },
    { name: 'Monero Talk', url: 'https://www.monerotalk.live/rss', category: 'MONERO TALK' },
    { name: 'MoneroChan News', url: 'https://monerochan.news/feed/', category: 'MONEROCHAN NEWS' },
    { name: 'Monero Moon', url: 'https://moneromoon.com/feed/', category: 'MONERO MOON' },
    { name: 'Monero Standard', url: 'https://localmonero.co/nojs/rss', category: 'MONERO STANDARD' }
  ],
  research: [
    { name: 'Monero Research Lab', url: 'https://github.com/monero-project/research-lab/commits/master.atom', category: 'MONERO RESEARCH' }
  ]
};

// Utility function to fetch with timeout
async function fetchWithTimeout(url, timeout = FEED_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml'
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Parse RSS/Atom feed
function parseFeed(xmlText, feedName) {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.error(`Parse error for ${feedName}:`, parserError.textContent);
      return [];
    }
    
    const items = [];
    
    // Try RSS format first
    let entries = xmlDoc.querySelectorAll('item');
    
    // If no items, try Atom format
    if (entries.length === 0) {
      entries = xmlDoc.querySelectorAll('entry');
    }
    
    entries.forEach((entry, index) => {
      if (index < 10) { // Limit to 10 items per feed
        const item = {};
        
        // Handle both RSS and Atom formats
        item.title = (entry.querySelector('title')?.textContent || '').trim();
        item.link = (entry.querySelector('link')?.textContent || 
                     entry.querySelector('link')?.getAttribute('href') || '').trim();
        item.description = (entry.querySelector('description')?.textContent || 
                           entry.querySelector('summary')?.textContent || 
                           entry.querySelector('content')?.textContent || '').trim();
        
        // Get publication date
        const pubDate = entry.querySelector('pubDate')?.textContent || 
                       entry.querySelector('published')?.textContent || 
                       entry.querySelector('updated')?.textContent || '';
        item.pubDate = pubDate ? new Date(pubDate) : new Date();
        
        // Clean up description (remove HTML tags)
        item.description = item.description.replace(/<[^>]*>/g, '').substring(0, 200);
        
        if (item.title && item.link) {
          items.push(item);
        }
      }
    });
    
    return items;
  } catch (error) {
    console.error(`Error parsing ${feedName}:`, error);
    return [];
  }
}

// Fetch single feed with error handling
async function fetchFeed(feed) {
  const feedUrl = feed.url.startsWith('http') ? feed.url : `https://${feed.url}`;
  
  try {
    // Try direct fetch first
    let response = await fetchWithTimeout(feedUrl);
    
    // If CORS error or not OK, try with proxy
    if (!response.ok) {
      console.log(`Direct fetch failed for ${feed.name}, trying proxy...`);
      response = await fetchWithTimeout(CORS_PROXY + encodeURIComponent(feedUrl));
    }
    
    const xmlText = await response.text();
    const items = parseFeed(xmlText, feed.name);
    
    return items.map(item => ({
      ...item,
      source: feed.name,
      category: feed.category
    }));
  } catch (error) {
    console.error(`Failed to fetch ${feed.name}:`, error.message);
    return [];
  }
}

// Fetch all feeds
async function fetchAllFeeds() {
  const allFeeds = [...feedSources.news, ...feedSources.research];
  const feedPromises = allFeeds.map(feed => fetchFeed(feed));
  
  const results = await Promise.allSettled(feedPromises);
  
  const allItems = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    } else {
      console.error(`Feed ${allFeeds[index].name} failed:`, result.reason);
    }
  });
  
  // Sort by date (newest first)
  allItems.sort((a, b) => b.pubDate - a.pubDate);
  
  return allItems;
}

// Display feeds in the DOM
function displayFeeds(items, containerId = 'feed-container') {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('Feed container not found');
    return;
  }
  
  if (items.length === 0) {
    container.innerHTML = '<div class="no-feeds">No feeds available at the moment. Please try again later.</div>';
    return;
  }
  
  let html = '';
  let currentCategory = '';
  
  items.forEach(item => {
    if (item.category !== currentCategory) {
      if (currentCategory !== '') {
        html += '</div>'; // Close previous category
      }
      currentCategory = item.category;
      html += `<div class="feed-category">
                 <h3>${currentCategory}</h3>`;
    }
    
    const dateStr = item.pubDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    html += `
      <div class="feed-item">
        <div class="feed-header">
          <span class="feed-source">${item.source}</span>
          <span class="feed-date">${dateStr}</span>
        </div>
        <h4><a href="${item.link}" target="_blank" rel="noopener">${item.title}</a></h4>
        <p>${item.description}${item.description.length >= 200 ? '...' : ''}</p>
      </div>
    `;
  });
  
  if (currentCategory !== '') {
    html += '</div>'; // Close last category
  }
  
  container.innerHTML = html;
}

// Initialize and load feeds
async function initFeeds() {
  const container = document.getElementById('feed-container');
  if (container) {
    container.innerHTML = '<div class="loading">Loading feeds...</div>';
  }
  
  try {
    const items = await fetchAllFeeds();
    displayFeeds(items);
  } catch (error) {
    console.error('Error initializing feeds:', error);
    if (container) {
      container.innerHTML = '<div class="error">Error loading feeds. Please refresh the page.</div>';
    }
  }
}

// Export for use in HTML
if (typeof window !== 'undefined') {
  window.MoneroFeeds = {
    init: initFeeds,
    fetch: fetchAllFeeds,
    display: displayFeeds
  };
}

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFeeds);
} else {
  initFeeds();
}
