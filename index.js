#!/usr/local/bin/node
import dotenv from 'dotenv';
import http from 'http';

import ThreeCommasAPI from './src/threeCommasAPI.js';
import BotManager from './src/botManager.js';
import { TOO_MANY_REQUESTS_ERROR } from './src/errors.js';

dotenv.config();

// todo sanitize webhook payload
// todo futures signals without spot->futures transferring
// todo open short positions
// todo log both in file and stdout, log with time
// optional todo when starting futures deal check that there are no active positions even for bots that are not configured in env
// todo move to docker
// todo move to cloud
// todo get rid of 3commas
// todo web configuration
// todo telegram logging
// optional todo google spreadsheet statistics
// todo hedge mode for the pair with both long and short positions

(async () => {
  const apiClient = new ThreeCommasAPI({
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_KEY_SECRET,
  });
  const botManager = new BotManager(apiClient);

  await botManager.loadAccounts();
  await botManager.loadMatchingFuturesPairs();

  const hostname = '127.0.0.1';
  const port = process.env.PORT;

  const server = http.createServer((req, res) => {
    var body = '';
    req.on('data', function (chunk) {
      body += chunk;
    });

    req.on('end', function () {
      body = body.replace(/\n/gmi, '');
      body = body.replace(/\s+/gmi, ' ');

      let payload;
      try {
        payload = JSON.parse(body);
      } catch (e) {
        console.log(new Date(), 'Failed to parse body', body, e);
      }

      if (
        !payload.price ||
        !payload.pair ||
        !payload.time ||
        payload.token !== process.env.SIGNAL_SAFETY_TOKEN
      ) {
        console.log(new Date(), 'Incorrect payload format', body);
      } else if (new Date().getTime() - new Date(payload.time).getTime() > 3 * 60 * 1000) {
        console.log(new Date(), 'Signal is outdated', body);
      } else {
        console.log(new Date(), 'Received payload', body);

        (async () => {
          try {
            await botManager.startSignalDeal(payload)
          } catch (e) {
            console.log(new Date(), 'Error during processing signal', body, e)
          }
        })();
      }

      res.writeHead(200);
      res.end(body);
    });
  });

  server.listen(port, hostname, () => {
    console.log(new Date(), `Server running at http://${hostname}:${port}/`);
  });

  const initialCheckDealsTimeout = Number.parseInt(process.env.CHECK_DEALS_TIMEOUT) * 1000;
  const tooManyRequestTimeout = Number.parseInt(process.env.TOO_MANY_REQUESTS_TIMEOUT) * 1000;

  let checkDealsTimeout = initialCheckDealsTimeout;

  const checkBots = async () => {
    try {
      let {
        mainBot,
        availableSlaveBots,
        activeSlaveBots,
      } = await botManager.loadBotInfo();

      const { notStartedDeals, startedDeals } = await botManager.getBestPossibleDealsToCopy(
        mainBot,
        activeSlaveBots,
      );

      const isFinished = await botManager.finishProfitableFuturesBots(
        activeSlaveBots,
        availableSlaveBots,
        startedDeals.map(({ pair }) => pair),
        notStartedDeals.map(({ pair }) => pair),
      );
      if (isFinished) {
        const updatedBotInfo = await botManager.loadBotInfo();

        availableSlaveBots = updatedBotInfo.availableSlaveBots;
        activeSlaveBots = updatedBotInfo.activeSlaveBots;
      }

      await Promise.all([
        botManager.recalculateTakeProfits(activeSlaveBots),
        botManager.startFutureBots(availableSlaveBots, notStartedDeals),
      ]);

      checkDealsTimeout = initialCheckDealsTimeout;
    } catch (e) {
      console.log(new Date(), 'Error checking bots', e && e.message, e);

      if (e.message === TOO_MANY_REQUESTS_ERROR) {
        checkDealsTimeout = tooManyRequestTimeout;
      }
    }
  };

  while (true) {
    await checkBots();
    await new Promise(resolve => setTimeout(resolve, checkDealsTimeout));
  }
})().catch(e => {
  console.log(new Date(), 'General error', e && e.message, e);
});
