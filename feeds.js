const DOMPARSER = new DOMParser().parseFromString.bind(new DOMParser());

function add_listing(item) {
  var target_element = document.getElementById(item['market']);
  if (target_element) {
    // Clean title and link
    var title = (item['title'] || '').toString().replace(/[\u00A0-\u9999<>\&]/gim, function(i) { return '&#'+i.charCodeAt(0)+';'; });
    var link = (item['link'] || '').toString().replace(/[\u00A0-\u9999<>\&]/gim, function(i) { return '&#'+i.charCodeAt(0)+';'; });
    
    var listing_entry = document.createElement('div');
    listing_entry.innerHTML += '<li class="listing-title"><a href="'+link+'" title="'+title+'" target="_blank">'+title+'</a></li>';
    listing_entry.className = 'single_listing';
    target_element.appendChild(listing_entry);
    
    var target_box = document.getElementById(item['market']+'_box');
    if (target_box) { target_box.classList.remove('loading-bg'); }
  }
}

function get_marketplaces() {
  return [
    // API / SPECIAL FORMATS
    {'name': 'trocador_price', 'feed': 'https://trocador.app/api/v1/coins', 'format': 'trocador_api'},
    {'name': 'monero_bounties', 'feed': 'https://bounties.monero.social/api/v1/posts?view=trending', 'format': 'bounties_api'},
    
    // RSS2JSON BYPASS (For feeds that block proxies)
    {'name': 'monero_talk', 'feed': 'https://feeds.fireside.fm/monerotalk/rss', 'format': 'rss2json'},
    {'name': 'monero_moon', 'feed': 'https://www.themoneromoon.com/feed', 'format': 'rss2json'},

    // STANDARD SCRAPERS
    {'name': 'blockchain_stats', 'feed': 'https://xmrchain.net/', 'format': 'scraper'},
    {'name': 'ccs', 'feed': 'https://ccs.getmonero.org/funding-required/', 'format': 'scraper'},
    {'name': 'monerochan_news', 'feed': 'https://monerochan.news', 'format': 'scraper'},
    {'name': 'monerica', 'feed': 'https://monerica.com', 'format': 'scraper'},
    {'name': 'monero_market_io', 'feed': 'https://moneromarket.io', 'format': 'scraper'},

    // STANDARD RSS/ATOM (Via Proxy)
    {'name': 'events_calendar', 'feed': 'https://monero.observer/feed-calendar.xml', 'format': 'rss'},
    {'name': 'monero_observer_news', 'feed': 'https://monero.observer/feed-mini.xml', 'format': 'rss'},
    {'name': 'revuo_monero', 'feed': 'https://www.revuo-xmr.com/atom.xml', 'format': 'rss'},
    {'name': 'monero_research', 'feed': 'https://moneroresearch.info/index.php?action=rss_RSS_CORE&method=rss20', 'format': 'rss'},
    {'name': 'monero_standard', 'feed': 'https://monero.observer/tag/the-monero-standard/feed.xml', 'format': 'rss'},
    {'name': 'monerochan_forum', 'feed': 'https://monero.town/feeds/local.xml?sort=Active', 'format': 'atom'},
    {'name': 'bitejo', 'feed': 'https://xmrbazaar.com/rss', 'format': 'rss'},
    {'name': 'reddit_monero_market', 'feed': 'https://www.reddit.com/r/moneromarket.rss', 'format': 'atom'},
    {'name': 'reddit_monero', 'feed': 'https://www.reddit.com/r/monero.rss', 'format': 'atom'},
    {'name': 'twitter_monero', 'feed': 'https://nitter.tiekoetter.com/monero/rss', 'format': 'rss'},
    {'name': 'telegram_monero_market', 'feed': 'https://rss.app/feed/f5u7lCILQ5NZ3iGl', 'format': 'rss'}
  ];
}

async function fetch_url(url, type) {
  // Strategy: Try direct first for APIs, then proxies for others
  if (type === 'trocador_api') {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.text();
    } catch(e) { console.log('Direct fetch failed, trying proxies...'); }
  }

  // RSS2JSON Strategy
  if (type === 'rss2json') {
    const apiUrl = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(url);
    const res = await fetch(apiUrl);
    if (res.ok) return await res.text();
    throw new Error('RSS2JSON failed');
  }

  // Proxy Strategy
  const proxies = [
    "https://api.allorigins.win/raw?url=",
    "https://corsproxy.io/?",
    "https://api.codetabs.com/v1/proxy?quest="
  ];

  for (const proxy of proxies) {
    try {
      const target = proxy.includes('corsproxy.io') ? proxy + url : proxy + encodeURIComponent(url);
      const res = await fetch(target, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const text = await res.text();
        // Validate we didn't get an error page
        if (text && !text.includes('Access Denied') && !text.includes('Cloudflare') && !text.includes('403 Forbidden')) {
          return text;
        }
      }
    } catch (e) { }
  }
  throw new Error('All proxies failed');
}

document.body.onload = function() {
  get_marketplaces().forEach(async (market) => {
    try {
      const text = await fetch_url(market.feed, market.format);
      
      // --- HANDLERS ---
      
      // 1. RSS2JSON Handler (Returns JSON directly)
      if (market.format === 'rss2json') {
        const json = JSON.parse(text);
        if (json.items) {
          json.items.slice(0, 6).forEach(i => {
            add_listing({"title": i.title, "link": i.link, "market": market.name});
          });
        }
      }
      // 2. Trocador API
      else if (market.format === 'trocador_api') {
        var json = JSON.parse(text);
        if (json.contents) { try { json = JSON.parse(json.contents); } catch(e){} } // Handle proxy wrapper
        
        if (Array.isArray(json)) {
          const xmr = json.find(c => c.ticker === 'XMR');
          const btc = json.find(c => c.ticker === 'BTC');
          if(xmr) { 
            $('#header_monero_usd_price').text('$'+parseFloat(xmr.usd_price).toFixed(2));
            $('#box_monero_usd_price').text('$'+parseFloat(xmr.usd_price).toFixed(2));
          }
          if(xmr && btc) $('#box_monero_btc_price').text((xmr.usd_price/btc.usd_price).toFixed(6)+' BTC');
        }
      }
      // 3. Monero Bounties API
      else if (market.format === 'bounties_api') {
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          json.slice(0, 6).forEach(i => add_listing({"title": i.title, "link": 'https://bounties.monero.social/posts/'+i.id, "market": market.name}));
        }
      }
      // 4. HTML Scrapers
      else if (market.format === 'scraper') {
        var doc = new DOMParser().parseFromString(text, "text/html");
        if (market.name === 'ccs') {
          $(doc).find('.fund-required a').slice(0, 6).each(function() {
            add_listing({"title": $(this).find('h3').text(), "link": 'https://ccs.getmonero.org'+$(this).attr('href'), "market": market.name});
          });
        } else if (market.name === 'monerochan_news') {
          $(doc).find('a[href*="article"]').slice(0, 6).each(function() {
            add_listing({"title": $(this).find('h1').text(), "link": 'https://monerochan.news'+$(this).attr('href'), "market": market.name});
          });
        } else if (market.name === 'monerica') {
          $(doc).find('li a').slice(14, 20).each(function() {
            add_listing({"title": $(this).text(), "link": $(this).attr('href'), "market": market.name});
          });
        } else if (market.name === 'monero_market_io') {
           $(doc).find('a[href*="listing"]').slice(0, 6).each(function() {
             var title = $(this).find('.desc').text();
             if(title) add_listing({"title": title, "link": 'https://moneromarket.io'+$(this).attr('href'), "market": market.name});
           });
        } else if (market.name === 'blockchain_stats') {
          var st = $(doc).text();
          $('#stats_version').text((/GUI (.*?) /.exec(st)||[])[1]||'N/A');
          $('#stats_block_height').text((/as of (.*?) block/.exec(st)||[])[1]||'N/A');
          $('#stats_hash_rate').text(((/Hash rate: (.*?) /.exec(st)||[])[1]||'N/A') + ' GH/s');
          $('#stats_fee').text(((/Fee per byte: (.*?) /.exec(st)||[])[1]||'N/A') + ' XMR');
          $('#stats_emission').text(((/Monero emission (.*?) is (.*?) /.exec(st)||[])[2]||'N/A') + ' XMR');
        }
      }
      // 5. Standard RSS/Atom XML
      else {
        var x2js = new X2JS();
        var xml = DOMPARSER(text, "text/xml");
        var data = x2js.xml2json(xml);
        var items = (market.format === 'atom') ? data.feed?.entry : data.rss?.channel?.item;
        
        if (items) {
          (Array.isArray(items) ? items : [items]).slice(0, 6).forEach(i => {
            var t = i.title;
            // Calendar cleanup
            if (market.name === 'events_calendar' && t.includes(' scheduled for ')) t = t.split(' scheduled for ')[0];
            // Twitter cleanup
            if (market.name.includes('twitter') || market.name.includes('telegram')) t = t.replace(/<[^>]*>?/gm, '').split(/\s+/).slice(0, 10).join(' ') + '…';
            
            add_listing({"title": t, "link": i.link?._href || i.link, "market": market.name});
          });
        }
      }
    } catch(e) {
      console.error(market.name + ' failed:', e);
      var el = document.getElementById(market.name+'_box');
      if (el) el.style.display = 'none'; // Hide if completely failed
    }
  });
}
