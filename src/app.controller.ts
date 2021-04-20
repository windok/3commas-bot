import { plainToClass } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AppService } from './app.service';
import { SignalDto } from './interfaces/signal.dto';
import { DelayedInvestDto } from './interfaces/delayed-invest.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('trading-view-signal')
  async receiveSignal(@Body() payload: Object) {
    try {
      await validateOrReject(plainToClass(SignalDto, payload));
    } catch (e) {
      console.log(new Date(), 'Incorrect signal payload', JSON.stringify(e));

      throw new BadRequestException(e);
    }

    return this.appService.receiveTradingviewSignal(payload as SignalDto);
  }

  @Post('delayed-add-funds')
  async scheduleAddingFunds(@Body() payload: DelayedInvestDto) {
    return this.appService.scheduleAdditionalInvesting(payload);
  }
}
