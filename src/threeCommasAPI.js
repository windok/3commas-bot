import querystring from 'querystring';
import crypto from 'crypto';
import fetch from 'node-fetch';

const API_URL = 'https://api.3commas.io';

class ThreeCommasAPI {
  constructor(opts = {}) {
    this._url = opts.url || API_URL;
    this._apiKey = opts.apiKey || '';
    this._apiSecret = opts.apiSecret || '';
  }

  generateSignature(requestUri, reqData) {
    const request = requestUri + reqData;
    return crypto.createHmac('sha256', this._apiSecret).
    update(request).
    digest('hex');
  }

  async makeRequest(method, path, params) {
    if (!this._apiKey || !this._apiSecret) {
      return new Error('missing api key or secret');
    }

    const sig = this.generateSignature(path, querystring.stringify(params));

    try {
      let response = await fetch(
        `${this._url}${path}${querystring.stringify(params)}`,
        {
          method: method,
          timeout: 30000,
          agent: '',
          headers: {
            'APIKEY': this._apiKey,
            'Signature': sig,
          },
        },
      );

      return await response.json();
    } catch (e) {
      console.log(e);

      return false;
    }
  }

  getAccounts() {
    return this.makeRequest('GET', '/public/api/ver1/accounts?', null);
  }

  getAccountsMarketList() {
    return this.makeRequest('GET', `/public/api/ver1/accounts/market_list?`,
      null,
    );
  }

  getAccountsMarketPairs(marketCode) {
    return this.makeRequest(
      'GET',
      `/public/api/ver1/accounts/market_pairs?`,
      { market_code: marketCode },
    );
  }

  getBots(searchParams = null) {
    return this.makeRequest(
      'GET',
      `/public/api/ver1/bots?`,
      searchParams,
    );
  }

  getBotExtendedInfo(botId, includeEvents = false) {
    return this.makeRequest(
      'GET',
      `/public/api/ver1/bots/${botId}/show?`,
      { include_events: includeEvents },
    );
  }

  updateBot(botId, botData) {
    return this.makeRequest(
      'PATCH',
      `/public/api/ver1/bots/${botId}/update?`,
      botData,
    );
  }

  changeBotPair(bot, newPairs) {
    return this.updateBot(bot.id, {
      pairs: newPairs,
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
      btc_price_limit: bot.btc_price_limit,
      safety_order_step_percentage: bot.safety_order_step_percentage,
      take_profit_type: bot.take_profit_type,
      strategy_list: bot.strategy_list.map(JSON.stringify),
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

  startDealWithBot(botId, newPair) {
    return this.makeRequest(
      'POST',
      `/public/api/ver1/bots/${botId}/start_new_deal?`,
      {
        ...(newPair ? { pair: newPair } : {}),
      },
    );
  }

  ping() {
    return this.makeRequest(
      'GET',
      `/public/api/ver1/ping?`,
    );
  }

  time() {
    return this.makeRequest(
      'GET',
      `/public/api/ver1/time?`,
    );
  }
}

export default ThreeCommasAPI;
