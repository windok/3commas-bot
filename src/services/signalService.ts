import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { AccountType, Strategy } from '../interfaces/meta';
import { SignalDto } from '../interfaces/signal.dto';

@Injectable()
export default class SignalService {
  private readonly SIGNAL_OUTDATE_PERIOD = 2.5 * 60 * 1000; // 2.5 min
  private readonly BLACKLIST_PERIOD = 3 * 60 * 60 * 1000; // 3 hours

  // todo move to db
  private receivedSignals: Array<SignalDto> = [];
  private blacklistPairs: Array<{ pair: string; from: Date }> = [];

  constructor(private readonly configService: ConfigService) {}

  addSignal(signal: SignalDto) {
    this.receivedSignals.push(signal);
  }

  removeSignals(pair: string, account: AccountType, strategy?: Strategy) {
    this.receivedSignals = this.receivedSignals.filter(
      s => s.pair !== pair || s.account !== account || (strategy && s.strategy !== strategy),
    );
  }

  getSignals(account: AccountType) {
    if (this.blacklistPairs.length) {
      console.log(new Date(), 'Blacklisted pairs', JSON.stringify(this.blacklistPairs));
    }

    const sortedSignals = this.receivedSignals
      .filter(
        s => s.account === account && s.strategy === Strategy.LONG && !this.isSignalBlacklisted(s), // todo both short and long
      )
      .sort((signalA, signalB) =>
        new Date(signalA.time).getTime() < new Date(signalB.time).getTime() ? 1 : -1,
      );

    const uniqueSignals = [];
    sortedSignals.forEach(signalCandidate => {
      if (!uniqueSignals.find(s => s.pair === signalCandidate.pair)) {
        uniqueSignals.push(signalCandidate);
      }
    });

    return uniqueSignals;
  }

  isSignalBlacklisted(signal: SignalDto) {
    return !!this.blacklistPairs.find(({ pair }) => signal.pair === pair);
  }

  blacklistPair(pair: string) {
    return this.blacklistPairs.push({ pair, from: new Date() });
  }

  @Interval(30 * 1000) // each 30 sec
  clearOutdatedSignals() {
    this.receivedSignals = this.receivedSignals.filter(
      s => new Date(s.time).getTime() + this.SIGNAL_OUTDATE_PERIOD >= new Date().getTime(),
    );
  }

  @Interval(5 * 60 * 1000) // each 5 min
  clearBlacklistSignals() {
    this.blacklistPairs = this.blacklistPairs.filter(
      bp => new Date(bp.from).getTime() + this.BLACKLIST_PERIOD >= new Date().getTime(),
    );
  }
}
