const DOMPARSER = new DOMParser().parseFromString.bind(new DOMParser());

function add_listing(item) {
  var target_element = document.getElementById(item['market']);
  if (target_element) {
    item['title'] = (item['title'] || '').toString().replace(/[\u00A0-\u9999<>\&]/gim, function(i) { return '&#'+i.charCodeAt(0)+';'; });
    item['link'] = (item['link'] || '').toString().replace(/[\u00A0-\u9999<>\&]/gim, function(i) { return '&#'+i.charCodeAt(0)+';'; });
    var listing_entry = document.createElement('div');
    listing_entry.innerHTML += '<li class="listing-title"><a href="'+item['link']+'" title="'+item['title']+'">'+item['title']+'</a></li>';
    listing_entry.setAttribute('data-timestamp', item['timestamp'] || Date.now());
    listing_entry.className = 'single_listing';
    target_element.appendChild(listing_entry);
    var target_box = document.getElementById(item['market']+'_box');
    if (target_box) {
        target_box.classList.remove('loading-bg');
    }
  }
}

function get_marketplaces() {
  var marketplaces = [];
  marketplaces.push({'name': 'trocador_price', 'feed': 'https://trocador.app/api/v1/coins', 'format': 'api'});
  marketplaces.push({'name': 'blockchain_stats', 'feed': 'https://xmrchain.net/', 'format': 'scraper'});
  marketplaces.push({'name': 'events_calendar', 'feed': 'https://monero.observer/feed-calendar.xml', 'format': 'rss'});
  marketplaces.push({'name': 'monero_observer_news', 'feed': 'https://monero.observer/feed-mini.xml', 'format': 'rss'});
  marketplaces.push({'name': 'revuo_monero', 'feed': 'https://www.revuo-xmr.com/atom.xml', 'format': 'rss'});
  marketplaces.push({'name': 'monero_talk', 'feed': 'https://feeds.fireside.fm/monerotalk/rss', 'format': 'rss'});
  marketplaces.push({'name': 'monero_research', 'feed': 'https://moneroresearch.info/index.php?action=rss_RSS_CORE&method=rss20', 'format': 'rss'});
  marketplaces.push({'name': 'monero_moon', 'feed': 'https://www.themoneromoon.com/feed', 'format': 'rss'});
  marketplaces.push({'name': 'monero_standard', 'feed': 'https://monero.observer/tag/the-monero-standard/feed.xml', 'format': 'rss'});
  marketplaces.push({'name': 'monero_bounties', 'feed': 'https://bounties.monero.social/api/v1/posts?view=trending', 'format': 'api'});
  marketplaces.push({'name': 'ccs', 'feed': 'https://ccs.getmonero.org/funding-required/', 'format': 'scraper'});
  marketplaces.push({'name': 'monerochan_news', 'feed': 'https://monerochan.news', 'format': 'scraper'});
  marketplaces.push({'name': 'monerochan_forum', 'feed': 'https://monero.town/feeds/local.xml?sort=Active', 'format': 'atom'});
  marketplaces.push({'name': 'monerica', 'feed': 'https://monerica.com', 'format': 'scraper'});
  marketplaces.push({'name': 'count_monerica', 'feed': 'https://monerica.com', 'format': 'scraper'});
  marketplaces.push({'name': 'bitejo', 'feed': 'https://xmrbazaar.com/rss', 'format': 'rss'});
  marketplaces.push({'name': 'reddit_monero_market', 'feed': 'https://www.reddit.com/r/moneromarket.rss', 'format': 'atom'});
  marketplaces.push({'name': 'twitter_monero', 'feed': 'https://nitter.tiekoetter.com/monero/rss', 'format': 'rss'});
  marketplaces.push({'name': 'telegram_monero_market', 'feed': 'https://nitter.tiekoetter.com/monero_market/rss', 'format': 'rss'});
  marketplaces.push({'name': 'reddit_monero', 'feed': 'https://www.reddit.com/r/monero.rss', 'format': 'atom'});
  return marketplaces;
}

async function fetch_with_fallbacks(url) {
  const proxies = [
    "https://corsproxy.io/?",
    "https://api.allorigins.win/raw?url=",
    "https://api.codetabs.com/v1/proxy?quest="
  ];

  for (const proxy of proxies) {
    const fetch_url = proxy.includes('corsproxy.io') ? proxy + url : proxy + encodeURIComponent(url);
    try {
      const response = await fetch(fetch_url, { signal: AbortSignal.timeout(8000) });
      if (response.ok) {
        const text = await response.text();
        // Basic check if we got HTML when we expected XML/RSS
        if (text && text.trim() !== '' && !text.includes('Access Denied') && !text.includes('Cloudflare')) {
            console.log(`Success with proxy: ${proxy} for ${url}`);
            return text;
        }
      }
    } catch (e) {}
  }
  throw new Error(`All proxies failed for: ${url}`);
}

document.body.onload = function(){
  var marketplaces = get_marketplaces();
  marketplaces.forEach(async (market) => {
    var u = market['feed'];
    try {
      const xml_text = await fetch_with_fallbacks(u);
      var listings = [];
      
      if(market['format'] == 'scraper') {
        var parser = new DOMParser();
        var scraper_doc = parser.parseFromString(xml_text, "text/html");
        
        if(market['name'] == 'ccs') {
          $(scraper_doc).find('.fund-required a').slice(0, 6).each(function() {
            var title = $(this).find('h3').text()+' - '+$(this).find('.progress-number-funded').text()+'/'+$(this).find('.progress-number-goal').text()+' XMR';
            listings.push({ "title": title, "link": 'https://ccs.getmonero.org'+$(this).attr('href'), "market": market['name'] });
          });
        } else if(market['name'] == 'monerochan_news') {
          $(scraper_doc).find('a[href*="article"]').slice(0, 6).each(function() {
            listings.push({ "title": $(this).find('h1').text(), "link": 'https://monerochan.news'+$(this).attr('href'), "market": market['name'] });
          });
        } else if(market['name'] == 'monerica') {
          $(scraper_doc).find('li a').slice(14, 20).each(function() {
            listings.push({ "title": $(this).text(), "link": $(this).attr('href'), "market": market['name'] });
          });
        } else if(market['name'] == 'count_monerica') {
          $('#monerica_count').text($(scraper_doc).find('li a').length || 'N/A');
        } else if(market['name'] == 'blockchain_stats') {
          var search_text = $(scraper_doc).text().split('age [h:m:s]')[0].replace(/[\n\r]/g, ' ');
          $('#stats_version').text((/GUI (.*?) /.exec(search_text) || [])[1] || 'N/A');
          $('#stats_block_height').text((/as of (.*?) block/.exec(search_text) || [])[1] || 'N/A');
          $('#stats_hash_rate').text(((/Hash rate: (.*?) /.exec(search_text) || [])[1] || 'N/A') + ' GH/s');
          $('#stats_fee').text(((/Fee per byte: (.*?) /.exec(search_text) || [])[1] || 'N/A') + ' XMR');
          $('#stats_emission').text(((/Monero emission (.*?) is (.*?) /.exec(search_text) || [])[2] || 'N/A') + ' XMR');
        }
        listings.forEach((item) => add_listing(item));
        
      } else if(market['format'] == 'api') {
        var json_text = JSON.parse(xml_text);
        if(market['name'] == 'monero_bounties') {
          json_text.slice(0, 6).forEach((item) => {
            listings.push({ "title": item.title, "link": 'https://bounties.monero.social/posts/'+item.id+'/'+item.slug, "market": market['name'] });
          });
          listings.forEach((item) => add_listing(item));
        } else if(market['name'] == 'trocador_price') {
          if (Array.isArray(json_text)) {
            const monero_data = json_text.find(coin => coin.ticker === 'XMR');
            const bitcoin_data = json_text.find(coin => coin.ticker === 'BTC');
            if (monero_data) {
              const usd_price = parseFloat(monero_data.usd_price).toFixed(2);
              $('#header_monero_usd_price').text('$'+usd_price);
              $('#box_monero_usd_price').text('$'+usd_price);
            }
            if (monero_data && bitcoin_data) {
              const btc_price = (parseFloat(monero_data.usd_price) / parseFloat(bitcoin_data.usd_price)).toFixed(8);
              $('#box_monero_btc_price').text(btc_price+' BTC');
            }
          }
        }
      } else { // RSS/Atom
        var doc = DOMPARSER(xml_text, "text/xml");
        var x2js = new X2JS();
        var json_text = x2js.xml2json(doc);
        var items = [];
        if (market['format'] == 'atom' && json_text.feed?.entry) {
          items = Array.isArray(json_text.feed.entry) ? json_text.feed.entry : [json_text.feed.entry];
        } else if (market['format'] == 'rss' && json_text.rss?.channel?.item) {
          items = Array.isArray(json_text.rss.channel.item) ? json_text.rss.channel.item : [json_text.rss.channel.item];
        }
        
        if (items.length > 0) {
          items.slice(0, 6).forEach((item) => {
            if(!item.title) return;
            var title = item.title;
            var link = item.link?._href || item.link || '';
            if (market['name'] == 'events_calendar' && title.includes(' scheduled for ')) {
               var parts = title.split(' scheduled for ');
               var dp = parts[1].split(' ');
               if (dp.length >= 3) {
                 var d = new Date(`${dp[1]} ${dp[0]}, ${dp[2]}`);
                 if (d.toString() !== 'Invalid Date') title = `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}: ${parts[0]}`;
               }
            }
            if (market['name'].includes('twitter') || market['name'].includes('telegram')) {
                title = title.replace(/<[^>]*>?/gm, '').split(/\s+/).slice(0, 10).join(' ') + '…';
            }
            if(link) listings.push({ "title": title, "link": link, "market": market['name'] });
          });
        }
        listings.forEach((item) => add_listing(item));
      }
    } catch(error) {
      console.error('Final Failure for', market['name']);
      // HIDE THE BOX IF IT FAILED COMPLETELY
      var element = document.getElementById(market['name']+'_box');
      if(element) element.style.display = 'none';
    }
  });
}
