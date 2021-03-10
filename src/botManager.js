#!/usr/local/bin/node
import ThreeCommasAPI from './threeCommasAPI.js';

class BotManager {
  /**
   * @property {ThreeCommasAPI} _apiClient
   */
  _apiClient;

  _accounts;
  _binanceSpotAccount;
  _binanceFuturesAccount;

  _matchingFuturePairs;

  /**
   *
   * @param {ThreeCommasAPI} apiClient
   */
  constructor(apiClient) {
    this._apiClient = apiClient;
  }

  async loadAccounts() {
    console.log('Loading user accounts');

    const accounts = await this._apiClient.getAccounts();

    this._accounts = accounts;

    this._binanceSpotAccount = accounts.find(a => a.market_code === 'binance');
    this._binanceFuturesAccount = accounts.find(
      a => a.market_code === 'binance_futures');

    console.log(
      'User accounts were loaded',
      accounts.map(
        ({ id, name, market_code }) => ({ id, name, market_code }),
      ),
    );

    if (!this._binanceSpotAccount || !this._binanceFuturesAccount) {
      throw new Error('User accounts are not initialized!');
    }
  }

  async loadMatchingFuturesPairs() {
    const spotPairs = await this._apiClient.getAccountsMarketPairs(
      this._binanceSpotAccount.market_code,
    );
    const futuresPairs = await this._apiClient.getAccountsMarketPairs(
      this._binanceFuturesAccount.market_code,
    );

    this._matchingFuturePairs = futuresPairs.filter(
      pair => pair.indexOf('USDT_') === 0 && spotPairs.includes(pair),
    );

    console.log('Available Future pairs', this._matchingFuturePairs);
  }

  // todo handle 429 error
  async checkActiveSpotDeals() {
    const bots = await this._apiClient.getBots();

    const futuresBots = bots.filter(
      b => b.account_id === this._binanceFuturesAccount.id,
    );

    const availableFuturesBots = futuresBots.filter(
      fb => (
        fb.is_enabled &&
        fb.active_deals_count === 0 &&
        fb.pairs.every(p => p.indexOf('USDT_') === 0)
      ),
    );
    console.log('Available futures bots', availableFuturesBots.map(({ id, name, pairs }) => ({ id, name, pairs })));

    const startedDealPairs = futuresBots.reduce(
      (pairs, fb) => {
        if (fb.active_deals_count >= 1) {
          return [...(new Set([...pairs, ...fb.pairs]))];
        }

        return pairs;
      }, [],
    );
    console.log({ startedDealPairs} );

    if (!availableFuturesBots.length) {
      throw new Error('No available Futures bots');
    }

    const usdtSpotLongBot = bots.find(b => b.name === 'USDT Spot Long'); // todo get by id
    const usdtSpotLongBotInfo = await this._apiClient.getBotExtendedInfo(
      usdtSpotLongBot.id);
    console.log('#### USDT Spot Bot Info ###');
    console.log(usdtSpotLongBotInfo);
    console.log('###########################');

    if (!usdtSpotLongBotInfo || !usdtSpotLongBotInfo.active_deals.length) {
      throw new Error('No active deals to init Futures bot');
    }

    const possibleDealsToCopy = usdtSpotLongBotInfo.active_deals.filter(d => {
      const activeTime = (new Date().getTime() -
        new Date(d.created_at).getTime());
      const profitPercentage = Number.parseFloat(d.actual_profit_percentage);

      return (
        this._matchingFuturePairs.includes(d.pair) && // available for both Spot and Futures trading
        activeTime < 2 * 60 * 60 * 1000 && // active less than 2 hours
        !startedDealPairs.includes(d.pair) && // no futures bots already launched with this pair
        // d.completed_safety_orders_count >= 5 && // maybe risky
        profitPercentage < -0.4 && // has potential for growth according to initial signal
        // other checks
        !d.deal_has_error &&
        !d.closed_at
      );
    }).sort((dealA, dealB) => { // todo check sorting
      return dealA.completed_safety_orders_count >
      dealB.completed_safety_orders_count
        ? 1
        : (
          dealA.completed_safety_orders_count ===
          dealB.completed_safety_orders_count &&
          dealA.profitPercentage < dealB.profitPercentage
        ) ? 1 : -1;
    });

    console.log('Possible Deals to copy', possibleDealsToCopy);

    if (!possibleDealsToCopy.length) {
      throw new Error('No good deals cheaper than bought to init Futures bot');
    }

    return {
      bestPossibleDeal: possibleDealsToCopy[0],
      availableFuturesBots,
    };
  }

  async startFutureBot(futureBot, spotDealToCopyOnFutures) {
    if (!futureBot.pairs.includes(spotDealToCopyOnFutures.pair)) {
      const changedBot = await this._apiClient.changeBotPair(
        futureBot,
        [spotDealToCopyOnFutures.pair],
      );

      console.log('Changed bot', changedBot);
    }

    const startingBotResult = await this._apiClient.startDealWithBot(
      futureBot.id,
      spotDealToCopyOnFutures.pair,
    );

    console.log('Started bot result', startingBotResult);
  }

}

export default BotManager;
