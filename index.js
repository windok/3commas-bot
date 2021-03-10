#!/usr/local/bin/node
import dotenv from 'dotenv';

import ThreeCommasAPI from './src/threeCommasAPI.js';
import BotManager from './src/botManager.js';

dotenv.config();

(async () => {
  const apiClient = new ThreeCommasAPI({
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_KEY_SECRET,
  });
  const botManager = new BotManager(apiClient);

  await botManager.loadAccounts();
  await botManager.loadMatchingFuturesPairs();

  // update info
  setInterval(() => {
    botManager.loadAccounts();
    botManager.loadMatchingFuturesPairs();
  }, 60 * 60 * 1000);

  setInterval(async () => {
    try {
      console.log('*********');
      console.log('*********');
      console.log('*********');
      console.log('*********');
      console.log('*********');

      const {
        bestPossibleDeal,
        availableFuturesBots,
      } = await botManager.checkActiveSpotDeals();

      await botManager.startFutureBot(
        availableFuturesBots[0],
        bestPossibleDeal,
      );
    } catch (e) {
      console.error(e);
    }
  }, 30 * 1000);

})().catch(e => {
  console.error(e);
});
