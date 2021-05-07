import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as currencyJS from 'currency.js';
import ThreeCommasClient from './threeCommasClient';
import SignalService from './signalService';
import { AccountType, Strategy } from '../interfaces/meta';
import { Account } from '../interfaces/account';
import { DealType } from '../interfaces/deal';
import { BotFullType, BotType } from '../interfaces/bot';
import { SignalDto } from '../interfaces/signal.dto';
import { DelayedInvestDto } from '../interfaces/delayed-invest.dto';
import { AddingFunds } from '../interfaces/adding-funds';

interface Investing {
  dealId: number;
  pair: string;
  volume: string;
  createdAt?: Date;
}

@Injectable()
export default class ThreeCommasManager {
  private checkSpotCounter = 0;
  private accountMap: Map<AccountType, Account> = new Map();

  private readonly finishBotProfitMap = new Map<number, { tp: string; ttp: string }>([
    [0, { tp: '0.9', ttp: '0.1' }],
    [1, { tp: '0.6', ttp: '0.1' }],
    [2, { tp: '0.4', ttp: '0.1' }],
    [3, { tp: '0.4', ttp: '0.1' }],
    [4, { tp: '0.3', ttp: '0.1' }],
    [5, { tp: '0.3', ttp: '0.1' }],
    [6, { tp: '0.3', ttp: '0.1' }],
    [7, { tp: '0.3', ttp: '0.1' }],
  ]);

  // todo move to db
  private startedDeals: Array<DealType> = [];
  private additionalInvesting: Investing[] = [];
  private investingHistory: Investing[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly apiClient: ThreeCommasClient,
    private readonly signalService: SignalService,
  ) {}

  getStartedDeals(account: AccountType, strategy?: Strategy) {
    return this.startedDeals.filter(
      d => d.account_id === this.getAccount(account).id && (!strategy || d.strategy === strategy),
    );
  }

  async loadAccounts() {
    console.log(new Date(), 'Loading user accounts');

    const accounts = await this.apiClient.getAccounts();

    const spotAccount = accounts.find(a => a.market_code === 'binance');
    const futuresAccount = accounts.find(a => a.market_code === 'binance_futures');

    if (!spotAccount || !futuresAccount) {
      throw new Error('User accounts are not initialized!');
    }

    this.accountMap.set(AccountType.BINANCE_SPOT, spotAccount);
    this.accountMap.set(AccountType.BINANCE_FUTURES, futuresAccount);

    console.log(
      new Date(),
      'User accounts were loaded',
      accounts.map(({ id, name, market_code }) => ({ id, name, market_code })),
    );
  }

  getAccount(accountType: AccountType): Account {
    const account = this.accountMap.get(accountType);

    if (!account) {
      console.log(new Date(), 'Requested account not found', accountType);
      throw new InternalServerErrorException('Account not found');
    }

    return account;
  }

  async reloadBotInfo(bots: BotType[], botIdsToReload: number[]): Promise<BotFullType[]> {
    botIdsToReload = [...new Set(botIdsToReload)];

    return (
      await Promise.all<BotFullType>(
        bots.map(bot =>
          botIdsToReload.includes(bot.id)
            ? this.apiClient.getBotExtendedInfo(bot.id)
            : { ...bot, active_deals: bot.active_deals || [] },
        ),
      )
    ).sort((botA, botB) => {
      const transformer = (bot: BotType) => Number.parseInt(bot.name.replace(/[^\d]/gim, ''));

      return transformer(botA) > transformer(botB) ? 1 : -1;
    });
  }

  async loadBotInfo(account: AccountType): Promise<BotFullType[]> {
    const signalBotIds = (
      this.configService.get(
        account === AccountType.BINANCE_FUTURES
          ? 'BINANCE_FUTURES_SIGNAL_BOTS'
          : 'BINANCE_SPOT_SIGNAL_BOTS',
      ) || ''
    )
      .split(',')
      .map(x => Number.parseInt(x));

    const generalInfoBots = (
      await this.apiClient.getBots({ account_id: this.getAccount(account).id })
    ).filter(b => signalBotIds.includes(b.id));

    const bots = await this.reloadBotInfo(
      generalInfoBots,
      generalInfoBots.filter(b => b.active_deals_count).map(b => b.id),
    );

    await this.syncDeals(this.getActiveDeals(bots));

    return bots;
  }

  isBotAvailableForSignal(bot: BotType, signal: SignalDto) {
    return (
      bot.is_enabled &&
      bot.account_id === this.getAccount(signal.account).id &&
      bot.max_active_deals - bot.active_deals_count > 0 &&
      bot.strategy === signal.strategy
    );
  }

  checkBotReadinessToStart(bot: BotType, signal: SignalDto) {
    if (this.isBotAvailableForSignal(bot, signal)) {
      return true;
    }

    console.log(
      new Date(),
      'Bot is not allowed to start deal',
      JSON.stringify({ signal, bot: this.remapBot(bot) }),
    );

    throw new ConflictException('Impossible to start bot');
  }

  async startBot(bot: BotType, signal: SignalDto) {
    console.log(
      new Date(),
      'Starting new deal',
      JSON.stringify({ signal, bot: this.remapBot(bot) }),
    );

    this.checkBotReadinessToStart(bot, signal);

    this.signalService.removeSignals(signal.pair, signal.account, signal.strategy);

    if (bot.pairs.length === 1 && !bot.pairs.includes(signal.pair)) {
      bot = await this.apiClient.changeBotPair(bot, signal.pair);

      console.log(new Date(), 'Changed bot', this.formatBotEntity(bot));

      this.checkBotReadinessToStart(bot, signal);
    }

    const deal = await this.apiClient.startDealWithBot(bot.id, signal.pair);

    console.log(new Date(), 'Started new deal', this.remapDeal(deal));

    this.startedDeals.push(deal);
  }

  async syncDeals(activeDeals: DealType[]) {
    const uniqueAccountIds = [...new Set(activeDeals.map(d => d.account_id))];
    if (uniqueAccountIds.length > 1) {
      console.log(new Date(), 'Impossible to sync deals from different accounts at one time');

      throw new InternalServerErrorException('Deals from different accounts are syncing');
    }
    const syncingAccountId = uniqueAccountIds[0];

    const oldDeals = [...this.startedDeals];
    this.startedDeals = [
      ...this.startedDeals.filter(d => d.account_id !== syncingAccountId),
      ...activeDeals,
    ];

    this.additionalInvesting = this.additionalInvesting.filter(ai =>
      this.startedDeals.find(d => d.id === ai.dealId),
    );

    const finishedDeals = oldDeals.filter(
      oldDeal => !this.startedDeals.find(d => d.id === oldDeal.id),
    );

    if (finishedDeals.length) {
      console.log(
        new Date(),
        'Detected finished deals',
        JSON.stringify(finishedDeals.map(this.remapDeal)),
      );
      const reloadedFinishedDeals = await Promise.all(
        finishedDeals.map(d => this.apiClient.getDeal(d.id)),
      );
      this.investingHistory = this.investingHistory.filter(
        i => !finishedDeals.find(d => d.id === i.dealId),
      );

      reloadedFinishedDeals.forEach(d => {
        console.log(new Date(), 'Finished deal result', {
          ...this.remapDeal(d),
          finishedAt: d.closed_at || d.updated_at,
          tp: d.final_profit_percentage,
          profit: d.actual_profit,
          status: d.status,
        });

        if (d.status.toLowerCase().includes('stop_loss')) {
          this.signalService.blacklistPair(d.pair);
        }
      });
    }
  }

  async finishProfitableDealsASAP(signals: SignalDto[], bots: BotType[]): Promise<BotFullType[]> {
    const freshDealAge = 45 * 60 * 1000; // 45 min

    const freeBots = bots.filter(
      b => b.is_enabled && b.max_active_deals - b.active_deals_count > 0,
    );
    const activeDeals = this.getActiveDeals(bots).filter(d => d.strategy === Strategy.LONG); // todo update for short

    const updatedDeals = (
      await Promise.all<DealType | void>(
        activeDeals.map(async deal => {
          const mightBeReplacedWithSamePair = signals.some(
            s => s.pair === deal.pair && this.getAccount(s.account).id === deal.account_id,
          );
          const mightBeReplacedWithNewPair =
            signals.some(
              s =>
                s.pair !== deal.pair &&
                this.getAccount(s.account).id === deal.account_id &&
                s.strategy === deal.strategy,
            ) &&
            !freeBots.some(b => b.account_id === deal.account_id && b.strategy === deal.strategy); // no free bots

          const isStartedLately =
            new Date(deal.created_at).getTime() + freshDealAge > new Date().getTime();

          const completedSO =
            deal.completed_safety_orders_count + deal.completed_manual_safety_orders_count;
          const { tp, ttp } =
            completedSO <= 1 && isStartedLately // do not change tp for new deals, because in most times they finish fast
              ? { tp: deal.take_profit, ttp: deal.trailing_deviation }
              : this.finishBotProfitMap.get(completedSO);

          if (
            this.isPercentageGreater(deal.actual_profit_percentage, tp) && // is profitable
            this.isPercentageGreater(deal.take_profit, deal.actual_profit_percentage) && // trailing tp is not activated yet
            this.isPercentageGreater(deal.take_profit, tp) && // old tp is higher
            (mightBeReplacedWithSamePair || mightBeReplacedWithNewPair)
          ) {
            console.log(
              new Date(),
              'Changing TP to start new bot with new pair and close deal ASAP',
              JSON.stringify({ deal: this.remapDeal(deal), newTP: tp, newTTP: tp }),
            );

            return this.apiClient.updateDeal(deal.id, {
              take_profit: tp,
              ...(deal.trailing_enabled ? { trailing_deviation: ttp } : {}),
            });
          }
        }),
      )
    ).filter(Boolean) as DealType[];

    return this.reloadBotInfo(
      bots,
      updatedDeals.map(d => d.bot_id),
    );
  }

  async processNewSignals(signals: SignalDto[], bots: BotType[]) {
    const activeDeals = this.getActiveDeals(bots);
    let freeBots = bots.filter(b => b.is_enabled && b.max_active_deals - b.active_deals_count > 0);
    const newSignals = signals
      .filter(
        s => !activeDeals.find(d => d.pair === s.pair) && (activeDeals.length <= 4 || s.isStrong),
      )
      .sort((signalA, signalB) => (signalA.isStrong ? -1 : signalB.isStrong ? 1 : 0));

    if (!newSignals.length || !freeBots.length) {
      return;
    }

    console.log(new Date(), 'Possible signals', JSON.stringify(newSignals));

    for (let i = 0; i < newSignals.length; i++) {
      const signal = newSignals[i];
      const readyBots = freeBots
        .filter(b => this.isBotAvailableForSignal(b, signal))
        .sort((botA, botB) =>
          this.isAmountGreater(botA.base_order_volume, botB.base_order_volume)
            ? -1
            : this.isAmountLess(botA.base_order_volume, botB.base_order_volume)
            ? 1
            : 0,
        );

      if (readyBots.length) {
        const botToStart = signal.isStrong ? readyBots.shift() : readyBots.pop();
        freeBots = freeBots.filter(
          b =>
            b.id !== botToStart.id ||
            botToStart.max_active_deals - botToStart.active_deals_count > 1,
        );

        await this.startBot(botToStart, signal);
      } else {
        console.log(
          new Date(),
          'Failed to start deal. No free bots',
          JSON.stringify({ signal, freeBots }),
        );
      }
    }
  }

  async processVeryOldProfitableDeals(bots: BotType[]): Promise<BotFullType[]> {
    const veryOldDealAge = 20 * 60 * 60 * 1000; // 20 hours
    const notSoOldDealAge = 8 * 60 * 60 * 1000; // 8 hours

    const activeDeals = this.getActiveDeals(bots);

    const updatedDeals = (
      await Promise.all(
        activeDeals.map(async deal => {
          const isOldDeal =
            new Date(deal.created_at).getTime() + notSoOldDealAge < new Date().getTime();
          if (!isOldDeal || deal.strategy !== Strategy.LONG) {
            return null;
          }

          let tpToFinish = '0.3';
          let ttpToFinish = '0.1';

          // is very old deal
          if (new Date(deal.created_at).getTime() + veryOldDealAge < new Date().getTime()) {
            tpToFinish = '0.15';
            ttpToFinish = '0.08';
          }

          if (
            !this.isPercentageGreater(deal.actual_profit_percentage, tpToFinish) || // is not profitable
            !this.isPercentageGreater(deal.take_profit, tpToFinish) // current TP is not greater then desired new
          ) {
            return null;
          }

          // todo add strong strategies
          // todo save original signal with started deal
          // todo add stochastic cross less condition for shit tokens
          // todo move trades to spot
          // todo deploy to digital ocean or anything like it

          console.log({
            p: deal.pair,
            isOldDeal,
            tpToFinish,
            ttpToFinish,
            tp: deal.take_profit,
            atp: deal.actual_profit_percentage,
          });

          console.log(
            new Date(),
            'Finishing very old profitable deal',
            JSON.stringify({ deal: this.remapDeal(deal), newTp: tpToFinish, newTtp: ttpToFinish }),
          );

          return await this.apiClient.updateDeal(deal.id, {
            take_profit: tpToFinish,
            ...(deal.trailing_enabled ? { trailing_deviation: ttpToFinish } : {}),
          });
        }),
      )
    ).filter(Boolean);

    return this.reloadBotInfo(
      bots,
      updatedDeals.map(d => d.bot_id),
    );
  }

  async processOldDeals(bots: BotType[]): Promise<BotFullType[]> {
    const oldDealAge = 3 * 60 * 60 * 1000; // 3 hours

    const activeOldDeals = this.getActiveDeals(bots).filter(
      d =>
        d.strategy === Strategy.LONG &&
        new Date(d.created_at).getTime() + oldDealAge < new Date().getTime(),
    );

    const updatedDeals = (
      await Promise.all<DealType | void>(
        activeOldDeals.map(async deal => {
          const completedSO =
            deal.completed_safety_orders_count + deal.completed_manual_safety_orders_count;
          const { tp, ttp } = this.finishBotProfitMap.get(completedSO);

          if (this.isPercentageGreater(deal.take_profit, tp)) {
            console.log(
              new Date(),
              'Changing tp for old deal no matter is it profitable or not',
              JSON.stringify({ deal: this.remapDeal(deal), newTp: tp, newTtp: ttp }),
            );

            return await this.apiClient.updateDeal(deal.id, {
              take_profit: tp,
              ...(deal.trailing_enabled ? { trailing_deviation: ttp } : {}),
            });
          }
        }),
      )
    ).filter(Boolean) as DealType[];

    return this.reloadBotInfo(
      bots,
      updatedDeals.map(d => d.bot_id),
    );
  }

  async processInvestingSignals(signals: SignalDto[], bots: BotType[]) {
    const activeDeals = this.getActiveDeals(bots);
    const autoInvesting: Investing[] = activeDeals
      .filter(
        d =>
          !this.additionalInvesting.find(ai => ai.dealId === d.id) &&
          // todo return conditions
          // !d.completed_manual_safety_orders_count &&
          this.isDealOld(d),
      )
      .map(d => ({ dealId: d.id, pair: d.pair, volume: d.bought_volume }));

    const investing = [...autoInvesting, ...this.additionalInvesting];

    const investingSignals = investing.filter(i => {
      const deal = activeDeals.find(d => d.id === i.dealId);

      // todo use constraints
      // return deal;
      return (
        deal &&
        signals.find(
          signal =>
            signal.pair === deal.pair &&
            deal.account_id === this.getAccount(signal.account).id &&
            deal.strategy === signal.strategy,
        )
      );
    });

    if (investingSignals.length) {
      console.log(new Date(), 'Found investing signals', JSON.stringify(investingSignals));

      await Promise.all(
        investingSignals.map(async ai => {
          const fundingInfo = await this.apiClient.getAddingFundsInfo(ai.dealId);
          const matchingDeal = activeDeals.find(d => d.id === ai.dealId);

          console.log(
            new Date(),
            'Start funding',
            JSON.stringify({
              fundingInfo,
              // matchingDeal,
              order: this.getLimitInvestingOrder(200, fundingInfo),
            }),
          );
          //           if (/0\.[\d]*1/gim.test(lotStep) && Number.parseFloat(lotStep) < 1) {
          //             const lotPrecision = lotStep.length - 2;
          //             const lotSize = currencyJS(calculatedLotSize).format({ precision: lotPrecision, separator: '', symbol: '', decimal: '.' })
          //
          //             // await this.apiClient.addingFunds(ai.dealId, { isMarket: true, quantity: })
          //           } else {
          //             console.log(new Date(), 'Unknown lot size', fundingInfo);
          //           }
        }),
      );

      // todo add funds
      // todo remove from investing queue
      // todo make investment automatic
    }
  }

  async checkSpotDeals() {
    this.checkSpotCounter++;

    const signals = this.signalService.getSignals(AccountType.BINANCE_SPOT);

    signals.length && console.log(new Date(), 'All signals', JSON.stringify(signals));

    // todo do not request 3commas unnecessary if anyway it is nothing to start
    if (!signals.length && this.checkSpotCounter % 5 !== 1) {
      return;
    }

    let bots = await this.loadBotInfo(AccountType.BINANCE_SPOT);

    // todo split by long/short
    bots = await this.processVeryOldProfitableDeals(bots);
    bots = await this.processOldDeals(bots);
    bots = await this.finishProfitableDealsASAP(signals, bots);

    // todo remove SO and shift SL when deal is running long

    await this.processNewSignals(this.signalService.getSignals(AccountType.BINANCE_SPOT), bots);

    await this.processInvestingSignals(
      this.signalService.getSignals(AccountType.BINANCE_SPOT),
      bots,
    );
  }

  async scheduleAdditionalInvesting(payload: DelayedInvestDto) {
    console.log(new Date(), 'Scheduling investing', JSON.stringify(payload));

    let matchingDeal: DealType;

    if (payload.dealId) {
      matchingDeal = this.startedDeals.find(d => d.id === payload.dealId);
    } else if (payload.pair && payload.account && payload.strategy) {
      matchingDeal = this.startedDeals.find(
        d =>
          d.pair === payload.pair &&
          d.account_id === this.getAccount(payload.account).id &&
          d.strategy === payload.strategy,
      );
    }

    if (!matchingDeal) {
      console.log(new Date(), 'Failed to schedule investing', JSON.stringify(payload));

      throw new NotFoundException('Appropriate deal not found');
    }

    const additionalInvestingInfo = {
      dealId: matchingDeal.id,
      pair: matchingDeal.pair,
      volume: currencyJS(payload.amount).toString(),
      createdAt: new Date(),
    };

    this.additionalInvesting = this.additionalInvesting.filter(
      ai => ai.dealId !== additionalInvestingInfo.dealId,
    );
    this.additionalInvesting.push(additionalInvestingInfo);

    console.log(
      new Date(),
      'Scheduled investing successfully',
      JSON.stringify({ ai: this.additionalInvesting, deal: this.remapDeal(matchingDeal), payload }),
    );

    return true;
  }

  getLimitInvestingOrder(
    desiredVolume: string | number,
    fundingInfo: AddingFunds,
  ): { qty: string; price: string } {
    const correctedAmount = (amount: string | currencyJS, step: string): currencyJS => {
      return currencyJS(Math.floor(currencyJS(amount).divide(step).value)).multiply(step);
    };

    const orderPrice = correctedAmount(fundingInfo.orderbook_price, fundingInfo.limits.priceStep);
    const orderQuantity = correctedAmount(
      currencyJS(desiredVolume).divide(orderPrice),
      fundingInfo.limits.lotStep,
    );
    const orderVolume = orderQuantity.multiply(orderPrice);

    const pricePrecision =
      fundingInfo.limits.priceStep.length -
      (fundingInfo.limits.priceStep.indexOf('0.') === 0 ? 2 : 0);
    const qtyPrecision =
      fundingInfo.limits.lotStep.length - (fundingInfo.limits.lotStep.indexOf('0.') === 0 ? 2 : 0);

    console.log({ pair: fundingInfo.pair, pricePrecision, qtyPrecision });

    if (
      // this.isAmountLess(fundingInfo.available_amount, 2000) || // todo get from config minimal investing reserve
      this.isAmountLess(orderQuantity, fundingInfo.limits.minLotSize) ||
      this.isAmountGreater(orderQuantity, fundingInfo.limits.maxLotSize) ||
      this.isAmountLess(orderPrice, fundingInfo.limits.minPrice) ||
      this.isAmountGreater(orderPrice, fundingInfo.limits.maxPrice) ||
      this.isAmountLess(orderVolume, fundingInfo.limit)
    ) {
      return { qty: this.formatAmount(0), price: this.formatAmount(orderPrice, pricePrecision) };
    }

    return {
      qty: this.formatAmount(orderQuantity, qtyPrecision),
      price: this.formatAmount(orderPrice, pricePrecision),
    };
  }

  formatAmount = (amount: currencyJS | string | number, precision = 4) => {
    console.log(currencyJS(amount).format({ precision, separator: '', symbol: '', decimal: '.' }));

    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      useGrouping: false,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(currencyJS(amount).value);
  };
  isAmountLess = (amountA: currencyJS | string | number, amountB: currencyJS | string | number) =>
    currencyJS(amountA).subtract(amountB).value < 0;
  isAmountGreater = (
    amountA: currencyJS | string | number,
    amountB: currencyJS | string | number,
  ) => currencyJS(amountA).subtract(amountB).value > 0;

  isPercentageGreater = (percentageA: string, percentageB: string) => {
    return (
      Math.round(Number.parseFloat(percentageA) * 100) >
      Math.round(Number.parseFloat(percentageB) * 100)
    );
  };

  getActiveDeals = (bots: BotType[]): DealType[] =>
    bots.reduce((deals, bot) => [...deals, ...bot.active_deals], []);

  isDealOld = (deal: DealType) =>
    new Date(deal.created_at).getTime() + 3 * 60 * 60 * 1000 < new Date().getTime();

  formatBotEntity = bot => JSON.stringify(this.remapBot(bot));

  remapBot = ({
    id,
    name,
    pairs,
    strategy,
    is_enabled,
    active_deals_count,
    active_deals,
  }: BotType) => ({
    id,
    name,
    pairs,
    strategy,
    isEnabled: is_enabled,
    activeDealsCount: active_deals_count,
    activeDeals: active_deals && active_deals.map(this.remapDeal),
  });

  remapDeal = ({
    id,
    pair,
    strategy,
    bot_name,
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
    strategy,
    botName: bot_name,
    createdAt: created_at,
    age:
      Math.floor(
        ((new Date().getTime() - new Date(created_at).getTime()) / (1000 * 60 * 60)) * 100,
      ) / 100,
    completedSafetyOrdersCount: completed_safety_orders_count,
    completedManualSafetyOrdersCount: completed_manual_safety_orders_count,
    actualProfitPercentage: actual_profit_percentage,
    takeProfitPercentage: take_profit,
    boughtPrice: bought_average_price,
    currentPrice: current_price,
    takeProfitPrice: take_profit_price,
  });
}
