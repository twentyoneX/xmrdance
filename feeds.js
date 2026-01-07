const DOMPARSER = new DOMParser().parseFromString.bind(new DOMParser());

function add_listing(item) {
  var target_element = document.getElementById(item['market']);
  if (target_element) {
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
    // 1. DECENTRALIZED PRICE APIs
    // Option 1: Kraken Public API (no key required, supports XMR/USD and XMR/BTC)
    {'name': 'kraken_price', 'feed': 'https://api.kraken.com/0/public/Ticker?pair=XMRUSD,XMRXBT', 'format': 'api_json'},
    
    // Option 2: Multiple sources - uncomment to try these alternatives:
    // {'name': 'cryptowatch_price', 'feed': 'https://api.cryptowat.ch/markets/kraken/xmrusd/price', 'format': 'api_json'},
    // {'name': 'binance_price', 'feed': 'https://api.binance.com/api/v3/ticker/price?symbols=["XMRUSDT","BTCUSDT"]', 'format': 'api_json'},
    
    {'name': 'monero_bounties', 'feed': 'https://bounties.monero.social/api/v1/posts?view=trending', 'format': 'api_json'},

    // 2. STRICT FEEDS (RSS2JSON Only)
    {'name': 'monero_talk', 'feed': 'https://feeds.fireside.fm/monerotalk/rss', 'format': 'rss2json'},
    {'name': 'monero_moon', 'feed': 'https://www.themoneromoon.com/feed', 'format': 'rss2json'},
    {'name': 'twitter_monero', 'feed': 'https://nitter.poast.org/monero/rss', 'format': 'rss2json'},
    {'name': 'telegram_monero_market', 'feed': 'https://rss.app/feed/f5u7lCILQ5NZ3iGl', 'format': 'rss2json'},

    // 3. STANDARD RSS/ATOM (Fetched via Proxy)
    {'name': 'monerochan_forum', 'feed': 'https://monero.town/feeds/local.xml?sort=Active', 'format': 'atom'},
    {'name': 'monero_standard', 'feed': 'https://monero.observer/tag/the-monero-standard/feed.xml', 'format': 'rss2json'},
    
    {'name': 'events_calendar', 'feed': 'https://monero.observer/feed-calendar.xml', 'format': 'rss'},
    {'name': 'monero_observer_news', 'feed': 'https://monero.observer/feed-mini.xml', 'format': 'rss'},
    {'name': 'revuo_monero', 'feed': 'https://www.revuo-xmr.com/atom.xml', 'format': 'rss'},
    {'name': 'monero_research', 'feed': 'https://moneroresearch.info/index.php?action=rss_RSS_CORE&method=rss20', 'format': 'rss'},
    {'name': 'bitejo', 'feed': 'https://xmrbazaar.com/rss', 'format': 'rss'},
    {'name': 'reddit_monero_market', 'feed': 'https://www.reddit.com/r/moneromarket.rss', 'format': 'atom'},
    {'name': 'reddit_monero', 'feed': 'https://www.reddit.com/r/monero.rss', 'format': 'atom'},

    // 4. HTML SCRAPERS (Fetched via Proxy)
    {'name': 'blockchain_stats', 'feed': 'https://xmrchain.net/', 'format': 'scraper'},
    {'name': 'ccs', 'feed': 'https://ccs.getmonero.org/funding-required/', 'format': 'scraper'},
    {'name': 'monerochan_news', 'feed': 'https://monerochan.news', 'format': 'scraper'},
    {'name': 'monerica', 'feed': 'https://monerica.com', 'format': 'scraper'}
  ];
}

async function fetch_data(url, format) {
  // Strategy A: RSS2JSON (Priority for strict feeds)
  if (format === 'rss2json') {
    try {
      const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(url), {
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'ok') {
          console.log('RSS2JSON success for', url);
          return { type: 'json', content: json };
        }
      }
    } catch(e) { 
      console.log("RSS2JSON failed for " + url + ":", e.message); 
    }
  }

  // Strategy B: Proxy Fallback
  const proxies = [
    "https://corsproxy.io/?",
    "https://api.codetabs.com/v1/proxy?quest="
  ];

  for (const proxy of proxies) {
    try {
      const target = proxy.includes('corsproxy.io') ? proxy + url : proxy + encodeURIComponent(url);
      const res = await fetch(target, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const text = await res.text();
        
        // Validation
        if (text && text.length > 50 && !text.includes('Access Denied') && !text.includes('Cloudflare') && !text.includes('403 Forbidden')) {
          
          // If we expected JSON
          if (format === 'api_json') {
             try {
                let json = JSON.parse(text);
                // Handle wrapped JSON
                if (json.contents && typeof json.contents === 'string') {
                  try { json = JSON.parse(json.contents); } catch(e){}
                }
                console.log('Proxy success for', url);
                return { type: 'json', content: json };
             } catch(e) { 
               console.log('JSON parse failed for', url);
               continue; 
             } 
          }
          
          console.log('Proxy success for', url);
          return { type: 'text', content: text };
        }
      }
    } catch (e) { 
      console.log('Proxy failed:', proxy.split('?')[0], '-', e.message);
    }
  }
  throw new Error('All proxies failed for ' + url);
}

document.body.onload = function() {
  get_marketplaces().forEach(async (market) => {
    try {
      const result = await fetch_data(market.feed, market.format);
      if (!result) return;

      // --- JSON HANDLER ---
      if (result.type === 'json') {
        const json = result.content;
        
        // RSS2JSON Items
        if (json.items && Array.isArray(json.items)) {
           json.items.slice(0, 6).forEach(i => {
             if (!i.title || !i.link) return;
             var t = i.title;
             if (market.name === 'twitter_monero') {
               t = t.replace(/<[^>]*>?/gm, '').split(/\s+/).slice(0, 10).join(' ') + '…';
             }
             add_listing({"title": t, "link": i.link, "market": market.name});
           });
        }
        // KRAKEN PUBLIC API (Decentralized alternative)
        else if (market.name === 'kraken_price') {
           console.log('Kraken response:', json);
           
           if(json.result) {
             // XMR/USD price
             const xmrUsd = json.result.XMRUSD || json.result.XXMRZUSD;
             if (xmrUsd && xmrUsd.c && xmrUsd.c[0]) {
               const usdPrice = parseFloat(xmrUsd.c[0]).toFixed(2);
               console.log('Setting USD price:', usdPrice);
               $('#header_monero_usd_price').text('$'+usdPrice);
               $('#box_monero_usd_price').text('$'+usdPrice);
             }
             
             // XMR/BTC price
             const xmrBtc = json.result.XMRXBT || json.result.XXMRXXBT;
             if (xmrBtc && xmrBtc.c && xmrBtc.c[0]) {
               const btcPrice = parseFloat(xmrBtc.c[0]).toFixed(6);
               console.log('Setting BTC price:', btcPrice);
               $('#box_monero_btc_price').text(btcPrice + ' BTC');
             }
           }
           
           var el = document.getElementById('kraken_price_box');
           if (el) el.classList.remove('loading-bg');
        }
        // Alternative: Cryptowatch API
        else if (market.name === 'cryptowatch_price') {
           if (json.result && json.result.price) {
             const usdPrice = parseFloat(json.result.price).toFixed(2);
             $('#header_monero_usd_price').text('$'+usdPrice);
             $('#box_monero_usd_price').text('$'+usdPrice);
           }
        }
        // Alternative: Binance API
        else if (market.name === 'binance_price') {
           if (Array.isArray(json)) {
             const xmr = json.find(c => c.symbol === 'XMRUSDT');
             const btc = json.find(c => c.symbol === 'BTCUSDT');
             if (xmr && xmr.price) {
               const usdPrice = parseFloat(xmr.price).toFixed(2);
               $('#header_monero_usd_price').text('$'+usdPrice);
               $('#box_monero_usd_price').text('$'+usdPrice);
             }
             if (xmr && btc && xmr.price && btc.price) {
               const btcPrice = (parseFloat(xmr.price) / parseFloat(btc.price)).toFixed(6);
               $('#box_monero_btc_price').text(btcPrice + ' BTC');
             }
           }
        }
        // Bounties API
        else if (market.name === 'monero_bounties') {
           if (Array.isArray(json)) {
             json.slice(0, 6).forEach(i => {
               if (!i.title || !i.id) return;
               add_listing({
                 "title": i.title, 
                 "link": 'https://bounties.monero.social/posts/'+i.id+'/'+(i.slug||''), 
                 "market": market.name
               });
             });
           }
        }
      }
      
      // --- TEXT/XML/HTML HANDLER ---
      else if (result.type === 'text') {
        const text = result.content;
        
        if (market.format === 'scraper') {
          var doc = new DOMParser().parseFromString(text, "text/html");
          
          if (market.name === 'ccs') {
            $(doc).find('.fund-required a').slice(0, 6).each(function() {
              var title = $(this).find('h3').text();
              var link = 'https://ccs.getmonero.org'+$(this).attr('href');
              if (title && link) add_listing({"title": title, "link": link, "market": market.name});
            });
          } else if (market.name === 'monerochan_news') {
            $(doc).find('a[href*="article"]').slice(0, 6).each(function() {
              var title = $(this).find('h1').text();
              var link = 'https://monerochan.news'+$(this).attr('href');
              if (title && link) add_listing({"title": title, "link": link, "market": market.name});
            });
          } else if (market.name === 'monerica') {
            $(doc).find('li a').slice(14, 20).each(function() {
              var title = $(this).text();
              var link = $(this).attr('href');
              if (title && link) add_listing({"title": title, "link": link, "market": market.name});
            });
          } else if (market.name === 'blockchain_stats') {
            var st = $(doc).text();
            $('#stats_version').text((/GUI (.*?) /.exec(st)||[])[1]||'N/A');
            $('#stats_block_height').text((/as of (.*?) block/.exec(st)||[])[1]||'N/A');
            $('#stats_hash_rate').text(((/Hash rate: (.*?) /.exec(st)||[])[1]||'N/A') + ' GH/s');
            $('#stats_fee').text(((/Fee per byte: (.*?) /.exec(st)||[])[1]||'N/A') + ' XMR');
            $('#stats_emission').text(((/Monero emission (.*?) is (.*?) /.exec(st)||[])[2]||'N/A') + ' XMR');
          }
        } else {
          // Standard XML Parser (RSS/Atom)
          try {
            var x2js = new X2JS();
            var xml = DOMPARSER(text, "text/xml");
            
            const parseError = xml.querySelector('parsererror');
            if (parseError) {
              throw new Error('XML parsing failed');
            }
            
            var data = x2js.xml2json(xml);
            var items = null;
            
            if (market.format === 'atom') {
              items = data.feed?.entry;
            } else {
              items = data.rss?.channel?.item;
            }
            
            if (items) {
              (Array.isArray(items) ? items : [items]).slice(0, 6).forEach(i => {
                var t = i.title;
                var link = i.link?._href || i.link;
                
                if (!t || !link) return;
                
                if (market.name === 'events_calendar' && t.includes(' scheduled for ')) {
                  t = t.split(' scheduled for ')[0];
                }
                
                add_listing({"title": t, "link": link, "market": market.name});
              });
            }
          } catch (xmlError) {
            console.error('XML parse error for ' + market.name + ':', xmlError.message);
            throw xmlError;
          }
        }
      }
      
      var el = document.getElementById(market.name+'_box');
      if (el) el.classList.remove('loading-bg');
      
    } catch(e) {
      console.error(market.name + ' failed:', e.message);
      var el = document.getElementById(market.name+'_box');
      if (el) {
        el.classList.remove('loading-bg');
        el.style.display = 'none';
      }
    }
  });
}
