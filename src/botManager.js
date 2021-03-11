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

    console.log('Available Future pairs', this._matchingFuturePairs.sort());
  }

  async loadBotInfo() {
    const mainBotId = Number.parseInt(process.env.COMPOSITE_SPOT_BOT);
    const slaveIds = (process.env.SLAVE_FUTURES_BOTS || '').split(',').map(x => Number.parseInt(x));

    const [mainBot, ...slaveBots] = await Promise.all(
      [mainBotId, ...slaveIds].map(
        id => this._apiClient.getBotExtendedInfo(id)),
    );

    const availableSlaveBots = slaveBots.filter(
      fb => (
        fb.is_enabled &&
        fb.active_deals_count === 0 &&
        !fb.active_deals.length
      ),
    );

    const activeSlaveBots = slaveBots.filter(
      fb => fb.active_deals_count || fb.active_deals.length,
    );

    console.log('Loaded bot info', {
      mainBot: this.remapBot(mainBot),
      slaveBots: slaveBots.map(this.remapBot),
    });

    return { mainBot, slaveBots, availableSlaveBots, activeSlaveBots };
  }

  async getBestPossibleDealsToCopy(mainBot, activeSlaveBots) {
    if (!mainBot || !mainBot.active_deals.length) {
      console.log('No active deals to init Futures bot');

      return [];
    }

    const startedDealPairs = activeSlaveBots.reduce(
      (pairs, bot) => [...pairs, ...bot.active_deals.map(({ pair }) => pair)],
      [],
    );
    console.log('Started Futures deals', startedDealPairs);

    const possibleDealsToCopy = mainBot.active_deals.filter(d => {
      const activeTime = (new Date().getTime() -
        new Date(d.created_at).getTime());
      const profitPercentage = Number.parseFloat(d.actual_profit_percentage);

      return (
        this._matchingFuturePairs.includes(d.pair) && // available for both Spot and Futures trading
        activeTime < 4 * 60 * 60 * 1000 && // active less than 4 hours
        !startedDealPairs.includes(d.pair) && // no futures bots already launched with this pair
        // d.completed_safety_orders_count >= 5 && // maybe risky
        profitPercentage < -0.3 && // has potential for growth according to initial signal
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

    console.log(
      'Possible Deals to copy',
      possibleDealsToCopy.map(this.remapDeal),
    );

    return possibleDealsToCopy;
  }

  async startFutureBots(availableFutureBots, bestPossibleDeals) {
    if (!availableFutureBots.length) {
      console.log('No available Futures bots to start');
    }

    return Promise.all(availableFutureBots.map(async (bot, i) => {
      const dealToCopy = bestPossibleDeals[i];

      if (!dealToCopy) {
        return bot;
      }

      if (!bot.pairs.includes(bestPossibleDeals[i].pair)) {
        bot = await this._apiClient.changeBotPair(
          bot,
          dealToCopy.pair,
        );

        console.log('Changed bot', this.remapBot(bot));
      }

      await this._apiClient.startDealWithBot(
        bot.id,
        dealToCopy.pair,
      );

      const result = await this._apiClient.getBotExtendedInfo(bot.id);

      console.log('Started new futures bot', this.remapBot(result));
    }));
  }

  remapBot = ({
    id,
    pairs,
    is_enabled,
    active_deals_count,
    active_deals,
  }) => JSON.stringify(
    {
      id: id,
      pairs: pairs,
      isEnabled: is_enabled,
      activeDealsCount: active_deals_count,
      activeDeals: active_deals && active_deals.map(this.remapDeal),
    });

  remapDeal = ({
    id,
    pair,
    created_at,
    completed_safety_orders_count,
    actual_profit_percentage,
    take_profit,
    bought_average_price,
    current_price,
    take_profit_price,
  }) => ({
    id,
    pair,
    createdAt: created_at,
    completedSafetyOrdersCount: completed_safety_orders_count,
    actualProfitPercentage: actual_profit_percentage,
    takeProfitPercentage: take_profit,
    boughtPrice: bought_average_price,
    currentPrice: current_price,
    takeProfitPrice: take_profit_price
  });

}

export default BotManager;
