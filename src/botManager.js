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

  _takeProfitsOnSafetyOrdersMap = new Map([
    [0, '1.1'],
    [1, '1.1'],
    [2, '1.1'],
    [3, '1.1'],
    [4, '1.0'],
    [5, '0.8'],
    [6, '0.4'],
  ]);

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
      mainBot: this.formatBotEntity(mainBot),
      slaveBots: slaveBots.map(this.formatBotEntity),
    });

    return { mainBot, slaveBots, availableSlaveBots, activeSlaveBots };
  }

  async getBestPossibleDealsToCopy(mainBot, activeSlaveBots) {
    if (!mainBot || !mainBot.active_deals.length) {
      console.log('No active deals to init Futures bot');

      return { notStartedDeals: [], startedDeals: [] };
    }

    const startedDealPairs = activeSlaveBots.reduce(
      (pairs, bot) => [...pairs, ...bot.active_deals.map(this.getDealPair)],
      [],
    );
    console.log('Started Futures deals', startedDealPairs);

    const possibleDealsToCopy = mainBot.active_deals.filter(d => {
      const activeTime = (new Date().getTime() -
        new Date(d.created_at).getTime());

      return (
        this._matchingFuturePairs.includes(d.pair) && // available for both Spot and Futures trading
        activeTime < 4 * 60 * 60 * 1000 && // active less than 4 hours
        // d.completed_safety_orders_count >= 5 && // maybe risky
        this.isPercentageGreater('-0.4', d.actual_profit_percentage) && // has potential for growth according to initial signal
        // other checks
        !d.deal_has_error &&
        !d.closed_at
      );
    }).sort((dealA, dealB) => {
      return dealA.completed_safety_orders_count > dealB.completed_safety_orders_count
        ? -1
        : (
          dealA.completed_safety_orders_count === dealB.completed_safety_orders_count &&
          this.isPercentageGreater(dealB.actual_profit_percentage, dealA.actual_profit_percentage)
        ) ? -1 : 1;
    });

    const notStartedDeals = possibleDealsToCopy.filter(
      ({ pair }) => !startedDealPairs.includes(pair),
    );
    const startedDeals = possibleDealsToCopy.filter(
      ({ pair }) => startedDealPairs.includes(pair),
    );

    console.log(
      'Possible Deals to copy',
      JSON.stringify({
          possibleNotStarted: notStartedDeals.map(this.getDealPair),
          possibleStarted: startedDeals.map(this.getDealPair),
          all: mainBot.active_deals.map(this.getDealPair),
          possibleDealsToCopy: possibleDealsToCopy.map(this.remapDeal),
        },
      ),
    );

    return { notStartedDeals, startedDeals };
  }

  async startFutureBots(availableFutureBots, bestPossibleDeals) {
    if (!availableFutureBots.length && bestPossibleDeals.length) {
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

        console.log('Changed bot', this.formatBotEntity(bot));
      }

      await this._apiClient.startDealWithBot(
        bot.id,
        dealToCopy.pair,
      );

      const result = await this._apiClient.getBotExtendedInfo(bot.id);

      console.log('Started new futures bot', this.formatBotEntity(result));
    }));
  }

  async finishProfitableFuturesBots(activeFuturesBots, availableSlaveBots, alreadyStartedPairs = [], newPossiblePairs = []) {
    const isFinished = (await Promise.all(activeFuturesBots.map(async (bot) => {
      return (await Promise.all((bot.active_deals || []).map(async (deal) => {
        if (
          this.isPercentageGreater(deal.actual_profit_percentage, '0.5') &&
          this.isPercentageGreater(deal.take_profit, deal.actual_profit_percentage) &&
          (
            alreadyStartedPairs.includes(deal.pair) || // take profit and restrart bot with the same pair
            (!availableSlaveBots.length && newPossiblePairs.length) // all bots are taken, but there is some new possible deal
          )
        ) {
          console.log('Changing TP to start new bot with new pair and close deal ASAP', JSON.stringify({
            bot: this.remapBot(bot),
            prevTP: deal.take_profit,
            actualTP: deal.actual_profit_percentage,
            newTP: '0.5',
          }));

          const updatedDeal = await this._apiClient.updateDeal(deal.id, {
            take_profit: '0.5',
          });

          // remove one possible deal to not finish started bot deals more than needed
          newPossiblePairs.shift();

          console.log('Changed TP to close deal ASAP', JSON.stringify(this.remapDeal(updatedDeal)));

          return true;
        }

        return false;
      }))).some(Boolean);
    }))).some(Boolean);

    console.log('Finishing profitable futures bots result', String(isFinished).toUpperCase());

    return isFinished;
  }

  async recalculateTakeProfits(activeFuturesBots) {
    return Promise.all(activeFuturesBots.map(async (bot) => {
      return Promise.all((bot.active_deals || []).map(async (deal) => {
        const requiredTakeProfit = this._takeProfitsOnSafetyOrdersMap.get(deal.completed_safety_orders_count);

        const noNeedToChangeTP = (
          deal.completed_manual_safety_orders_count ||
          !requiredTakeProfit ||
          this.isPercentageGreater(requiredTakeProfit, deal.take_profit)
        );
        const alreadySetCorrectTP = requiredTakeProfit === deal.take_profit;

        if (noNeedToChangeTP || alreadySetCorrectTP) {
          if (
            noNeedToChangeTP
          ) {
            console.log(
              'Something strange during TP recalculation',
              JSON.stringify({ bot: this.remapBot(bot), requiredTakeProfit }),
            );
          }

          return deal;
        }

        console.log('Changing TP', JSON.stringify({
          bot: this.remapBot(bot),
          prevTP: deal.take_profit,
          newTP: requiredTakeProfit,
        }));

        const updatedDeal = await this._apiClient.updateDeal(deal.id, {
          take_profit: requiredTakeProfit,
          // take_profit_type: deal.take_profit_type,
          // profit_currency: deal.profit_currency,
          // trailing_enabled: deal.trailing_enabled,
          // trailing_deviation: deal.trailing_deviation,
          // stop_loss_percentage: Number.parseFloat(deal.stop_loss_percentage),
          // max_safety_orders: deal.max_safety_orders,
          // active_safety_orders_count: deal.active_safety_orders_count,
          // stop_loss_timeout_enabled: deal.stop_loss_timeout_enabled,
          // stop_loss_timeout_in_seconds: deal.stop_loss_timeout_in_seconds,
          // tsl_enabled: deal.tsl_enabled,
          // stop_loss_type: deal.stop_loss_type,
        });

        console.log('Changed take profit', JSON.stringify(this.remapDeal(updatedDeal)));

        return updatedDeal;
      }));
    }));
  }

  isPercentageGreater = (percentageA, percentageB) => {
    return Math.round(Number.parseFloat(percentageA) * 100) > Math.round(Number.parseFloat(percentageB) * 100);
  };

  formatBotEntity = (bot) => JSON.stringify(this.remapBot(bot));

  remapBot = ({
    id,
    pairs,
    is_enabled,
    active_deals_count,
    active_deals,
  }) => ({
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
    takeProfitPrice: take_profit_price,
  });

  getDealPair = ({ pair }) => pair;

}

export default BotManager;
