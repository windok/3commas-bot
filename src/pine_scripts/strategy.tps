// Strategy
longProfitPerc = input(title="Long Take Profit (%)", type=input.float, minval=0.0, step=0.1, defval=1) * 0.01
stopLossPerc = input(title="Long Stop Loss (%)", type=input.float, minval=0.0, step=0.1, defval=5) * 0.01

buySignal = uoBelowLine ? 1 : na
float longExitPrice  = strategy.position_avg_price * (1 + longProfitPerc)
float stopLossExitPrice  = strategy.position_avg_price * (1 - stopLossPerc)

float firstPositionQty = 25.0

int filledOrders = 0
float filledTotalVolume = 0.0
float lastPosition = 0.0
for i = 0 to 8
    if (filledTotalVolume < strategy.position_size)
        filledOrders := filledOrders + 1
        lastPosition := firstPositionQty * pow(1.5, i)
        filledTotalVolume := filledTotalVolume + lastPosition

    if (filledTotalVolume >= strategy.position_size)
        break

float buyMoreQty = lastPosition * 1.5
float buyMorePrice = strategy.position_avg_price * (100 - strategy.position_size / lastPosition) * 0.01

plot(strategy.position_size, color=color.yellow, linewidth = 3)
plot(buyMoreQty, color=color.maroon, linewidth = 3)
plot(lastPosition, color=color.orange, linewidth = 2)

plot(strategy.position_avg_price, color=color.black, linewidth = 1)
// plot(buyMorePrice, color=color.silver, linewidth = 3)
plot(stopLossExitPrice, color=color.blue, linewidth = 1)
// plot(strategy.opentrades, color=color.black)


strategy.entry("Long", strategy.long, firstPositionQty, when = buySignal and strategy.position_size == 0)

if (filledOrders < 10)
    strategy.entry("Long " + tostring(filledOrders), strategy.long, buyMoreQty, limit = buyMorePrice)


if (strategy.position_size > 0)
    strategy.exit(id="XL TP", limit=longExitPrice, stop=stopLossExitPrice)
