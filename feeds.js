const DOMPARSER = new DOMParser().parseFromString.bind(new DOMParser());

function add_listing(item) {
  // Ensure title and link are strings before trying to replace
  item['title'] = (item['title'] || '').toString().replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
   return '&#'+i.charCodeAt(0)+';';
  });
  item['link'] = (item['link'] || '').toString().replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
   return '&#'+i.charCodeAt(0)+';';
  });
  var listing_entry = document.createElement('div');
  listing_entry.innerHTML += '<li class="listing-title"><a href="'+item['link']+'" title="'+item['title']+'">'+item['title']+'</a></li>';
  listing_entry.setAttribute('data-timestamp', item['timestamp']);
  listing_entry.className = 'single_listing';
  document.getElementById(item['market']).appendChild(listing_entry);
  document.getElementById(item['market']+'_box').classList.remove('loading-bg');
}

function get_marketplaces() {
  var marketplaces = [];
  marketplaces.push({'name': 'blockchain_stats', 'feed': 'https://xmrchain.net/', 'format': 'scraper'});
  marketplaces.push({'name': 'blockchain_monthly_txs', 'feed': 'https://localmonero.co/blocks/stats/transactions/m/12', 'format': 'scraper'});
  marketplaces.push({'name': 'price_in_usd', 'feed': 'https://agoradesk.com/api/v1/moneroaverage/USD', 'format': 'api'});
  marketplaces.push({'name': 'price_in_btc', 'feed': 'https://agoradesk.com/api/v1/moneroaverage/BTC', 'format': 'api'});
  marketplaces.push({'name': 'events_calendar', 'feed': 'https://monero.observer/feed-calendar.xml', 'format': 'rss'});
  marketplaces.push({'name': 'monero_observer_news', 'feed': 'https://monero.observer/feed-mini.xml', 'format': 'rss'});
  marketplaces.push({'name': 'revuo_monero', 'feed': 'https://revuo-xmr.com/atom.xml', 'format': 'atom'});
  marketplaces.push({'name': 'monero_talk', 'feed': 'https://feeds.fireside.fm/monerotalk/rss', 'format': 'rss'});
  marketplaces.push({'name': 'monero_research', 'feed': 'https://moneroresearch.info/index.php?action=rss_RSS_CORE&method=rss20', 'format': 'rss'});
  marketplaces.push({'name': 'monero_moon', 'feed': 'https://www.themoneromoon.com/feed', 'format': 'rss'});
  marketplaces.push({'name': 'monero_standard', 'feed': 'https://localmonero.co/static/rss/the-monero-standard/feed.xml', 'format': 'rss'});
  marketplaces.push({'name': 'monero_bounties', 'feed': 'https://bounties.monero.social/api/v1/posts?view=trending', 'format': 'api'});
  marketplaces.push({'name': 'ccs', 'feed': 'https://ccs.getmonero.org/funding-required/', 'format': 'scraper'});
  marketplaces.push({'name': 'monerochan_news', 'feed': 'https://monerochan.news', 'format': 'scraper'});
  marketplaces.push({'name': 'monerochan_forum', 'feed': 'https://forum.monerochan.news/latest/', 'format': 'scraper'});
  marketplaces.push({'name': 'bitejo', 'feed': 'https://bitejo.com/rss', 'format': 'rss'});
  marketplaces.push({'name': 'count_bitejo', 'feed': 'https://bitejo.com', 'format': 'scraper'});
  marketplaces.push({'name': 'monero_market_io', 'feed': 'https://moneromarket.io', 'format': 'scraper'});
  marketplaces.push({'name': 'count_monero_market_io', 'feed': 'https://moneromarket.io', 'format': 'scraper'});
  marketplaces.push({'name': 'accepted_here', 'feed': 'https://acceptedhere.io/catalog/company/?currency=xmr&', 'format': 'scraper'});
  marketplaces.push({'name': 'count_accepted_here', 'feed': 'https://acceptedhere.io/catalog/currency/xmr/', 'format': 'scraper'});
  marketplaces.push({'name': 'monerica', 'feed': 'https://monerica.com', 'format': 'scraper'});
  marketplaces.push({'name': 'count_monerica', 'feed': 'https://monerica.com', 'format': 'scraper'});
  marketplaces.push({'name': 'monero_observer_market', 'feed': 'https://monero.observer/feed-messages.xml', 'format': 'rss'});
  marketplaces.push({'name': 'telegram_monero_market', 'feed': 'https://tg.i-c-a.su/rss/moneromarket?limit=50', 'format': 'rss'});
  marketplaces.push({'name': 'reddit_monero_market', 'feed': 'https://www.reddit.com/r/moneromarket.rss', 'format': 'atom'});
  marketplaces.push({'name': 'twitter_monero', 'feed': 'https://nitter.net/monero/rss', 'format': 'rss'});
  marketplaces.push({'name': 'reddit_monero', 'feed': 'https://www.reddit.com/r/monero.rss', 'format': 'atom'});
  return marketplaces;
}

document.body.onload = function(){
  var marketplaces = get_marketplaces();
  marketplaces.forEach((market) => {
    var u = market['feed'];
    // --- USING A NEW, STABLE AND TESTED PROXY ---
    var proxy_url = "https://api.codetabs.com/v1/proxy?quest=" + u;
    
    fetch(proxy_url)
    .then((res) => {
      if (!res.ok) {
          throw new Error('Network response was not ok for ' + u);
      }
      return res.text();
    })
    .then((xml_text) => {
        var listings = [];
        try {
          if(market['format'] == 'scraper') {
            var parser = new DOMParser();
            var scraper_doc = parser.parseFromString(xml_text, "text/html");
            
            if(market['name'] == 'ccs') {
              var ccs_links = $(scraper_doc).find('.fund-required a');
              ccs_links.each(function() {
                var title = $(this).find('h3').text()+' - '+$(this).find('.progress-number-funded').text()+'/'+$(this).find('.progress-number-goal').text()+' XMR';
                var timestamp = (new Date().getTime()/1000);
                var link = 'https://ccs.getmonero.org'+$(this).attr('href');
                var listing_details = {"title": title, "timestamp": timestamp, "link": link, "market": market['name']};
                listings.push(listing_details);
              });
            } else if(market['name'] == 'monerochan_news') {
              var ccs_links = $(scraper_doc).find('a[href*="article"]');
              ccs_links.each(function() {
                var title = $(this).find('h1').text();
                var timestamp = (new Date().getTime()/1000);
                var link = 'https://monerochan.news'+$(this).attr('href');
                var listing_details = {"title": title, "timestamp": timestamp, "link": link, "market": market['name']};
                listings.push(listing_details);
              });
            } else if(market['name'] == 'monerochan_forum') {
              var ccs_links = $(scraper_doc).find('a.title.raw-topic-link');
              ccs_links.each(function() {
                var title = $(this).text();
                var timestamp = (new Date().getTime()/1000);
                var link = $(this).attr('href');
                var listing_details = {"title": title, "timestamp": timestamp, "link": link, "market": market['name']};
                listings.push(listing_details);
              });
            } else if(market['name'] == 'monero_market_io') {
              var ccs_links = $(scraper_doc).find('a[href*="listing"]');
              ccs_links.each(function() {
                var title = $(this).find('.desc').text();
                var timestamp = (new Date().getTime()/1000);
                var link = 'https://moneromarket.io'+$(this).attr('href');
                var listing_details = {"title": title, "timestamp": timestamp, "link": link, "market": market['name']};
                if(title) {
                  listings.push(listing_details);
                }
              });
            } else if(market['name'] == 'accepted_here') {
              var ccs_links = $(scraper_doc).find('.col-lg-7 a[href*="company"]');
              ccs_links.each(function() {
                var title = $(this).find('h5').text();
                var timestamp = (new Date().getTime()/1000);
                var link = $(this).attr('href');
                var listing_details = {"title": title, "timestamp": timestamp, "link": link, "market": market['name']};
                if(title) {
                  listings.push(listing_details);
                }
              });
            } else if(market['name'] == 'monerica') {
              var ccs_links = $(scraper_doc).find('li a');
              var ccs_links = ccs_links.slice(14, 24);
              ccs_links.each(function() {
                var title = $(this).text();
                var timestamp = (new Date().getTime()/1000);
                var link = $(this).attr('href');
                var listing_details = {"title": title, "timestamp": timestamp, "link": link, "market": market['name']};
                listings.push(listing_details);
              });
            } else if(market['name'] == 'count_monero_market_io') {
              var market_stats = $(scraper_doc).find('#categories a span');
              var market_total = 0;
              market_stats.each(function() {
                  var num = parseInt($(this).text().replace(/\D/g,''));
                  if (!isNaN(num)) market_total += num;
              });
              if(market_total > 0) $('#monero_market_count').text(market_total);
            } else if(market['name'] == 'count_monerica') {
              var market_total = $(scraper_doc).find('li a').length;
              if(market_total > 0) $('#monerica_count').text(market_total);
            } else if(market['name'] == 'count_accepted_here') {
              var market_total = $(scraper_doc).find('.currency-stats span:nth-child(2)').text().replace(/\D/g,'');
              if(market_total) $('#accepted_here_count').text(market_total);
            } else if(market['name'] == 'count_bitejo') {
              var market_total = $(scraper_doc).find('a[href*="search/currency/monero"]').find('span').text().replace(/\D/g,'');
              if(market_total) $('#bitejo_count').text(market_total);
            } else if(market['name'] == 'blockchain_monthly_txs') {
              var market_total = $(scraper_doc).find('.data-table tr:nth-child(1) td:nth-child(2)').text().replace(/\D/g,'');
              if(market_total) $('#stats_monthly_txs').text(market_total);
            } else if(market['name'] == 'blockchain_stats') {
              var search_text = $(scraper_doc).text().split('age [h:m:s]')[0].replace(/[\n\r]/g, ' ');
              var version_match = /GUI (.*?) /.exec(search_text);
              if(version_match) $('#stats_version').text(version_match[1]);
              var height_match = /as of (.*?) block/.exec(search_text);
              if(height_match) $('#stats_block_height').text(height_match[1]);
              var hash_match = /Hash rate: (.*?) /.exec(search_text);
              if(hash_match) $('#stats_hash_rate').text(hash_match[1]+' GH/s');
              var fee_match = /Fee per byte: (.*?) /.exec(search_text);
              if(fee_match) $('#stats_fee').text(fee_match[1]+' XMR');
              var emission_match = /Monero emission (.*?) is (.*?) /.exec(search_text);
              if(emission_match) $('#stats_emission').text(emission_match[2]+' XMR');
            }
            
            listings = listings.slice(0, 10);
            listings.forEach((item) => add_listing(item));
            
          } else if(market['format'] == 'api') {
            var json_text = JSON.parse(xml_text);
            if(market['name'] == 'monero_bounties') {
              json_text.forEach((item) => {
                listings.push({ "title": item.title, "timestamp": (new Date().getTime()/1000), "link": 'https://bounties.monero.social/posts/'+item.id+'/'+item.slug, "market": market['name'] });
              });
              listings = listings.slice(0, 10);
              listings.forEach((item) => add_listing(item));
            } else if(market['name'] == 'price_in_usd') {
              if(json_text?.data?.USD) {
                var price_in_usd = json_text.data.USD.avg_24h;
                $('#header_monero_usd_price').text('$'+price_in_usd);
                $('#box_monero_usd_price').text('$'+price_in_usd);
              }
            } else if(market['name'] == 'price_in_btc') {
              if(json_text?.data?.BTC) {
                var price_in_btc = json_text.data.BTC.avg_24h;
                $('#box_monero_btc_price').text(price_in_btc+' BTC');
              }
            }
          } else { // RSS/Atom feeds
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
              if (market['format'] == 'atom') {
                items.forEach((item) => {
                  if(!item.title) return;
                  var link = item.link?._href || item.link || '';
                  if(link) {
                    listings.push({ "title": item.title, "timestamp": (new Date(item.published).getTime()/1000), "link": link, "market": market['name'] });
                  }
                });
              } else if (market['format'] == 'rss') {
                items.forEach((item) => {
                  if (!item.title) return;
                  
                  var rss_push_listing = true;
                  var title = item.title;
                  
                  if (market['name'] == 'monero_observer_market') {
                    if (!title.match(/WTB|WTS|LTH|AFH/i)) return;
                  }
                  
                  if (market['name'] == 'events_calendar') {
                    if (!title.includes(' scheduled for ')) return;
                    var title_parts = title.split(' scheduled for ');
                    var title_date_parts = title_parts[1].split(' ');
                    var title_date = new Date(`${title_date_parts[1]} ${title_date_parts[0]}, ${title_date_parts[2]}`);
                    if (title_date.toString() === 'Invalid Date' || (title_date.getTime() + 86400000) < new Date().getTime()) return;
                    title = `${title_date.toLocaleString('default', { month: 'short' })} ${title_date.getDate()}: ${title_parts[0]}`;
                  }
                  
                  if (market['name'] == 'telegram_monero_market') {
                    var hashtags_search = ['#selling', '#buying', '#trade', '#service'];
                    var description_lowercase = (item.title + ' ' + (item.description || '')).toLowerCase();
                    if (!hashtags_search.some(valid_hashtag => description_lowercase.includes(valid_hashtag))) {
                      rss_push_listing = false;
                    }
                    var clean_description = (item.description || '').replace(/<[^>]*>?/gm, '').replace(/\#\w\w+\s?/gi, '');
                    title = clean_description.split(/\s+/).slice(0, 10).join(' ') + '…';
                  }
                  
                  if (market['name'] == 'monero_research' && listings.some(l => l.link == item.link)) {
                    rss_push_listing = false;
                  }
                  
                  if (rss_push_listing) {
                    var link = item.link || '';
                    if(link) {
                      listings.push({ "title": title, "timestamp": (new Date(item.pubDate).getTime()/1000), "link": link, "market": market['name'] });
                    }
                  }
                });
              }
            }
            
            listings = listings.slice(0, 10);
            listings.forEach((item) => add_listing(item));
          }
        } catch(error) {
          console.error('Error processing', market['name'], ':', error);
          var element = document.getElementById(market['name']+'_box');
          if(element) element.classList.remove('loading-bg');
        }
    })
    .catch(error => {
      console.error('Fetch failed for', market['name'], ':', error);
      var element = document.getElementById(market['name']+'_box');
      if(element) element.classList.remove('loading-bg');
    });
  });
}
