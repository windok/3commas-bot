import { Injectable, BadRequestException } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import ThreeCommasClient from './services/threeCommasClient';
import ThreeCommasManager from './services/threeCommasManager';
import { TOO_MANY_REQUESTS_ERROR } from './interfaces/errors';
import { ConfigService } from '@nestjs/config';
import { SignalDto, SignalAccount } from './interfaces/signal.dto';

const CHECK_DEALS_TIMEOUT = 'CHECK_DEALS_TIMEOUT';

@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly threeCommasClient: ThreeCommasClient,
    private readonly threeCommasManager: ThreeCommasManager,
  ) {}

  async onApplicationBootstrap() {
    await this.threeCommasManager.loadAccounts();
    await this.threeCommasManager.loadMatchingFuturesPairs();

    await this.scheduleCheckingDeals();
  }

  // todo update accounts info time from time

  async scheduleCheckingDeals() {
    if (this.schedulerRegistry.doesExists('timeout', CHECK_DEALS_TIMEOUT)) {
      this.schedulerRegistry.deleteTimeout(CHECK_DEALS_TIMEOUT);
    }
    let checkDealsTimeout = Number.parseInt(this.configService.get('CHECK_DEALS_TIMEOUT'));

    try {
      await this.checkDeals();
    } catch (e) {
      console.log(new Date(), 'Error checking bots', e && e.message, JSON.stringify(e));

      if (e.message === TOO_MANY_REQUESTS_ERROR) {
        checkDealsTimeout = Number.parseInt(this.configService.get('TOO_MANY_REQUESTS_TIMEOUT'));
      }
    }

    const checkDealsTimeoutId = setTimeout(
      this.scheduleCheckingDeals.bind(this),
      checkDealsTimeout * 1000,
    );

    this.schedulerRegistry.addTimeout(CHECK_DEALS_TIMEOUT, checkDealsTimeoutId);
  }

  async checkDeals() {
    // const { mainBot, ...botInfo } = await this.threeCommasManager.loadBotInfo();
    // let { availableSlaveBots, activeSlaveBots } = botInfo;
    //
    // const {
    //   notStartedDeals,
    //   startedDeals,
    // } = await this.threeCommasManager.getBestPossibleDealsToCopy(mainBot, activeSlaveBots);
    //
    // const isFinished = await this.threeCommasManager.finishProfitableFuturesBots(
    //   activeSlaveBots,
    //   availableSlaveBots,
    //   startedDeals.map(({ pair }) => pair),
    //   notStartedDeals.map(({ pair }) => pair),
    // );
    //
    // if (isFinished) {
    //   const updatedBotInfo = await this.threeCommasManager.loadBotInfo();
    //
    //   availableSlaveBots = updatedBotInfo.availableSlaveBots;
    //   activeSlaveBots = updatedBotInfo.activeSlaveBots;
    // }
    //
    // await Promise.all([
    //   this.threeCommasManager.recalculateTakeProfits(activeSlaveBots),
    //   this.threeCommasManager.startFutureBots(availableSlaveBots, notStartedDeals),
    // ]);
  }

  async receiveTradingviewSignal(signal: SignalDto) {
    if (signal.token !== this.configService.get('SIGNAL_SAFETY_TOKEN')) {
      console.log(new Date(), 'Incorrect signal token', JSON.stringify(signal));

      throw new BadRequestException('Incorrect security token');
    }
    if (signal.pair.indexOf('USDT_') !== 0) {
      console.log(new Date(), 'Incorrect signal pair', JSON.stringify(signal));

      throw new BadRequestException('Incorrect security pair');
    }

    console.log(new Date(), 'Received signal', JSON.stringify(signal));

    switch (signal.account) {
      case SignalAccount.BINANCE_SPOT:
        return this.threeCommasManager.startSpotSignalDeal(signal);
      case SignalAccount.BINANCE_FUTURES:
        return this.threeCommasManager.startFuturesSignalDeal(signal);
      default:
    }
  }
}
