import { DealType } from './deal';

export interface BotType {
  id: number;
  is_enabled: boolean;
  name: string;
  account_name: string;
  pairs: string[];
  account_id: number;
  created_at: string;
  type: 'Bot::MultiBot' | 'Bot::SingleBot' | 'Bot::SwitchBot';
  strategy: 'long' | 'short';
  strategy_list: Array<string>; // todo parse json
  updated_at: string;

  base_order_volume: string;
  base_order_volume_type: 'quote_currency' | 'base_currency' | 'percent' | 'xbt';
  start_order_type: 'limit' | 'market';

  leverage_type: 'custom' | 'cross' | 'isolated' | 'not_specified';
  leverage_custom_value?: string;

  safety_order_volume: string;
  safety_order_step_percentage: string;
  safety_order_volume_type: 'quote_currency' | 'base_currency' | 'percent' | 'xbt';
  martingale_volume_coefficient: string;
  martingale_step_coefficient: string;

  max_active_deals: number;
  max_safety_orders: number;
  active_deals_count: number;
  active_safety_orders_count: number;

  'deletable?': boolean;

  take_profit: string;
  take_profit_type: 'base' | 'total';
  profit_currency: 'quote_currency' | 'base_currency';
  trailing_enabled: boolean;
  trailing_deviation: string;

  stop_loss_percentage: string;
  stop_loss_type: 'stop_loss' | 'stop_loss_and_disable_bot';
  tsl_enabled: boolean;
  stop_loss_timeout_enabled: boolean;
  stop_loss_timeout_in_seconds: number;

  deals_counter: number;

  cooldown: string;
  min_volume_btc_24h: string;
  min_price: string;
  max_price: string;
  deal_start_delay_seconds: number;
  disable_after_deals_count: number;
  allowed_deals_on_same_pair: number;
  easy_form_supported: boolean;

  finished_deals_profit_usd: string;
  finished_deals_count: string;

  active_deals?: DealType[];
}

export interface BotFullType extends BotType {
  active_deals: DealType[];
}
