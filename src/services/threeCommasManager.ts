import { Injectable, ConflictException } from '@nestjs/common';
import ThreeCommasClient from './threeCommasClient';
import { AccountType } from '../interfaces/account';
import { DealType } from '../interfaces/deal';
import { ConfigService } from '@nestjs/config';
import { BotFullType, BotType } from '../interfaces/bot';
import { SignalDto, SignalStrategy } from '../interfaces/signal.dto';
import { sign } from 'crypto';

@Injectable()
export default class ThreeCommasManager {
  private accounts: AccountType[] = [];
  private binanceSpotAccount: AccountType;
  private binanceFuturesAccount: AccountType;

  private matchingFuturePairs: string[] = [];

  private readonly takeProfitsOnSafetyOrdersMap = new Map([
    [0, { tp: '1.0', ttp: '0.2' }],
    [1, { tp: '1.0', ttp: '0.2' }],
    [2, { tp: '1.0', ttp: '0.2' }],
    [3, { tp: '1.0', ttp: '0.2' }],
    [4, { tp: '0.9', ttp: '0.2' }],
    [5, { tp: '0.8', ttp: '0.2' }],
    [6, { tp: '0.3', ttp: '0.1' }],
    [7, { tp: '0.3', ttp: '0.0' }],
    [8, { tp: '0.1', ttp: '0.0' }],
    [9, { tp: '0.1', ttp: '0.0' }],
    [10, { tp: '0.1', ttp: '0.0' }],
  ]);

  constructor(
    private readonly configService: ConfigService,
    private readonly apiClient: ThreeCommasClient,
  ) {}

  async loadAccounts() {
    console.log(new Date(), 'Loading user accounts');

    this.accounts = await this.apiClient.getAccounts();

    this.binanceSpotAccount = this.accounts.find(a => a.market_code === 'binance');
    this.binanceFuturesAccount = this.accounts.find(a => a.market_code === 'binance_futures');

    console.log(
      new Date(),
      'User accounts were loaded',
      this.accounts.map(({ id, name, market_code }) => ({ id, name, market_code })),
    );

    if (!this.binanceSpotAccount || !this.binanceFuturesAccount) {
      throw new Error('User accounts are not initialized!');
    }
  }

  async loadMatchingFuturesPairs() {
    if (!this.binanceSpotAccount || !this.binanceFuturesAccount) {
      throw new Error('Binance accounts are not loaded!');
    }

    const spotPairs = await this.apiClient.getAccountsMarketPairs(
      this.binanceSpotAccount.market_code,
    );
    const futuresPairs = await this.apiClient.getAccountsMarketPairs(
      this.binanceFuturesAccount.market_code,
    );

    this.matchingFuturePairs = futuresPairs.filter(
      pair => pair.indexOf('USDT_') === 0 && spotPairs.includes(pair),
    );
    this.matchingFuturePairs.sort();

    console.log(new Date(), 'Available Future pairs', this.matchingFuturePairs);
  }

  async loadBotInfo(): Promise<{
    mainBot: BotFullType;
    slaveBots: BotFullType[];
    availableSlaveBots: BotFullType[];
    activeSlaveBots: BotFullType[];
  }> {
    const mainBotId = Number.parseInt(this.configService.get('COMPOSITE_SPOT_BOT'));
    const slaveIds = (this.configService.get('SLAVE_FUTURES_BOTS') || '')
      .split(',')
      .map(x => Number.parseInt(x));

    const [mainBot, ...slaveBots] = await Promise.all(
      [mainBotId, ...slaveIds].map(id => this.apiClient.getBotExtendedInfo(id)),
    );

    const availableSlaveBots = slaveBots.filter(
      fb => fb.is_enabled && fb.active_deals_count === 0 && !fb.active_deals.length,
    );

    const activeSlaveBots = slaveBots.filter(fb => fb.active_deals_count || fb.active_deals.length);

    console.log(new Date(), 'Loaded bot info', {
      mainBot: this.formatBotEntity(mainBot),
      slaveBots: slaveBots.map(this.formatBotEntity),
    });

    return { mainBot, slaveBots, availableSlaveBots, activeSlaveBots };
  }

  async getBestPossibleDealsToCopy(
    mainBot: BotFullType,
    activeSlaveBots: BotFullType[],
  ): Promise<{ notStartedDeals: DealType[]; startedDeals: DealType[] }> {
    if (!mainBot || !mainBot.active_deals.length) {
      console.log(new Date(), 'No active deals to init Futures bot');

      return { notStartedDeals: [], startedDeals: [] };
    }

    const startedDealPairs = activeSlaveBots.reduce(
      (pairs, bot) => [...pairs, ...bot.active_deals.map(({ pair }) => pair)],
      [],
    );
    console.log(new Date(), 'Started Futures deals', startedDealPairs);

    const possibleDealsToCopy = mainBot.active_deals
      .filter(deal => {
        const activeTime = new Date().getTime() - new Date(deal.created_at).getTime();
        const completedSO =
          deal.completed_manual_safety_orders_count + deal.completed_safety_orders_count;
        const maxProfitLevelToOpenNewFuturesDeal =
          completedSO === 0
            ? '-0.4'
            : completedSO === 1
            ? '-0.3'
            : completedSO === 2
            ? '-0.2'
            : '-0.1';

        return (
          this.matchingFuturePairs.includes(deal.pair) && // available for both Spot and Futures trading
          activeTime < 4 * 60 * 60 * 1000 && // active less than 4 hours
          // d.completed_safety_orders_count >= 5 && // maybe risky
          this.isPercentageGreater(
            maxProfitLevelToOpenNewFuturesDeal,
            deal.actual_profit_percentage,
          ) && // has potential for growth according to initial signal
          // other checks
          !deal.deal_has_error &&
          !deal.closed_at
        );
      })
      .sort((dealA, dealB) => {
        const completedSafeOrdersA =
          dealA.completed_manual_safety_orders_count + dealA.completed_safety_orders_count;
        const completedSafeOrdersB =
          dealB.completed_manual_safety_orders_count + dealB.completed_safety_orders_count;

        return completedSafeOrdersA > completedSafeOrdersB
          ? -1
          : completedSafeOrdersA === completedSafeOrdersB &&
            this.isPercentageGreater(dealB.actual_profit_percentage, dealA.actual_profit_percentage)
          ? -1
          : 1;
      });

    const notStartedDeals = possibleDealsToCopy.filter(
      ({ pair }) => !startedDealPairs.includes(pair),
    );
    const startedDeals = possibleDealsToCopy.filter(({ pair }) => startedDealPairs.includes(pair));

    console.log(
      new Date(),
      'Possible Deals to copy',
      JSON.stringify({
        possibleNotStarted: notStartedDeals.map(({ pair }) => pair),
        possibleStarted: startedDeals.map(({ pair }) => pair),
        all: mainBot.active_deals.map(({ pair }) => pair),
        possibleDealsToCopy: possibleDealsToCopy.map(this.remapDeal),
      }),
    );

    return { notStartedDeals, startedDeals };
  }

  async startFutureBots(availableFutureBots: BotFullType[], bestPossibleDeals: DealType[]) {
    if (!availableFutureBots.length && bestPossibleDeals.length) {
      console.log(new Date(), 'No available Futures bots to start');
    }

    return Promise.all(
      availableFutureBots.map(async (bot: BotType, i) => {
        const dealToCopy = bestPossibleDeals[i];

        if (!dealToCopy) {
          return bot;
        }

        return this.startFutureBot(bot, dealToCopy.pair);
      }),
    );
  }

  private async startFutureBot(bot: BotType, pair: string) {
    if (!bot.pairs.includes(pair)) {
      bot = await this.apiClient.changeBotPair(bot, pair);

      console.log(new Date(), 'Changed bot', this.formatBotEntity(bot));
    }

    await this.apiClient.startDealWithBot(bot.id, pair);

    const result = await this.apiClient.getBotExtendedInfo(bot.id);

    console.log(new Date(), 'Started new Futures bot', this.formatBotEntity(result));
  }

  async finishProfitableBots(
    occupiedBots: BotFullType[],
    availableBots: BotType[],
    alreadyStartedPairs: string[] = [],
    newPossiblePairs: string[] = [],
  ) {
    const isFinished = (
      await Promise.all(
        occupiedBots.map(async bot => {
          return (
            await Promise.all(
              (bot.active_deals || []).map(async deal => {
                if (
                  this.isPercentageGreater(deal.actual_profit_percentage, '0.5') &&
                  this.isPercentageGreater(deal.take_profit, deal.actual_profit_percentage) &&
                  (alreadyStartedPairs.includes(deal.pair) || // take profit and restrart bot with the same pair
                    (!availableBots.length && newPossiblePairs.length)) // all bots are taken, but there is some new possible deal
                ) {
                  console.log(
                    new Date(),
                    'Changing TP to start new bot with new pair and close deal ASAP',
                    JSON.stringify({
                      bot: this.remapBot(bot),
                      prevTP: deal.take_profit,
                      actualTP: deal.actual_profit_percentage,
                      newTP: '0.5',
                    }),
                  );

                  const updatedDeal = await this.apiClient.updateDeal(deal.id, {
                    take_profit: '0.5',
                  });

                  // remove one possible deal to not finish started bot deals more than needed
                  newPossiblePairs.shift();

                  console.log(
                    new Date(),
                    'Changed TP to close deal ASAP',
                    JSON.stringify(this.remapDeal(updatedDeal)),
                  );

                  return true;
                }

                return false;
              }),
            )
          ).some(Boolean);
        }),
      )
    ).some(Boolean);

    console.log(
      new Date(),
      'Finishing profitable futures bots result',
      String(isFinished).toUpperCase(),
    );

    return isFinished;
  }

  async recalculateTakeProfits(activeFuturesBots: BotFullType[]) {
    return Promise.all(
      activeFuturesBots.map(async bot => {
        return Promise.all(
          (bot.active_deals || []).map(async deal => {
            const completedSO =
              deal.completed_manual_safety_orders_count + deal.completed_safety_orders_count;
            const { tp, ttp } = this.takeProfitsOnSafetyOrdersMap.get(completedSO);

            const noNeedToChangeTP = !tp || this.isPercentageGreater(tp, deal.take_profit);
            const alreadySetCorrectTP = tp === deal.take_profit;

            if (noNeedToChangeTP || alreadySetCorrectTP) {
              noNeedToChangeTP &&
                console.log(
                  new Date(),
                  'Something strange during TP recalculation',
                  JSON.stringify({ bot: this.remapBot(bot), tp, ttp }),
                );

              return deal;
            }

            console.log(
              new Date(),
              'Changing TP',
              JSON.stringify({
                bot: this.remapBot(bot),
                prevTP: deal.take_profit,
                prevTTP: deal.trailing_deviation,
                newTP: tp,
                newTTP: ttp,
              }),
            );

            const updatedDeal = await this.apiClient.updateDeal(deal.id, {
              take_profit: tp,
              // take_profit_type: deal.take_profit_type,
              // profit_currency: deal.profit_currency,
              trailing_enabled: ttp !== '0.0',
              trailing_deviation: ttp,
              // stop_loss_percentage: Number.parseFloat(deal.stop_loss_percentage),
              // max_safety_orders: deal.max_safety_orders,
              // active_safety_orders_count: deal.active_safety_orders_count,
              // stop_loss_timeout_enabled: deal.stop_loss_timeout_enabled,
              // stop_loss_timeout_in_seconds: deal.stop_loss_timeout_in_seconds,
              // tsl_enabled: deal.tsl_enabled,
              // stop_loss_type: deal.stop_loss_type,
            });

            console.log(
              new Date(),
              'Changed take profit',
              JSON.stringify(this.remapDeal(updatedDeal)),
            );

            return updatedDeal;
          }),
        );
      }),
    );
  }

  async startSpotSignalDeal(signal) {
    const signalBotIds = (this.configService.get('BINANCE_SPOT_SIGNAL_BOTS') || '')
      .split(',')
      .map(x => Number.parseInt(x));

    const signalBots: BotFullType[] = await Promise.all(
      signalBotIds.map(id => this.apiClient.getBotExtendedInfo(id)),
    );
    const activeBots = signalBots.filter(
      b => b.is_enabled && b.account_id === this.binanceSpotAccount.id,
    );

    const freeBots = activeBots.filter(b => b.active_deals.length < b.max_active_deals);
    const botToStart = freeBots.find(
      freeBot =>
        freeBot.pairs.includes(signal.pair) &&
        !freeBot.active_deals.find(d => d.pair === signal.pair),
    );

    const runningWithSignalDeal = activeBots.find(b =>
      b.active_deals.find(d => d.pair === signal.pair),
    );

    if (runningWithSignalDeal) {
      console.log(
        new Date(),
        'Signal already running',
        JSON.stringify({ signal, bot: this.remapBot(runningWithSignalDeal) }),
      );
    }

    if (botToStart) {
      console.log(
        new Date(),
        'Starting new Spot bot signal deal',
        JSON.stringify({ signal, bot: this.remapBot(botToStart) }),
      );

      // await this.apiClient.startDealWithBot(botToStart.id, signal.pair);
    } else if (!runningWithSignalDeal) {
      console.log(
        new Date(),
        'No free Spot bot for starting new signal deal',
        JSON.stringify({ signal, bots: activeBots.map(this.remapBot) }),
      );
    }
  }

  async startFuturesSignalDeal(signal: SignalDto) {
    if (signal.strategy !== SignalStrategy.LONG) {
      console.log(new Date(), 'Received non long strategy', JSON.stringify(signal));

      throw new ConflictException('Short strategy is not supported yet');
    }

    const signalBotIds = (this.configService.get('BINANCE_FUTURES_SIGNAL_BOTS') || '')
      .split(',')
      .map(x => Number.parseInt(x));

    const bots: BotFullType[] = await Promise.all(
      signalBotIds.map(id => this.apiClient.getBotExtendedInfo(id)),
    );
    const activeBots = bots.filter(
      b => b.is_enabled && b.account_id === this.binanceFuturesAccount.id,
    );

    const occupiedBots = activeBots.filter(b => b.active_deals.length);
    const freeBots = activeBots.filter(b => !b.active_deals.length);

    const isSignalAlreadyRunning = occupiedBots.map(b => b.pairs[0]).includes(signal.pair);
    // todo check there is no already open positions for pair

    if (freeBots.length && !isSignalAlreadyRunning) {
      this.startFutureBot(freeBots[0], signal.pair);
    } else {
      this.finishProfitableBots(
        occupiedBots,
        freeBots,
        isSignalAlreadyRunning ? [signal.pair] : [],
        isSignalAlreadyRunning ? [] : [signal.pair],
      );
      console.log(
        new Date(),
        'Failed to start Futures signal deal. All bots are taken',
        JSON.stringify({ signal, bots: activeBots.map(this.remapBot) }),
      );
    }
  }

  isPercentageGreater = (percentageA, percentageB) => {
    return (
      Math.round(Number.parseFloat(percentageA) * 100) >
      Math.round(Number.parseFloat(percentageB) * 100)
    );
  };

  formatBotEntity = bot => JSON.stringify(this.remapBot(bot));

  remapBot = ({ id, pairs, is_enabled, active_deals_count, active_deals }) => ({
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
    completed_manual_safety_orders_count,
    actual_profit_percentage,
    take_profit,
    bought_average_price,
    current_price,
    take_profit_price,
  }: DealType) => ({
    id,
    pair,
    createdAt: created_at,
    completedSafetyOrdersCount: completed_safety_orders_count,
    completedManualSafetyOrdersCount: completed_manual_safety_orders_count,
    actualProfitPercentage: actual_profit_percentage,
    takeProfitPercentage: take_profit,
    boughtPrice: bought_average_price,
    currentPrice: current_price,
    takeProfitPrice: take_profit_price,
  });
}
