//@version=4
strategy(title="Bollinger Band with RSI", shorttitle="BB&RSI", format=format.price, precision=2, pyramiding=50, initial_capital=10000, calc_on_order_fills=false, calc_on_every_tick=true, default_qty_type=strategy.cash, default_qty_value=1000, currency="USD")
len = input(14, minval=1, title="Length")
src = input(close, "Source", type = input.source)
up = rma(max(change(src), 0), len)
down = rma(-min(change(src), 0), len)
rsi = down == 0 ? 100 : up == 0 ? 0 : 100 - (100 / (1 + up / down))
plot(rsi, "RSI", color=#8E1599)
band1 = hline(70, "Upper Band", color=#C0C0C0)
band0 = hline(30, "Lower Band", color=#C0C0C0)
fill(band1, band0, color=#9915FF, transp=90, title="Background")

length_bb = input(20,title="BB Length", minval=1)
mult = input(2.0, minval=0.001, maxval=50, title="BB StdDev")
basis = sma(src, length_bb)
dev = mult * stdev(src, length_bb)
upper = basis + dev
lower = basis - dev
offset = input(0, "BB Offset", type = input.integer, minval = -500, maxval = 500)


Plot_PnL = input(title="Plot Cummulative PnL", type=input.bool, defval=false)
Plot_Pos = input(title="Plot Current Position Size", type=input.bool, defval=false)

long_tp_inp = input(10, title='Long Take Profit %', step=0.1)/100
long_sl_inp = input(25, title='Long Stop Loss %', step=0.1)/100
// Take profit/stop loss
long_take_level = strategy.position_avg_price * (1 + long_tp_inp)
long_stop_level = strategy.position_avg_price * (1 - long_sl_inp)

entry_long = rsi < 30 and src < lower
exit_long = rsi > 70

plotshape(entry_long, style=shape.labelup, color=color.green,  location=location.bottom, text="L", textcolor=color.white, title="LONG_ORDER")
plotshape(exit_long, style=shape.labeldown, color=color.red,  location=location.top, text="S", textcolor=color.white, title="SHORT_ORDER")

strategy.entry("Long",true,when=entry_long)
strategy.exit("TP/SL","Long", limit=long_take_level, stop=long_stop_level)
strategy.close("Long", when=exit_long, comment="Exit")
plot(Plot_PnL ? strategy.equity-strategy.initial_capital : na, title="PnL", color=color.red)
plot(Plot_Pos ? strategy.position_size : na, title="open_position", color=color.fuchsia)
