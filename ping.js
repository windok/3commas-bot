#!/usr/local/bin/node
import dotenv from 'dotenv';

import ThreeCommasAPI from './src/threeCommasAPI.js';

dotenv.config();

(async () => {
  const apiClient = new ThreeCommasAPI({
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_KEY_SECRET,
  });

  console.log(await apiClient.ping());
  console.log(await apiClient.time());


})().catch(e => {
  console.error(e);
});
