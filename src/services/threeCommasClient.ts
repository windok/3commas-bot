import * as crypto from 'crypto';
import * as querystring from 'querystring';
import { ParsedUrlQueryInput } from 'querystring';
import { Injectable, HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TOO_MANY_REQUESTS_ERROR, THREE_COMMAS_REQUEST_ERROR } from '../interfaces/errors';
import { DealType } from '../interfaces/deal';
import { AccountType } from '../interfaces/account';
import { BotType, BotFullType } from '../interfaces/bot';

const API_URL = 'https://api.3commas.io';

@Injectable()
export default class ThreeCommasClient {
  private readonly url: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService, // private readonly logger: Logger,
  ) {
    this.url = configService.get('3COMMAS_API_URL') || API_URL;
    this.apiKey = configService.get('3COMMAS_API_KEY') || '';
    this.apiSecret = configService.get('3COMMAS_API_KEY_SECRET') || '';
  }

  generateSignature(requestUri: string, requestData: string) {
    const request = requestUri + requestData;

    return crypto.createHmac('sha256', this.apiSecret).update(request).digest('hex');
  }

  async makeRequest<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    params?: ParsedUrlQueryInput,
  ): Promise<T> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('3commas client missing API key or secret');
    }

    try {
      const response = await this.httpService
        .request({
          method,
          baseURL: this.url,
          url: path,
          params,
          timeout: 30000,
          headers: {
            APIKEY: this.apiKey,
            Signature: this.generateSignature(path, params ? querystring.stringify(params) : ''),
          },
        })
        .toPromise();

      return response.data;
    } catch (e) {
      console.error(e, e && e.response && e.response.data);

      if (e.status === 429 || (e.response && e.response.status === 429)) {
        throw new Error(TOO_MANY_REQUESTS_ERROR);
      }

      throw new Error(THREE_COMMAS_REQUEST_ERROR);
    }
  }

  getAccounts(): Promise<AccountType[]> {
    return this.makeRequest<AccountType[]>('GET', '/public/api/ver1/accounts');
  }

  getAccountsMarketList() {
    return this.makeRequest('GET', `/public/api/ver1/accounts/market_list`);
  }

  getAccountsMarketPairs(marketCode): Promise<string[]> {
    return this.makeRequest<string[]>('GET', `/public/api/ver1/accounts/market_pairs`, {
      market_code: marketCode,
    });
  }

  getBots(searchParams = null): Promise<BotType[]> {
    return this.makeRequest('GET', `/public/api/ver1/bots`, searchParams);
  }

  getBotExtendedInfo(botId: number, includeEvents = false): Promise<BotFullType> {
    return this.makeRequest<BotFullType>('GET', `/public/api/ver1/bots/${botId}/show`, {
      include_events: includeEvents,
    });
  }

  updateBot(botId: number, botData: Partial<BotType>): Promise<BotType> {
    return this.makeRequest<BotType>('PATCH', `/public/api/ver1/bots/${botId}/update`, botData);
  }

  changeBotPair(bot: BotType, newPair: string): Promise<BotType> {
    return this.updateBot(bot.id, {
      pairs: [newPair],
      name: bot.name,
      start_order_type: bot.start_order_type,
      max_active_deals: bot.max_active_deals,
      base_order_volume: bot.base_order_volume,
      base_order_volume_type: bot.base_order_volume_type,
      safety_order_volume: bot.safety_order_volume,
      safety_order_volume_type: bot.safety_order_volume_type,
      leverage_type: bot.leverage_type,
      leverage_custom_value: bot.leverage_custom_value,
      take_profit: bot.take_profit,
      trailing_enabled: bot.trailing_enabled,
      trailing_deviation: bot.trailing_deviation,
      max_safety_orders: bot.max_safety_orders,
      martingale_volume_coefficient: bot.martingale_volume_coefficient,
      martingale_step_coefficient: bot.martingale_step_coefficient,
      active_safety_orders_count: bot.active_safety_orders_count,
      // btc_price_limit: bot.btc_price_limit,
      safety_order_step_percentage: bot.safety_order_step_percentage,
      take_profit_type: bot.take_profit_type,
      strategy_list: bot.strategy_list,
      // todo check
      // strategy_list: bot.strategy_list.map(JSON.stringify),
      min_price: bot.min_price,
      max_price: bot.max_price,
      stop_loss_percentage: bot.stop_loss_percentage,
      stop_loss_timeout_enabled: bot.stop_loss_timeout_enabled,
      stop_loss_timeout_in_seconds: bot.stop_loss_timeout_in_seconds,
      stop_loss_type: bot.stop_loss_type,
      disable_after_deals_count: bot.disable_after_deals_count,
      cooldown: bot.cooldown,
    });
  }

  startDealWithBot(botId: number, newPair: string): Promise<DealType> {
    return this.makeRequest<DealType>('POST', `/public/api/ver1/bots/${botId}/start_new_deal`, {
      ...(newPair ? { pair: newPair } : {}),
    });
  }

  updateDeal(dealId, dealData): Promise<DealType> {
    return this.makeRequest<DealType>(
      'PATCH',
      `/public/api/ver1/deals/${dealId}/update_deal`,
      dealData,
    );
  }

  ping() {
    return this.makeRequest('GET', `/public/api/ver1/ping`);
  }

  time() {
    return this.makeRequest('GET', `/public/api/ver1/time`);
  }
}