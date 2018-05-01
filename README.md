# nem-telegram-bot
A Telegram chat bot for fetching the price of XEM

## install
```
npm install
```

## usage
1. Run the price data fetcher. It fetches the data regularly at a given time interval.
```
node cmcdataimport.js
```

2. And then run the telegram bot. It relays the price data to the requester (from the chat).
```
node nembot.js
```

Both processes should be kept running. For example, by using Node.js Process Manager (PM2):
```
npm install --global pm2
```
And then run both as background process
```
pm2 start cmcdataimport.js -i 0 --name "cmcbot"
pm2 start nembot.js -i 0 --name "nembot"
```

__Important notes:__  
[Bugfix: #319](https://github.com/yagop/node-telegram-bot-api/issues/319)

#### License
Dual licensed under the MIT and LGPL licenses:

- [MIT License](LICENSE-MIT) (https://opensource.org/licenses/MIT)
- [GNU GPL v3.0](LICENSE-GPL3) (https://www.gnu.org/licenses/gpl.html)
