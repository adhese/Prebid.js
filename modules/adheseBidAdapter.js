var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var utils = require('src/utils.js');
var adaptermanager = require('src/adaptermanager');

const PRICE_UNDEFINED = 0;

var AdheseAdapter = function AdheseAdapter() {
  
  function addEmptyBidResponse(uid) {
    var bidObject = bidfactory.createBid(2, utils.getBidRequest(uid));
    bidObject.bidderCode = 'adhese';
    bidObject.cpm = 0;
    bidObject.ad = "";
    bidObject.width = 0;
    bidObject.height = 0;
    bidObject.impressionCounter = "";
    bidmanager.addBidResponse(uid, bidObject);
  }

  function addBidResponse(bid, usdCpm) {
    var bidObject = bidfactory.createBid(1, utils.getBidRequest(bid.adType));
    bidObject.bidderCode = 'adhese';
    bidObject.cpm = usdCpm;
    bidObject.ad = bid.tag;
    bidObject.width = bid.width;
    bidObject.height = bid.height;
    bidObject.impressionCounter = bid.impressionCounter;
    bidmanager.addBidResponse(bid.adType, bidObject);
  }

  /**
   * This function will create requests based on the prebid params. It executes them and calls a callback function when doen to norify prebid
   * @param  {object} params An onject containing the different param attributes
   */
  function executeRequests(params) {
    var adArray = [];
    var adhese = new Adhese();
    for (var x=0; x<params.bids.length; x++) {
      if (x==0) {
        adhese.init({account:params.bids[x].params.account, location: params.bids[x].params.location});
        if (params.bids[x].params.data) {
          for (y=0; y<params.bids[x].params.data.length; y++) {
            adhese.registerRequestParameter(params.bids[x].params.data[y].key, params.bids[x].params.data[y].value);
          }
        }      
      }
      for (var y=0; y<params.bids[x].params.formats.length; y++) {
        var options = params.bids[x].params;
        options.format = options.formats[0];
        var tag = adhese.tag(options);
        adArray.push(tag);
      }
    }
    AdheseAjax.request({
      url: adhese.getMultipleRequestUri(adArray, {'type':'json'}),
      method: 'get',
      json: true
    }).done(function(result) {
        let ads = result.reduce(function(map, ad) {
          map[ad.adType] = ad;
          return map;
        }, {});        

        for (var j = 0; j<adArray.length; j++) {
          let ad = ads[adArray[j].uid];
          if (!ad) {
              addEmptyBidResponse(adArray[j].uid);
          } else {
              var price = PRICE_UNDEFINED; 
              if (ad.extension && ad.extension.prebid && ad.extension.prebid.cpm) {
                  let cpm = ad.extension.prebid.cpm;
                  if (cpm.currency == 'USD') {
                      price = Number(cpm.amount);
                  }
              }
              addBidResponse(ad, price);
          }
        }
    });
  };

  function _callBids(params) {
    executeRequests(params);
  }

  return {
      callBids: _callBids
  };

};

adaptermanager.registerBidAdapter(new AdheseAdapter(), "adhese");

module.exports = AdheseAdapter;
