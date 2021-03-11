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

  console.log(JSON.stringify(await botManager.loadBotInfo()));

  console.log(await apiClient.ping());
  console.log(await apiClient.time());
  // console.log(await apiClient.getAccounts());
  // console.log(await apiClient.getBots());

})().catch(e => {
  console.error(e);
});
