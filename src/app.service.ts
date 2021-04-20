import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import ThreeCommasClient from './services/threeCommasClient';
import ThreeCommasManager from './services/threeCommasManager';
import SignalService from './services/signalService';
import { TOO_MANY_REQUESTS_ERROR } from './interfaces/errors';
import { AccountType } from './interfaces/meta';
import { SignalDto } from './interfaces/signal.dto';
import { DelayedInvestDto } from './interfaces/delayed-invest.dto';

const CHECK_DEALS_TIMEOUT = 'CHECK_DEALS_TIMEOUT';

@Injectable()
export class AppService {
  private checkDealsTimeout: number;
  private extendedCheckDealsTimeout: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly threeCommasClient: ThreeCommasClient,
    private readonly threeCommasManager: ThreeCommasManager,
    private readonly signalService: SignalService,
  ) {}

  async onApplicationBootstrap() {
    this.checkDealsTimeout = Number.parseInt(this.configService.get('CHECK_DEALS_TIMEOUT'));
    this.extendedCheckDealsTimeout = Number.parseInt(
      this.configService.get('TOO_MANY_REQUESTS_TIMEOUT'),
    );

    await this.threeCommasManager.loadAccounts();
    await this.threeCommasManager.loadBotInfo(AccountType.BINANCE_FUTURES);
    await this.threeCommasManager.loadBotInfo(AccountType.BINANCE_SPOT);

    await this.checkDeals();
  }

  // todo update accounts info time from time

  clearCheckingDealTimeout = () => {
    if (this.schedulerRegistry.doesExists('timeout', CHECK_DEALS_TIMEOUT)) {
      clearTimeout(this.schedulerRegistry.getTimeout(CHECK_DEALS_TIMEOUT));

      this.schedulerRegistry.deleteTimeout(CHECK_DEALS_TIMEOUT);
    }
  };

  scheduleCheckingDeals = (checkDealsTimeout: number) => {
    this.clearCheckingDealTimeout();

    const checkDealsTimeoutId = setTimeout(this.checkDeals.bind(this), checkDealsTimeout * 1000);

    this.schedulerRegistry.addTimeout(CHECK_DEALS_TIMEOUT, checkDealsTimeoutId);
  };

  async checkDeals() {
    this.clearCheckingDealTimeout();

    let checkDealsTimeout = this.checkDealsTimeout;

    try {
      await this.threeCommasManager.checkFuturesDeals();
    } catch (e) {
      console.log(new Date(), 'Error checking bots', e && e.message, JSON.stringify(e));

      if (e.message === TOO_MANY_REQUESTS_ERROR) {
        checkDealsTimeout = this.extendedCheckDealsTimeout;
      }
    }

    this.scheduleCheckingDeals(checkDealsTimeout);
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
    const activeDeals = this.threeCommasManager.getStartedDeals(signal.account, signal.strategy);

    // add signal only when there is no fresh deal for the same signal
    if (
      activeDeals.find(
        d =>
          d.pair === signal.pair &&
          new Date(d.created_at).getTime() + 4 * 60 * 1000 > new Date().getTime(),
      )
    ) {
      console.log(
        new Date(),
        'Skipping signal because there is already fresh deal running',
        JSON.stringify(signal),
      );
    } else {
      this.signalService.addSignal(signal);
    }
  }

  async scheduleAdditionalInvesting(payload: DelayedInvestDto) {
    return this.threeCommasManager.scheduleAdditionalInvesting(payload);
  }
}
