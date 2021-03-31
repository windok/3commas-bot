//@version=4
strategy(title="myStrategy",
     precision=4,
     pyramiding = 10,
     initial_capital=1000,
     process_orders_on_close=true,
     calc_on_every_tick=true,
     calc_on_order_fills=true)

src = input(close, title="Source")
resolution = timeframe.period

// ------ Relative Strenght Index -------
// RSI inputs
rsiLength = input(11, minval=1, title="RSI Length")
rsiUpLine = input(80, minval=40, maxval=90, title="RSI Upper Line Value")
rsiLowLine = input(40, minval=10, maxval=60, title="RSI Lower Line Value")
// Second RSI
useSecondRsi = input(title="Second RSI", type=input.bool, defval=true)
secondRsiResolution = input(title="Second RSI Time Resolution, min", type=input.resolution, defval="120")
secondRsiLength = input(14, minval=1, title="Second RSI Length")
secondRsiUpLine = input(65, minval=10, maxval=90, title="Second RSI Upper Line Value")
secondRsiLowLine = input(50, minval=10, maxval=90, title="Second RSI Lower Line Value")

// Third RSI
useThirdRsi = input(title="Third RSI", type=input.bool, defval=true)
thirdRsiResolution = input(title="Third RSI Time Resolution, min", type=input.resolution, defval="1")
thirdRsiLength = input(7, minval=1, title="Third RSI Length")
thirdRsiUpLine = input(65, minval=10, maxval=90, title="Third RSI Upper Line Value")
thirdRsiLowLine = input(45, minval=10, maxval=90, title="Third RSI Lower Line Value")

// RSI calculation
outRSI = security(syminfo.tickerid, resolution, rsi(src, rsiLength))
secondOutRSI = security(syminfo.tickerid, secondRsiResolution, rsi(src, secondRsiLength))
thirdOutRSI = security(syminfo.tickerid, thirdRsiResolution, rsi(src, thirdRsiLength))

// RSI plot
plot(outRSI, title="RSI", style=plot.style_line, linewidth=2, color=color.orange)
plot(useSecondRsi ? secondOutRSI : na, title="Second RSI", style=plot.style_line, linewidth=2, color=color.yellow, transp=20)
plot(useThirdRsi ? thirdOutRSI : na, title="Third RSI", style=plot.style_line, linewidth=2, color=color.lime, transp=20)
plot(rsiUpLine, title= "RSI Upper Line", style=hline.style_solid, linewidth=2, color=color.red)
plot(rsiLowLine, title= "RSI Lower Line", style=hline.style_solid, linewidth=2, color=color.green)
plot(useSecondRsi ? secondRsiUpLine : na, title= "Second RSI Upper Line", style=hline.style_solid, linewidth=2, color=color.yellow, transp=80)
plot(useSecondRsi ? secondRsiLowLine : na, title= "Second RSI Lower Line", style=hline.style_solid, linewidth=2, color=color.yellow, transp=80)
plot(useThirdRsi ? thirdRsiUpLine : na, title= "Third RSI Upper Line", style=hline.style_solid, linewidth=2, color=color.lime, transp=80)
plot(useThirdRsi ? thirdRsiLowLine : na, title= "Third RSI Lower Line", style=hline.style_solid, linewidth=2, color=color.lime, transp=80)
// ------ Relative Strenght Index end -------

// ----- Stochastic RSI -------
// Stochastic RSI inputs
srsiSmoothK = input(3, "Stochastic K", minval=1)
srsiSmoothD = input(3, "Stochastic D", minval=1)
srsiLength = input(14, minval=1, title="SRSI Length")
srsiUpLine = input(80, minval=50, maxval=95, title="SRSI Upper Line Value")
srsiLowLine = input(20, minval=5, maxval=50, title="SRSI Lower Line Value")

// Stochastic RSI calculation
sRSI = rsi(src, srsiLength)
srsiK = sma(stoch(sRSI, sRSI, sRSI, srsiLength), srsiSmoothK)
srsiD = sma(srsiK, srsiSmoothD)

// Stochastic RSI plot
plot(srsiK, "SRSI K Stochastic", color=#0094FF) // blue
plot(srsiD, "SRSI D Stochastic", color=#FF6A00) // red
srsiUp = hline(srsiUpLine, "SRSI Upper Band", color=#606060)
srsiLow = hline(srsiLowLine, "SRSI Lower Band", color=#606060)
// ----- Exponental Moving Average end -------

// ------ Ultimate Oscillator ---------
// UO inputs
uoLength7 = input(7, minval=1, title="UO Length 1")
uoLength14 = input(14, minval=1, title="UO Length 2")
uoLength28 = input(28, minval=1, title="UO Length 3")
uoUpLine = input(65, minval=50, maxval=90, title="UO Upper Line Value")
uoLowLine = input(40, minval=10, maxval=50, title="UO Lower Line Value")

// UO calculation
average(bp, tr_, length) => sum(bp, length) / sum(tr_, length)
high_ = max(high, close[1])
low_ = min(low, close[1])
bp = close - low_
tr_ = high_ - low_
uoAverage7 = average(bp, tr_, uoLength7)
uoAverage14 = average(bp, tr_, uoLength14)
uoAverage28 = average(bp, tr_, uoLength28)
uo = 100 * (4*uoAverage7 + 2*uoAverage14 + uoAverage28) / 7

// UO plots
plot(uo, title="UO", color=color.purple, style=plot.style_line, linewidth = 2)
hline(uoUpLine, title= "UO Upper Line", linewidth=2, color=color.red)
hline(uoLowLine, title= "UO Lower Line", linewidth=2, color=color.green)
// ------ Ultimate Oscillator end ---------

// ------ Bollinger Bands ---------
// BB inputs
bbSource = input(close, title="BB Source")
bbLength = input(20, title="BB Length", minval=1)
bbMult1 = input(1.0, minval=0.0, maxval=50, title="BB StdDev 1")
bbMult2 = input(1.5, minval=0.0, maxval=50, title="BB StdDev 2")
bbMult3 = input(2.0, minval=0.0, maxval=50, title="BB StdDev 3")

// BB calculations
bbBasis = sma(bbSource, bbLength)
bbDev1 = bbMult1 * stdev(bbSource, bbLength)
bbUpper1 = bbBasis + bbDev1
bbLower1 = bbBasis - bbDev1
bbDev2 = bbMult2 * stdev(bbSource, bbLength)
bbUpper2 = bbBasis + bbDev2
bbLower2 = bbBasis - bbDev2
bbDev3 = bbMult3 * stdev(bbSource, bbLength)
bbUpper3 = bbBasis + bbDev3
bbLower3 = bbBasis - bbDev3
// ------ Bollinger Bands end ---------

// ----- Exponental Moving Average -------
// EMA inputs
useEma = input(title="Use EMA", type=input.bool, defval=true)
firstEmaLength = input(20, minval=1, title="First EMA Length")
secondEmaLength = input(70, minval=1, title="Second EMA Length")

// EMA calculation
firstEma = ema(src, firstEmaLength)
secondEma = ema(src, secondEmaLength)
prevFirstEma = ema(src[1], firstEmaLength)
prevSecondEma = ema(src[1], secondEmaLength)

emaLong = secondEma >= firstEma ? 1 : 0
emaShort = secondEma <= firstEma ? 1 : 0
emaLongCross = secondEma >= firstEma and prevSecondEma < prevFirstEma
emaShortCross = secondEma <= firstEma and prevSecondEma > prevFirstEma

// EMA plot
plotshape(emaLongCross, style=shape.xcross, location=location.top, color=color.green, size=size.tiny)
plotshape(emaShortCross, style=shape.xcross, location=location.top, color=color.red, size=size.tiny)
// ----- Exponental Moving Average end -------

// -------- indicators result -----------
applyRSI = input(title="Apply RSI on signal", type=input.bool, defval=true)
applySRSI = input(title="Apply Stochastic RSI on signal", type=input.bool, defval=true)
applyUO = input(title="Apply UO on signal", type=input.bool, defval=true)
applyBB = input(title="Apply BB on signal", type=input.bool, defval=true)
applyEma = input(title="Apply EMA cross on signal", type=input.bool, defval=true)

rsiAboveLine = outRSI >= rsiUpLine ? 1 : 0
rsiBelowLine = outRSI <= rsiLowLine ? 1 : 0
secondRsiBelowLine = not useSecondRsi or secondOutRSI <= secondRsiLowLine ? 1 : 0
secondRsiAboveLine = not useSecondRsi or secondOutRSI >= secondRsiUpLine ? 1 : 0
thirdRsiBelowLine = not useThirdRsi or thirdOutRSI <= thirdRsiLowLine ? 1 : 0
thirdRsiAboveLine = not useThirdRsi or thirdOutRSI >= thirdRsiUpLine ? 1 : 0

srsiAboveLine = srsiK >= srsiUpLine and srsiD >= srsiUpLine ? 1 : 0
srsiBelowLine = srsiK <= srsiLowLine and srsiD <= srsiLowLine ? 1 : 0

bbUpperCross1 = bbMult1 and close[1] > bbUpper1[1] and close < bbUpper1
bbLowerCross1 = bbMult1 and close[1] < bbLower1[1] and close > bbLower1
bbUpperCross2 = bbMult2 and close[1] > bbUpper2[1] and close < bbUpper2
bbLowerCross2 = bbMult2 and close[1] < bbLower2[1] and close > bbLower2
bbUpperCross3 = bbMult3 and close[1] > bbUpper3[1] and close < bbUpper3
bbLowerCross3 = bbMult3 and close[1] < bbLower3[1] and close > bbLower3

rsiShortSignal = not applyRSI or (rsiAboveLine and secondRsiAboveLine and thirdRsiAboveLine) ? 1 : 0
rsiLongSignal = not applyRSI or (rsiBelowLine and secondRsiBelowLine and thirdRsiBelowLine) ? 1 : 0
srsiShortSignal = not applySRSI or srsiAboveLine ? 1 : 0 // todo check red line is below blue line
srsiLongSignal = not applySRSI or srsiBelowLine ? 1 : 0 // todo check red line is above blue line
uoShortSignal = not applyUO or uo >= uoUpLine ? 1 : 0
uoLongSignal = not applyUO or uo <= uoLowLine ? 1 : 0
bbShortSignal = not applyBB or bbUpperCross1 or bbUpperCross2 or bbUpperCross3 ? 1 : 0
bbLongSignal = not applyBB or bbLowerCross1 or bbLowerCross2 or bbLowerCross3 ? 1 : 0
emaShortSignal = not applyEma or emaShort ? 1 : 0
emaLongSignal = not applyEma or emaLong ? 1 : 0

sellSignal = rsiShortSignal and srsiShortSignal and uoShortSignal and bbShortSignal and emaShortSignal ? 1 : 0
buySignal = rsiLongSignal and srsiLongSignal and uoLongSignal and bbLongSignal and emaLongSignal ? 1 : 0

// indicators show
bgcolor(rsiShortSignal and srsiShortSignal and uoShortSignal ? color.new(color.red, 80) : na, title="Time to sell")
bgcolor(rsiLongSignal and srsiLongSignal and uoLongSignal ? color.new(color.green, 80) : na, title="Time to buy")
plotshape(sellSignal, style=shape.triangledown, location=location.bottom, color=color.red, size=size.tiny)
plotshape(buySignal, style=shape.triangleup, location=location.bottom, color=color.green, size=size.tiny)

plotshape(bbUpperCross1, style=shape.triangledown, location=location.top, color=color.teal, size=size.tiny)
plotshape(bbLowerCross1, style=shape.triangleup, location=location.top, color=color.teal, size=size.tiny)
plotshape(bbUpperCross2, style=shape.triangledown, location=location.top, color=color.blue, size=size.tiny)
plotshape(bbLowerCross2, style=shape.triangleup, location=location.top, color=color.blue, size=size.tiny)
plotshape(bbUpperCross3, style=shape.triangledown, location=location.top, color=color.purple, size=size.tiny)
plotshape(bbLowerCross3, style=shape.triangleup, location=location.top, color=color.purple, size=size.tiny)

// --------- Strategy ----------
// Strategy inputs
isLongStrategy = input(title="Long/Short strategy", type=input.bool, defval=true)
isShortStrategy = not isLongStrategy

closeOnSignal = input(title="Close on signal", type=input.bool, defval=false)
closeOnTP = input(title="Close when TP reached", type=input.bool, defval=true)
closeOnSL = input(title="Close when SL reached", type=input.bool, defval=true)
takeProfitPercentage = input(title="Take Profit (%)", type=input.float, minval=0.0, step=1, defval=1) * 0.01
stopLossPercentage = input(title="Stop Loss (%)", type=input.float, minval=0.0, step=1, defval=1) * 0.01
firstPositionQty = input(title="Position, qty", type=input.float, minval=0.0, step=0.01, defval=25)
safetyStep = input(title="Pyramiding step for each safety order", type=input.float, minval=1.0, step=0.01, defval=4)
maxSafetyOrders = input(title="Max safety orders count", type=input.integer, minval=0, step=1, defval=2)

// Strategy calculations
int maxOrders = maxSafetyOrders + 1

float tpLongExitPrice  = strategy.position_avg_price * (1 + takeProfitPercentage)
float slLongExitPrice  = strategy.position_avg_price * (1 - stopLossPercentage)

float tpShortExitPrice  = strategy.position_avg_price * (1 - takeProfitPercentage)
float slShortExitPrice  = strategy.position_avg_price * (1 + stopLossPercentage)

int filledOrders = 0
float filledTotalVolume = 0.0
float lastPosition = 0.0
float absolutePosition = isLongStrategy ? strategy.position_size : -strategy.position_size

for i = 0 to maxOrders
    if (filledTotalVolume < absolutePosition)
        filledOrders := filledOrders + 1
        lastPosition := firstPositionQty * pow(safetyStep, i)
        filledTotalVolume := filledTotalVolume + lastPosition

    if (filledTotalVolume >= absolutePosition)
        break

float buyMoreQty = lastPosition * safetyStep
float buyMoreQty2 = buyMoreQty * safetyStep
float buyMoreQty3 = buyMoreQty2 * safetyStep

float safetyStepMult = safetyStep < 2 ? absolutePosition / lastPosition : 1
float buyMoreLongPrice = strategy.position_avg_price * (100 - safetyStepMult) * 0.01
float buyMoreShortPrice = strategy.position_avg_price * (100 + safetyStepMult) * 0.01

float safetyStepMult2 = safetyStep < 2 ? (absolutePosition + buyMoreQty) / buyMoreQty : 2
float buyMoreLongPrice2 = strategy.position_avg_price * (100 - safetyStepMult2) * 0.01
float buyMoreShortPrice2 = strategy.position_avg_price * (100 + safetyStepMult2) * 0.01

float safetyStepMult3 = safetyStep < 2 ? (absolutePosition + buyMoreQty + buyMoreQty2) / buyMoreQty2 : 3
float buyMoreLongPrice3 = strategy.position_avg_price * (100 - safetyStepMult3) * 0.01
float buyMoreShortPrice3 = strategy.position_avg_price * (100 + safetyStepMult3) * 0.01

// plot(strategy.position_size, color=color.yellow, linewidth = 3)
// plot(buyMoreQty, color=color.maroon, linewidth = 3)
// plot(lastPosition, color=color.orange, linewidth = 2)

// plot(strategy.position_avg_price, color=color.black, linewidth = 1)
// plot(buyMoreLongPrice, color=color.silver, linewidth = 3)
// plot(slLongExitPrice, color=color.blue, linewidth = 1)
// plot(strategy.opentrades, color=color.black)
// plot(filledOrders, color=color.black)

// maxPositionQty = firstPositionQty
// for i = 0 to maxSafetyOrders
//     maxPositionQty := maxPositionQty + firstPositionQty * pow(safetyStep, i)
// maxPosition = strategy.position_avg_price *
// maxPosition = firstPositionQty +
// strategy.risk.max_intraday_loss(, strategy.cash)
if (isLongStrategy)
    strategy.order("Long", strategy.long, qty=firstPositionQty, when = buySignal and absolutePosition == 0)

    strategy.order("Long" + tostring(filledOrders + 1), strategy.long, buyMoreQty, when=(filledOrders <= maxOrders - 1 and close <= buyMoreLongPrice))
    strategy.order("Long" + tostring(filledOrders + 2), strategy.long, buyMoreQty2, when=(filledOrders <= maxOrders - 2 and close <= buyMoreLongPrice2))
    strategy.order("Long" + tostring(filledOrders + 3), strategy.long, buyMoreQty3, when=(filledOrders <= maxOrders - 3 and close <= buyMoreLongPrice3))

    shouldSellOnSignal = closeOnSignal and sellSignal ? 1 : 0
    shouldSellOnTP = closeOnTP and close >= tpLongExitPrice ? 1 : 0
    shouldSellOnSL = filledOrders == maxOrders and closeOnSL and close <= slLongExitPrice ? 1 : 0

    strategy.close_all(comment="TP", when=(shouldSellOnSignal or shouldSellOnTP or shouldSellOnSL))

if (isShortStrategy)
    strategy.order("Short", strategy.short, qty=firstPositionQty, when = sellSignal and absolutePosition == 0)

    strategy.order("Short" + tostring(filledOrders + 1), strategy.short, buyMoreQty, when=(absolutePosition > 0 and filledOrders < maxOrders and close >= buyMoreShortPrice))

    shouldBuyOnSignal = closeOnSignal and buySignal ? 1 : 0
    shouldBuyOnTP = closeOnTP and close <= tpShortExitPrice ? 1 : 0
    shouldBuyOnSL = closeOnSL and close >= slShortExitPrice ? 1 : 0

    strategy.close_all(comment="TP", when=(shouldBuyOnSignal or shouldBuyOnTP or shouldBuyOnSL))
