const Config = require('./config/apiconfig');
const Constants = require('./config/appconstants');
const currency = require('currency-formatter');
var fs = require('fs');

// Telegram
const TelegramBot = require('node-telegram-bot-api');
const teleBot = new TelegramBot(Config.TELEGRAM_BOT_API_TOKEN, {polling: true});

// Caching
var cacheObj = {
  request_time_ms: 0,
  expire_time_ms: 0,
  data: null
};

// Local variables
const isLoggingEnabled = true;
const usFormat = {precision: 0, thousand: ',', decimal: '.', format: '%v'};

_log("NEMbot has started.");

teleBot.on("text", function(message) {
  // Note: message.date is UNIX time in SECONDS (JavaScript/ECMA Script Date.now() works with milliseconds)
  // Ignore request older than CHAT_TIMEOUT_SECONDS into the past
  const nowInSeconds = Math.floor(Date.now() / 1000);
  if ((nowInSeconds - message.date) > Constants.CHAT_REQUEST_TIMEOUT_S) {
    _log("Ignored. Chat message timestamp is older than " + Constants.CHAT_REQUEST_TIMEOUT_S + " seconds ago ");
    // no-op
    return;
  }

  const chatId = message.chat.id;
  if (message.text.toLowerCase().indexOf("/price") === 0) {
    requestData(sendPriceData, chatId);
  }

  if (message.text.toLowerCase().indexOf("/stats") === 0) {
    requestData(sendStatsData, chatId);
  }

  if (message.text.toLowerCase().indexOf("/marketcap") === 0) {
    requestData(sendMarketCapData, chatId);
  }
});

function requestData(callback, chatId) {
  if (isCacheEmptyOrExpired()) {
    readCacheFile(callback, chatId);
  } else {
    callback(chatId);
  }
}

function sendPriceData(chatId, attempt) {
  if (attempt === undefined) {
    attempt = 1;
  }

  if (isCacheEmptyOrExpired()) {
    if (attempt >= 3) {
      _log("Warning: Unexpected result. Could not retrieve price data from server.");
      return;
    }
    attempt++;
    setTimeout(sendPriceData, Constants.CHAT_REQUEST_RETRY_MS, chatId, attempt);
  } else {
    sendPriceDataToChat(chatId);
  }
}

function sendStatsData(chatId, attempt) {
  if (attempt === undefined) {
    attempt = 1;
  }

  if (isCacheEmptyOrExpired()) {
    if (attempt >= 3) {
      _log("Warning: Unexpected result. Could not retrieve price data from server.");
      return;
    }
    attempt++;
    setTimeout(sendStatsData, Constants.CHAT_REQUEST_RETRY_MS, chatId, attempt);
  } else {
    sendStatsDataToChat(chatId);
  }
}

function sendMarketCapData(chatId, attempt) {
  if (attempt === undefined) {
    attempt = 1;
  }

  if (isCacheEmptyOrExpired()) {
    if (attempt >= 3) {
      _log("Warning: Unexpected result. Could not retrieve price data from server.");
      return;
    }
    attempt++;
    setTimeout(sendMarketCapData, Constants.CHAT_REQUEST_RETRY_MS, chatId, attempt);
  } else {
    sendMarketCapDataToChat(chatId);
  }
}

function sendPriceDataToChat(chatId) {
  const msg = "1 XEM" +
    " = " + getPrice(Constants.ISO_CODE_BTC) + " sat" +
    " = " + Constants.ISO_SYMBOL_USD + getPrice(Constants.ISO_CODE_USD) +
    " = " + Constants.ISO_SYMBOL_EUR + getPrice(Constants.ISO_CODE_EUR);

  sendMessage(chatId, msg);
}

function sendStatsDataToChat(chatId) {
  const h1 = parseFloat(cacheObj.data.percent_change_1h);
  const h24 = parseFloat(cacheObj.data.percent_change_24h);
  const d7 = parseFloat(cacheObj.data.percent_change_7d);
  const volEur = parseFloat(cacheObj.data["24h_volume_eur"]);
  const volUsd = parseFloat(cacheObj.data["24h_volume_usd"]);

  const msg = "Price movements: " +
    "\n1h" + getSignIcon(h1) + "" + h1 + "% | 24h" + getSignIcon(h24) + "" + h24 + "% | " + "7d" + getSignIcon(d7) + "" + d7 + "%" +
    "\nVolume (24h): " +
    "\n" + getSignIcon(volUsd) + Constants.ISO_SYMBOL_USD + currency.format(volUsd, usFormat) +
    " | " + getSignIcon(volEur) + Constants.ISO_SYMBOL_EUR + currency.format(volEur, usFormat);

  sendMessage(chatId, msg);
}

function sendMarketCapDataToChat(chatId) {
  const capUsd = parseFloat(cacheObj.data.market_cap_usd);
  const capEur = parseFloat(cacheObj.data.market_cap_eur);

  const msg = "Market Cap: " +
    "\n" + Constants.ISO_SYMBOL_USD + currency.format(capUsd, usFormat) +
    " | " + Constants.ISO_SYMBOL_EUR + currency.format(capEur, usFormat);

  sendMessage(chatId, msg);
}

function getSignIcon(floatNumber) {
  if (floatNumber === 0.000) {
    return "";
  }

  return floatNumber < 0 ? "▼" : "▲";
}

function isCacheEmptyOrExpired() {
  if (isNullOrUndefined(cacheObj) || isNullOrUndefined(cacheObj.data)) {
    _log("Data cache is null or undefined.");
    return true;
  }

  if (isNullOrUndefined(cacheObj.expire_time_ms)) {
    _log("Data cache expiration time is null or undefined.");
    return true;
  }

  var diff = Date.now() - cacheObj.expire_time_ms;
  if (diff > 0) {
    _log("Data cache has expired. Expiration time was: " + cacheObj.expire_time_ms);
    return true;
  }

  return false;
}

function readCacheFile(callback, param1) {
  fs.readFile(Constants.CACHE_FILE_PATH, Constants.UTF8, function(error, data) {
    if (error) {
      catchFileIOErrors(error);
    } else {
      cacheObj = JSON.parse(data);
      callback(param1);
    }
  });
}

function getPrice(curr) {
  var priceTag = "NaN";
  switch (curr) {
    case Constants.ISO_CODE_BTC:
      var inSatoshi = parseFloat(cacheObj.data.price_btc) * 100000000;
      priceTag = inSatoshi.toFixed(0);
      break;
    case Constants.ISO_CODE_EUR:
      var inEur = parseFloat(cacheObj.data.price_eur);
      priceTag = inEur.toFixed(3);
      break;
    case Constants.ISO_CODE_USD:
      var inUsd = parseFloat(cacheObj.data.price_usd);
      priceTag = inUsd.toFixed(3);
      break;
    default:
      priceTag = "Unsupported currency";
  }

  return priceTag;
}

function sendMessage(chatId, message) {
  teleBot.sendMessage(chatId, message);
}

function _log(msg) {
  if (isLoggingEnabled) {
    console.log(new Date().toISOString() + " | NEMbot: " + msg);
  }
}

function isNullOrUndefined(obj) {
  return obj === undefined || obj === null;
}

function catchFileIOErrors(error) {
  _log('Error while reading or writing a file. IO Error: ' + error);
}
