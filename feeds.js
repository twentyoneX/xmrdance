const DOMPARSER = new DOMParser().parseFromString.bind(new DOMParser());

function add_listing(item) {
  var target_element = document.getElementById(item['market']);
  if (target_element) {
    item['title'] = (item['title'] || '').toString().replace(/[\u00A0-\u9999<>\&]/gim, function(i) { return '&#'+i.charCodeAt(0)+';'; });
    item['link'] = (item['link'] || '').toString().replace(/[\u00A0-\u9999<>\&]/gim, function(i) { return '&#'+i.charCodeAt(0)+';'; });
    var listing_entry = document.createElement('div');
    listing_entry.innerHTML += '<li class="listing-title"><a href="'+item['link']+'" title="'+item['title']+'" target="_blank">'+item['title']+'</a></li>';
    listing_entry.className = 'single_listing';
    target_element.appendChild(listing_entry);
    var target_box = document.getElementById(item['market']+'_box');
    if (target_box) { target_box.classList.remove('loading-bg'); }
  }
}

function get_marketplaces() {
  return [
    {'name': 'trocador_price', 'feed': 'https://trocador.app/api/v1/coins', 'format': 'api'},
    {'name': 'blockchain_stats', 'feed': 'https://xmrchain.net/', 'format': 'scraper'},
    {'name': 'events_calendar', 'feed': 'https://monero.observer/feed-calendar.xml', 'format': 'rss'},
    {'name': 'monero_observer_news', 'feed': 'https://monero.observer/feed-mini.xml', 'format': 'rss'},
    {'name': 'revuo_monero', 'feed': 'https://www.revuo-xmr.com/atom.xml', 'format': 'rss'},
    {'name': 'monero_research', 'feed': 'https://moneroresearch.info/index.php?action=rss_RSS_CORE&method=rss20', 'format': 'rss'},
    {'name': 'monero_standard', 'feed': 'https://monero.observer/tag/the-monero-standard/feed.xml', 'format': 'rss'},
    {'name': 'monero_talk', 'feed': 'https://feeds.fireside.fm/monerotalk/rss', 'format': 'rss'},
    {'name': 'monero_moon', 'feed': 'https://www.themoneromoon.com/feed', 'format': 'rss'},
    {'name': 'monero_bounties', 'feed': 'https://bounties.monero.social/api/v1/posts?view=trending', 'format': 'api'},
    {'name': 'ccs', 'feed': 'https://ccs.getmonero.org/funding-required/', 'format': 'scraper'},
    {'name': 'monerochan_news', 'feed': 'https://monerochan.news', 'format': 'scraper'},
    {'name': 'monerochan_forum', 'feed': 'https://monero.town/feeds/local.xml?sort=Active', 'format': 'atom'},
    {'name': 'monerica', 'feed': 'https://monerica.com', 'format': 'scraper'},
    {'name': 'bitejo', 'feed': 'https://xmrbazaar.com/rss', 'format': 'rss'},
    {'name': 'reddit_monero_market', 'feed': 'https://www.reddit.com/r/moneromarket.rss', 'format': 'atom'},
    {'name': 'twitter_monero', 'feed': 'https://nitter.tiekoetter.com/monero/rss', 'format': 'rss'},
    {'name': 'telegram_monero_market', 'feed': 'https://nitter.tiekoetter.com/monero_market/rss', 'format': 'rss'},
    {'name': 'reddit_monero', 'feed': 'https://www.reddit.com/r/monero.rss', 'format': 'atom'}
  ];
}

async function fetch_with_fallbacks(url) {
  const proxies = [
    "https://api.allorigins.win/raw?url=",
    "https://api.codetabs.com/v1/proxy?quest=",
    "https://corsproxy.io/?"
  ];
  for (const proxy of proxies) {
    try {
      const response = await fetch(proxy + encodeURIComponent(url), { signal: AbortSignal.timeout(10000) });
      if (response.ok) {
        const text = await response.text();
        if (text && !text.includes('Access Denied') && !text.includes('Cloudflare')) return text;
      }
    } catch (e) {}
  }
  throw new Error("Failed");
}

document.body.onload = function(){
  get_marketplaces().forEach(async (market) => {
    try {
      const xml_text = await fetch_with_fallbacks(market.feed);
      if(market.format == 'scraper') {
        var scraper_doc = new DOMParser().parseFromString(xml_text, "text/html");
        if(market.name == 'ccs') {
          $(scraper_doc).find('.fund-required a').slice(0, 6).each(function() {
            add_listing({"title": $(this).find('h3').text(), "link": 'https://ccs.getmonero.org'+$(this).attr('href'), "market": market.name});
          });
        } else if(market.name == 'monerochan_news') {
          $(scraper_doc).find('a[href*="article"]').slice(0, 6).each(function() {
            add_listing({"title": $(this).find('h1').text(), "link": 'https://monerochan.news'+$(this).attr('href'), "market": market.name});
          });
        } else if(market.name == 'monerica') {
          $(scraper_doc).find('li a').slice(14, 20).each(function() {
            add_listing({"title": $(this).text(), "link": $(this).attr('href'), "market": market.name});
          });
        } else if(market.name == 'blockchain_stats') {
          var st = $(scraper_doc).text();
          $('#stats_version').text((/GUI (.*?) /.exec(st) || [])[1] || 'N/A');
          $('#stats_block_height').text((/as of (.*?) block/.exec(st) || [])[1] || 'N/A');
          $('#stats_hash_rate').text(((/Hash rate: (.*?) /.exec(st) || [])[1] || 'N/A') + ' GH/s');
          $('#stats_fee').text(((/Fee per byte: (.*?) /.exec(st) || [])[1] || 'N/A') + ' XMR');
        }
      } else if(market.format == 'api') {
        var json = JSON.parse(xml_text);
        if(market.name == 'monero_bounties') {
          json.slice(0, 6).forEach(i => add_listing({"title": i.title, "link": 'https://bounties.monero.social/posts/'+i.id, "market": market.name}));
        } else if(market.name == 'trocador_price') {
          // Robust array check for Trocador
          const data = Array.isArray(json) ? json : (json.contents ? JSON.parse(json.contents) : null);
          if (data) {
            const xmr = data.find(c => c.ticker === 'XMR');
            const btc = data.find(c => c.ticker === 'BTC');
            if(xmr) { 
              $('#header_monero_usd_price').text('$'+parseFloat(xmr.usd_price).toFixed(2));
              $('#box_monero_usd_price').text('$'+parseFloat(xmr.usd_price).toFixed(2));
            }
            if(xmr && btc) $('#box_monero_btc_price').text((xmr.usd_price/btc.usd_price).toFixed(6)+' BTC');
          }
        }
      } else {
        var x2js = new X2JS();
        var data = x2js.xml2json(DOMPARSER(xml_text, "text/xml"));
        var items = (market.format == 'atom') ? (data.feed?.entry) : (data.rss?.channel?.item);
        if(items) {
          (Array.isArray(items) ? items : [items]).slice(0, 6).forEach(i => {
            var t = i.title;
            if(market.name == 'events_calendar' && t.includes(' scheduled for ')) t = t.split(' scheduled for ')[0];
            if(market.name.includes('twitter') || market.name.includes('telegram')) t = t.replace(/<[^>]*>?/gm, '').split(/\s+/).slice(0, 10).join(' ') + '…';
            add_listing({"title": t, "link": i.link?._href || i.link, "market": market.name});
          });
        }
      }
    } catch(e) {}
  });
}
