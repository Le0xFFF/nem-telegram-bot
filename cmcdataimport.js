const Config = require('./config/apiconfig');
const Constants = require('./config/appconstants');
var fs = require('fs');

// Database
const PouchDB = require('pouchdb-node');
var database = new PouchDB('./database/db_cmc');

// Caching
var cacheObj = {
  request_time_ms: 0,
  expire_time_ms: 0,
  data: null
};

// HTTP client
const axios = require('axios');
const queryString = require('querystring');
var httpClient = axios.create({baseURL: Config.CMC_API_URL, timeout: Config.CMC_API_TIMEOUT});
var requestOptions = {
  url: Config.CMC_REQUEST_URL,
  headers: {'Content-type': Constants.CONTENT_TYPE_APP_URLENCODED},
  params: {convert: Constants.ISO_CODE_EUR},
  paramsSerializer: function (params) {
    return queryString.stringify(params);
  }
};

// Local variables
var isLoggingEnabled = true;
var isCommunicating = false;
var isUpdating = false;
var lastDbUpdateTime = null;

init();

function init() {
  // Data update in intervals
  updateDataFromEndpoint();
  setInterval(updateDataFromEndpoint, Constants.CACHE_UPDATE_INTERVAL_MS);
}

function updateDataFromEndpoint() {
  if (isCommunicating) {
    _log('Warning: Already communicating with the endpoint. Ignoring data import.');
  } else {
    isCommunicating = true;
    _log('Communicating with the endpoint. Retrieving data for import.');

    httpClient.request(requestOptions)
      .catch(catchCommunicationErrors)
      .then(handleResponse);
  }
}

function handleResponse(response) {
  if (isNullOrUndefined(response)) {
      _log('Warning: Undefined response from server.');
  } else {
      var statusText = isNullOrUndefined(response.statusText) ? 'Unknown' : response.statusText;
      _log('Response from server: ' + statusText + ' (' + response.status + ')');

      if (String(response.status) === '200') {
          var now = new Date();
          updateCache(response.data[0], now);

          checkDatabaseUpdate(response.data[0], now);
      }
  }

  isCommunicating = false;
  _log('Communication is closed.');
}

function updateCache(newData, date) {
  if (isNullOrUndefined(newData)) {
    _log('Warning: new data is undefined or null. Cache update aborted.');
  } else {
    const timestamp = date.getTime();
    cacheObj.request_time_ms = timestamp;
    cacheObj.expire_time_ms = timestamp + Constants.CACHE_TIMEOUT_MS;
    cacheObj.data = newData;

    _log('Data cache is updated. Expiration time is ' + cacheObj.expire_time_ms);

    // async writing
    fs.writeFile(Constants.CACHE_FILE_PATH, JSON.stringify(cacheObj), Constants.UTF8, function (error) {
      if (error) {
        _log('Error while writing a cache file. IO Error: ' + error);
      } else {
        _log('Cache file is written successfully.');
      }
    });
  }
}

function checkDatabaseUpdate(newData, date) {
  if (isUpdating) {
    _log('Warning: Already updating the database. Ignoring database update.');
    return;
  }

  if (isNullOrUndefined(newData)) {
    _log('Warning: new data is undefined or null. Database update aborted.');
    return;
  }

  var timestamp = date.getTime();

  // Check if it is time to update the database
  if (typeof lastDbUpdateTime === 'number') {
    var diff = timestamp - lastDbUpdateTime;
    if (diff < Constants.DATABASE_UPDATE_INTERVAL_MS) {
      return; // nope
    }
  }

  isUpdating = true;
  var dbObject = {
    _id: timestamp.toString(),
    data: newData
  };

  database.put(dbObject, function callback(error, result) {
    if (error) {
      _log('Error updating database. Error: ' + error);
    } else {
      lastDbUpdateTime = timestamp;
      _log('Database is updated. New entryId = ' + dbObject._id);
    }
    isUpdating = false;
  });
}

function catchCommunicationErrors(error) {
  if (error.response) {
    // Request sent. But the server responded with a status code grater than 2xx
    _log('Error status: ' + error.response.status);
    _log('Error data: ');
    _log(error.response.data);
    // _log(error.response.headers);
  } else {
    // Error when setting up the request
    _log(error.message);
  }

  isCommunicating = false;
  _log('Communication is closed.');
  // _log(error.config);
}

function _log(msg) {
  if (isLoggingEnabled) {
    console.log(new Date().toISOString() + ' | CmcDataImport: ' + msg);
  }
}

function isNullOrUndefined(obj) {
  return obj === undefined || obj === null;
}
