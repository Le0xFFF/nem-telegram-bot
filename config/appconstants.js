module.exports = Object.freeze({
  // General application-wide constants
  CONTENT_TYPE_APP_URLENCODED: 'application/x-www-form-urlencoded',
  UTF8: 'UTF-8',

  // Database and caching
  DATABASE_UPDATE_INTERVAL_MS: 60 * 60 * 1000, // 1 hour
  CACHE_TIMEOUT_MS: 2 * 60 * 1000,
  CACHE_UPDATE_INTERVAL_MS: 2 * 60 * 1000, // 2 minutes
  CACHE_FILE_PATH: './data/cache.json',

  // Chat related
  CHAT_REQUEST_TIMEOUT_S: 3,
  CHAT_REQUEST_RETRY_MS: 1000,
  // Note: CoinMarketCap API endpoint is updated every 5 minutes (using UNIX time in seconds)

  // Currencies
  ISO_CODE_BTC: 'BTC',
  ISO_CODE_EUR: 'EUR',
  ISO_CODE_NEM: 'NEM',
  ISO_CODE_USD: 'USD',
  ISO_SYMBOL_EUR: '€',
  ISO_SYMBOL_NEM: 'XEM',
  ISO_SYMBOL_USD: '$'
});
