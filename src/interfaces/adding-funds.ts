export interface AddingFundsLimits {
  priceStep: string; //           "0.001",
  minLotSize: string; //          "0.1",
  maxLotSize: string; //          "10000000.0",
  lotStep: string; //             "0.1",
  maxMarketBuyAmount: string; //  "50000.0",
  maxMarketSellAmount: string; // "50000.0",
  minMarketSellAmount: string; // "0.1",
  minTotal: string; //            "5.0",
  priceMultiplierUp: string; //   "1.15",
  priceMultiplierDown: string; // "0.85",
  minPrice: string; //            "0.001",
  maxPrice: string; //            "152.473",
  marketBuyMinTotal: string; //   "5.0"
}

export interface AddingFunds {
  available_amount: string; // '1405.55422375';
  market_supported: boolean;
  adding_funds_currency: string;

  orderbook_price: string; // looks like current market value
  price_per_one_unit_strategy_name: 'orderbook_price'; // todo log other variants
  limits: AddingFundsLimits;
  min_lot_size: string; // '0.10000000';
  market_buy_min_total: string; // '5.0';

  is_contract: true;
  limit: '5.00000000';

  // deal info
  account_id: number;
  account_type: string;
  deal_type: 'long' | 'short';
  pair: string;
  quote_currency: string;
  base_currency: string;
  take_profit_price: string;
  stop_loss_price?: string;
  leverage_custom_value: null;
}
