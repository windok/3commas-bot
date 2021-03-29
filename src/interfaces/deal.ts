export interface DealType {
  id: number;
  pair: string;
  status:
    | 'created'
    | 'base_order_placed'
    | 'bought'
    | 'cancelled'
    | 'completed'
    | 'failed'
    | 'panic_sell_pending'
    | 'panic_sell_order_placed'
    | 'panic_sold'
    | 'cancel_pending'
    | 'stop_loss_pending'
    | 'stop_loss_finished'
    | 'stop_loss_order_placed'
    | 'switched'
    | 'switched_take_profit'
    | 'ttp_activated'
    | 'ttp_order_placed'
    | 'liquidated'
    | 'bought_safety_pending'
    | 'bought_take_profit_pending'
    | 'settled';
  type: string;
  bot_id?: number;
  bot_name?: string;
  account_id: number;
  account_name: string;
  strategy: 'short' | 'long';
  created_at: string;
  updated_at: string;
  closed_at?: string;
  'finished?': boolean;
  base_order_volume: string;
  base_order_volume_type: 'quote_currency' | 'base_currency' | 'percent' | 'xbt';
  safety_order_volume: string;
  safety_order_volume_type: 'quote_currency' | 'base_currency' | 'percent' | 'xbt';
  safety_order_step_percentage: string;
  max_safety_orders: number;
  martingale_coefficient: string;
  martingale_volume_coefficient: string;
  martingale_step_coefficient: string;
  active_safety_orders_count: number;
  current_active_safety_orders_count: number;
  current_active_safety_orders: number;
  completed_safety_orders_count: number;
  completed_manual_safety_orders_count: number;
  'cancellable?': boolean;
  'panic_sellable?': boolean;
  take_profit: string;
  trailing_enabled: boolean;
  trailing_deviation: string;
  trailing_max_price: string;
  tsl_enabled: boolean;
  tsl_max_price: string;
  stop_loss_percentage: string;
  stop_loss_type: 'stop_loss' | 'stop_loss_and_disable_bot';
  stop_loss_timeout_enabled: boolean;
  stop_loss_timeout_in_seconds: number;
  active_manual_safety_orders: number;
  bought_amount: string;
  bought_volume: string;
  bought_average_price: string;
  sold_amount: string;
  sold_volume: string;
  sold_average_price: string;
  take_profit_type: 'base' | 'total';
  final_profit: string;
  profit_currency: 'quote_currency' | 'base_currency';
  from_currency: string;
  to_currency: string;
  current_price: string;
  take_profit_price: string;
  stop_loss_price?: string;
  final_profit_percentage: string;
  actual_profit_percentage: string;
  usd_final_profit: string;
  actual_profit: string;
  actual_usd_profit: string;
  deal_has_error: boolean;
  error_message: string;
  failed_message?: string;
  reserved_base_coin: string;
  reserved_second_coin: string;
}
