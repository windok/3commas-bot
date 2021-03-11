#!/usr/local/bin/node
import dotenv from 'dotenv';

import ThreeCommasAPI from './src/threeCommasAPI.js';
import BotManager from './src/botManager.js';
import { TOO_MANY_REQUESTS_ERROR } from './src/errors.js';

dotenv.config();

(async () => {
  const apiClient = new ThreeCommasAPI({
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_KEY_SECRET,
  });
  const botManager = new BotManager(apiClient);

  await botManager.loadAccounts();
  await botManager.loadMatchingFuturesPairs();

  // todo log both in file and stdout

  // update info every 6 hours
  setInterval(() => {
    botManager.loadAccounts();
    botManager.loadMatchingFuturesPairs();
  }, 6 * 60 * 60 * 1000);

  const initialCheckDealsTimeout = Number.parseInt(process.env.CHECK_DEALS_TIMEOUT) * 1000;
  const tooManyRequestTimeout = 60 * 60 * 1000;

  let checkDealsTimeout = initialCheckDealsTimeout;

  const checkBots = async () => {
    try {
      const {
        mainBot,
        availableSlaveBots,
        activeSlaveBots,
      } = await botManager.loadBotInfo();

      const bestPossibleDeals = await botManager.getBestPossibleDealsToCopy(
        mainBot,
        activeSlaveBots,
      );

      await botManager.startFutureBots(
        availableSlaveBots,
        bestPossibleDeals,
      );

      await botManager.recalculateTakeProfits(activeSlaveBots);

      checkDealsTimeout = initialCheckDealsTimeout;
    } catch (e) {
      console.error(e);

      if (e.message === TOO_MANY_REQUESTS_ERROR) {
        checkDealsTimeout = tooManyRequestTimeout;
      }
    }
  };

  while (true) {
    console.log('-----------------------------------------------------');
    console.log(new Date());
    console.log('-----------------------------------------------------');

    await checkBots();
    await new Promise(resolve => setTimeout(resolve, checkDealsTimeout));
  }
})().catch(e => {
  console.error(e);
});
