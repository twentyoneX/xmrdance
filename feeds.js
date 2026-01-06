const DOMPARSER = new DOMParser().parseFromString.bind(new DOMParser());

function add_listing(item) {
  var target_element = document.getElementById(item['market']);
  // This is the fix: Only proceed if the HTML element actually exists
  if (target_element) {
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
    target_element.appendChild(listing_entry);
    
    var target_box = document.getElementById(item['market']+'_box');
    if (target_box) {
        target_box.classList.remove('loading-bg');
    }
  }
}

function get_marketplaces() {
  var marketplaces = [];
  marketplaces.push({'name': 'blockchain_stats', 'feed': 'https://xmrchain.net/', 'format': 'scraper'});
  marketplaces.push({'name': 'blockchain_monthly_txs', 'feed': 'https://localmonero.co/blocks/stats/transactions/m/12', 'format': 'scraper'});
  marketplaces.push({'name': 'price_in_usd', 'feed': 'https://agoradesk.com/api/v1/moneroaverage/USD', 'format': 'api'});
  marketplaces.push({'name': 'price_in_btc', 'feed': 'https://agoradesk.com/api/v1/moneroaverage/BTC', 'format': 'api'});
  marketplaces.push({'name': 'events_calendar', 'feed': 'https://monero.observer/feed-calendar.xml', 'format': 'rss'});
  marketplaces.push({'name': 'monero_observer_news', 'feed': 'https://monero.observer/feed-mini.xml', 'format': 'rss'});
  marketplaces.push({'name': 'revuo_monero', 'feed': 'https://www.revuo-xmr.com/atom.xml', 'format': 'rss'});
  marketplaces.push({'name': 'monero_talk', 'feed': 'https://feeds.fireside.fm/monerotalk/rss', 'format': 'rss'});
  marketplaces.push({'name': 'monero_research', 'feed': 'https://moneroresearch.info/index.php?action=rss_RSS_CORE&method=rss20', 'format': 'rss'});
  marketplaces.push({'name': 'monero_moon', 'feed': 'https://www.themoneromoon.com/feed', 'format': 'rss'});
  marketplaces.push({'name': 'monero_standard', 'feed': 'https://localmonero.co/static/rss/the-monero-standard/feed.xml', 'format': 'rss'});
  marketplaces.push({'name': 'monero_bounties', 'feed': 'https://bounties.monero.social/api/v1/posts?view=trending', 'format': 'api'});
  marketplaces.push({'name': 'ccs', 'feed': 'https://ccs.getmonero.org/funding-required/', 'format': 'scraper'});
  marketplaces.push({'name': 'monerochan_news', 'feed': 'https://monerochan.news', 'format': 'scraper'});
  marketplaces.push({'name': 'monerochan_forum', 'feed': 'https://monero.town/feeds/local.xml?sort=Active', 'format': 'atom'});
  marketplaces.push({'name': 'monerica', 'feed': 'https://monerica.com', 'format': 'scraper'});
  marketplaces.push({'name': 'count_monerica', 'feed': 'https://monerica.com', 'format': 'scraper'});
  marketplaces.push({'name': 'bitejo', 'feed': 'https://xmrbazaar.com/rss', 'format': 'rss'});
  marketplaces.push({'name': 'reddit_monero_market', 'feed': 'https://www.reddit.com/r/moneromarket.rss', 'format': 'atom'});
  marketplaces.push({'name': 'twitter_monero', 'feed': 'https://nitter.privacydev.net/monero/rss', 'format': 'rss'});
  marketplaces.push({'name': 'telegram_monero_market', 'feed': 'https://rss.app/feed/f5u7lCILQ5NZ3iGl', 'format': 'rss'}); // UPDATED to rss.app feed
  marketplaces.push({'name': 'reddit_monero', 'feed': 'https://www.reddit.com/r/monero.rss', 'format': 'atom'});
  return marketplaces;
}

document.body.onload = function(){
  var marketplaces = get_marketplaces();
  marketplaces.forEach((market) => {
    var u = market['feed'];
    var proxy_url = "https://corsproxy.io/?" + u;
    
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
          if (xml_text.trim() === '') {
              throw new Error("Proxy returned empty response");
          }
            
          if(market['format'] == 'scraper') {
            var parser = new DOMParser();
            var scraper_doc = parser.parseFromString(xml_text, "text/html");
            
            if(market['name'] == 'ccs') {
              var ccs_links = $(scraper_doc).find('.fund-required a');
              ccs_links.each(function() {
                var title = $(this).find('h3').text()+' - '+$(this).find('.progress-number-funded').text()+'/'+$(this).find('.progress-number-goal').text()+' XMR';
                listings.push({ "title": title, "timestamp": (new Date().getTime()/1000), "link": 'https://ccs.getmonero.org'+$(this).attr('href'), "market": market['name'] });
              });
            } else if(market['name'] == 'monerochan_news') {
              var ccs_links = $(scraper_doc).find('a[href*="article"]');
              ccs_links.each(function() {
                var title = $(this).find('h1').text();
                listings.push({ "title": title, "timestamp": (new Date().getTime()/1000), "link": 'https://monerochan.news'+$(this).attr('href'), "market": market['name'] });
              });
            } else if(market['name'] == 'monerica') {
              var ccs_links = $(scraper_doc).find('li a').slice(14, 20);
              ccs_links.each(function() {
                var title = $(this).text();
                listings.push({ "title": title, "timestamp": (new Date().getTime()/1000), "link": $(this).attr('href'), "market": market['name'] });
              });
            } else if(market['name'] == 'count_monerica') {
              var market_total = $(scraper_doc).find('li a').length;
              if(market_total > 0) $('#monerica_count').text(market_total);
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
            
            listings = listings.slice(0, 6);
            listings.forEach((item) => add_listing(item));
            
          } else if(market['format'] == 'api') {
            var json_text = JSON.parse(xml_text);
            if(market['name'] == 'monero_bounties') {
              json_text.forEach((item) => {
                listings.push({ "title": item.title, "timestamp": (new Date().getTime()/1000), "link": 'https://bounties.monero.social/posts/'+item.id+'/'+item.slug, "market": market['name'] });
              });
              listings = listings.slice(0, 6);
              listings.forEach((item) => add_listing(item));
            } else if(market['name'] == 'price_in_usd') {
              if(json_text?.data?.USD) {
                $('#header_monero_usd_price').text('$'+json_text.data.USD.avg_24h);
                $('#box_monero_usd_price').text('$'+json_text.data.USD.avg_24h);
              }
            } else if(market['name'] == 'price_in_btc') {
              if(json_text?.data?.BTC) {
                $('#box_monero_btc_price').text(json_text.data.BTC.avg_24h+' BTC');
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
                  if(link) listings.push({ "title": item.title, "timestamp": (new Date(item.published || item.updated).getTime()/1000), "link": link, "market": market['name'] });
                });
              } else if (market['format'] == 'rss') {
                items.forEach((item) => {
                  if (!item.title) return;
                  
                  var rss_push_listing = true;
                  var title = item.title;
                  
                  if (market['name'] == 'events_calendar') {
                    if (title.includes(' scheduled for ')) {
                        var title_parts = title.split(' scheduled for ');
                        var title_text = title_parts[0];
                        var title_date_parts = title_parts[1].split(' ');
                        if (title_date_parts.length >= 3) {
                            var title_date = new Date(`${title_date_parts[1]} ${title_date_parts[0]}, ${title_date_parts[2]}`);
                            if (title_date.toString() !== 'Invalid Date') {
                                title = `${title_date.toLocaleString('default', { month: 'short' })} ${title_date.getDate()}: ${title_text}`;
                            } else {
                                title = title_text;
                            }
                        } else {
                            title = title_text;
                        }
                    }
                  }
                  
                  if (market['name'] == 'twitter_monero') {
                    title = item.title.replace(/<[^>]*>?/gm, '').split(/\s+/).slice(0, 10).join(' ') + '…';
                  }
                  
                  if (market['name'] == 'monero_research' && listings.some(l => l.link == item.link)) {
                    rss_push_listing = false;
                  }
                  
                  if (rss_push_listing) {
                    var link = item.link || '';
                    if(link) listings.push({ "title": title, "timestamp": (new Date(item.pubDate).getTime()/1000), "link": link, "market": market['name'] });
                  }
                });
              }
            }
            
            listings = listings.slice(0, 6);
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
