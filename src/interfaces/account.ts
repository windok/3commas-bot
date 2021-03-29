export interface AccountType {
  id: number;
  name: string;
  exchange_name: string;
  market_code: string;
  pretty_display_type: string;
  api_key: string;
  address: string;
  created_at: string;
  updated_at: string;

  auto_balance_period: number;
  auto_balance_portfolio_id: number;
  auto_balance_currency_change_limit: number;
  autobalance_enabled: boolean;
  is_locked: boolean;
  smart_trading_supported: boolean;
  available_for_trading: boolean;
  stats_supported: boolean;
  trading_supported: boolean;
  market_buy_supported: boolean;
  market_sell_supported: boolean;
  conditional_buy_supported: boolean;
  bots_allowed: boolean;
  bots_ttp_allowed: boolean;
  bots_tsl_allowed: boolean;
  gordon_bots_available: boolean;
  multi_bots_allowed: boolean;
  last_auto_balance: string;
  fast_convert_available: boolean;
  grid_bots_allowed: boolean;
  supported_market_types: string;
  auto_balance_method: 'time' | 'currency_change';
  auto_balance_error: string;
  lock_reason: string;
  btc_amount: string;
  usd_amount: string;
  day_profit_btc: string;
  day_profit_usd: string;
  day_profit_btc_percentage: string;
  day_profit_usd_percentage: string;
  btc_profit: string;
  usd_profit: string;
  usd_profit_percentage: string;
  btc_profit_percentage: string;
  total_btc_profit: string;
  total_usd_profit: string;
}
