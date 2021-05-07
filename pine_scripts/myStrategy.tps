//@version=4
strategy(title="myStrategy",
     precision=4,
     pyramiding = 10,
     initial_capital=1000,
     process_orders_on_close=true,
     calc_on_every_tick=false,
     calc_on_order_fills=true)

src = close // input(close, title="Source")
getOutValue(resolution, expression) => security(syminfo.tickerid, resolution, expression)

castResolutionToInt(resolution) =>
     resolution == 'W' or resolution == '1W' ? 10080 :
         resolution == 'D' or resolution == '1D' ? 1440 :
             resolution == '480' ? 480 :
                 resolution == '240' ? 240 :
                     resolution == '180' ? 180 :
                         resolution == '120' ? 120 :
                             resolution == '60' ? 60 :
                                 resolution == '30' ? 30 :
                                     resolution == '20' ? 20 :
                                         resolution == '15' ? 15 :
                                             resolution == '5' ? 5 :
                                                 resolution == '3' ? 3 : na

// ----- Moving Average -------
// MA inputs
applyMa = input(title="Apply EMA longterm level", type=input.bool, defval=true)
maResolution = input(title="EMA Time Resolution, min", type=input.resolution, defval="240")
maLength = input(20, minval=1, title="EMA Length")
maMultLongUpper = input(0.6, minval=0.0, step=0.1, title="EMA Mult For Upper Bollinger Bands")
maMultLong = input(0.8, minval=0.0, step=0.1, title="EMA Mult For Lower Bollinger Bands")
maMultLongStrong = input(1.3, minval=0.0, step=0.1, title="Strong EMA Mult For Lower Bollinger Bands")

// MA calculation
currentResolutionInt = castResolutionToInt(timeframe.period)
maResolutionInt = castResolutionToInt(maResolution)
maRatio = currentResolutionInt < 180 and maResolutionInt / currentResolutionInt ? maResolutionInt / currentResolutionInt : 1
maLengthFixed = maLength * maRatio

maBasis = ema(src, maLengthFixed)
maStdev = stdev(src, maLengthFixed)

maBBUpper = maBasis + maMultLongUpper * maStdev
maBBLower = maBasis - maMultLong * maStdev
maBBLowerStrong = maBasis - maMultLongStrong * maStdev

isMaRisky = applyMa and src > maBBLower and src <= maBBUpper
isMaNormal = applyMa and src > maBBLowerStrong and src <= maBBLower
isMaStrong = applyMa and src <= maBBLowerStrong

isMaLongNormal = not applyMa or isMaNormal or isMaStrong
isMaLongRisky = not applyMa or isMaRisky
isMaLong = isMaLongNormal or isMaLongRisky

// plot(close, color=color.black, linewidth = 2)
// plot(maBasis, color=color.blue, linewidth = 2)
// plot(maBBUpper, color=color.red, linewidth = 2)
// plot(maBBLower, color=color.green, linewidth = 2)

// ----- Moving Average end -------

// ------ Relative Strenght Index -------
// RSI inputs
applyRSI = input(title="Apply RSI", type=input.bool, defval=true)
rsiLength = input(12, minval=1, title="RSI Length")
rsiLowLine = input(40, minval=5, maxval=80, title="RSI Line")
rsiLowLineStrong = input(32, minval=5, maxval=80, title="RSI Strong Line")

// RSI calculation
rsi = rsi(src, rsiLength)

isRsiRisky = applyRSI and isMaRisky and rsi <= rsiLowLineStrong
isRsiNormal = applyRSI and isMaLongNormal and rsi > rsiLowLineStrong and rsi <= rsiLowLine
isRsiStrong = applyRSI and isMaLongNormal and rsi <= rsiLowLineStrong

isRsiLongNormal = not applyRSI or isRsiNormal or isRsiStrong
isRsiLongRisky = not applyRSI or isRsiRisky
isRsiLong = isRsiLongNormal or isRsiLongRisky

// RSI plot
plot(applyRSI ? rsi : na, title="RSI", style=plot.style_line, linewidth=3, color=color.red)
hline(applyRSI ? rsiLowLine : na, title= "RSI Lower Line", linestyle=hline.style_solid, linewidth=1, color=color.green)
hline(applyRSI ? rsiLowLineStrong : na, title= "RSI Lower Strong Line", linestyle=hline.style_solid, linewidth=2, color=color.green)
// ------ Relative Strenght Index end -------

// ----- Stochastic RSI -------
// Stochastic RSI inputs
applySRSI = input(title="Apply Stochastic RSI", type=input.bool, defval=true)
applyCrossingSRSI = input(title="Apply Stochastic RSI crossing", type=input.bool, defval=true)
srsiLength = input(14, minval=1, title="SRSI Length")
srsiSmoothK = input(3, "Stochastic K", minval=1)
srsiSmoothD = input(3, "Stochastic D", minval=1)
srsiLowLine = input(14, minval=5, maxval=80, title="SRSI Lower Line")

// Stochastic RSI calculation
sRSI = rsi(src, srsiLength)
srsiK = sma(stoch(sRSI, sRSI, sRSI, srsiLength), srsiSmoothK)
srsiD = sma(srsiK, srsiSmoothD)

isSrsiOnlyKBelowLine = srsiK <= srsiLowLine

isSrsiCrossingVeryLow = (srsiD < 5 or srsiK < 4) and srsiD / srsiK < 1.8 and srsiD / srsiK > 0.95
isSrsiCrossingLow = srsiD / srsiK < 1.3 and srsiD / srsiK > 0.98

isSrsiCrossing = not applyCrossingSRSI or isSrsiCrossingVeryLow or isSrsiCrossingLow ? 1 : 0
isSrsiCrossingTrending = isSrsiCrossing and srsiD[1] > srsiK[1] ? 1 : 0

isSrsiNormal = applySRSI and isMaLongNormal and isSrsiOnlyKBelowLine and isSrsiCrossingTrending
isSrsiRisky = applySRSI and isMaRisky and srsiK < 1

isSrsiLong = not applySRSI or isSrsiNormal

// Stochastic RSI plot
plot(applySRSI ? srsiK : na, "SRSI K Stochastic", color=color.blue, linewidth=1)
plot(applySRSI ? srsiD : na, "SRSI D Stochastic", color=color.red, linewidth=1)
hline(applySRSI ? srsiLowLine : na, "SRSI Lower Band", color=#606060)
// ----- Exponental Moving Average end -------

// ------ Bollinger Bands ---------
// BB inputs
applyBB = input(title="Apply Bollinger Bands", type=input.bool, defval=true)
bbLength = input(20, title="BB Length", minval=1)
bbMult1 = input(1.55, minval=0.0, title="BB StdDev Normal")
bbMult2 = input(1.8, minval=0.0, title="BB StdDev Strong")
bbMult3 = input(2.2, minval=0.0, title="BB StdDev Strong Risky")

// BB calculations
bbBasis = ema(src, bbLength)
bbLowerNormal = bbBasis - bbMult1 * stdev(src, bbLength)
bbLowerStrong = bbBasis - bbMult2 * stdev(src, bbLength)
bbLowerStrongRisky = bbBasis - bbMult3 * stdev(src, bbLength)

isBbRisky = applyBB and isMaRisky and src <= bbLowerStrongRisky
isBbNormal = applyBB and isMaLongNormal and src > bbLowerStrong and src <= bbLowerNormal
isBbStrong = applyBB and isMaLongNormal and src <= bbLowerStrong

isBbLongNormal = not applyBB or isBbNormal or isBbStrong
isBbLongRisky = not applyBB or isBbRisky
isBbLong = isBbLongRisky or isBbLongNormal
// ------ Bollinger Bands end ---------

// ------ Divergence ---------
applyDiv = input(title="Apply Divergence", type=input.bool, defval=false)
divergence = input(close, title="Divergence value")

isDivRisky = applyDiv and isMaRisky and (divergence >= 4 or divergence[1] >= 5)
isDivNormal = applyDiv and isMaLongNormal and ((divergence >= 3 and divergence < 5) or divergence[1] >= 4)
isDivStrong = applyDiv and isMaLongNormal and (divergence >= 5 or divergence[1] >= 6)

isDivLongNormal = not applyDiv or isDivNormal or isDivStrong
isDivLongRisky = not applyDiv or isDivRisky
isDivLongStrong = not applyDiv or isDivStrong
isDivLong = isDivLongRisky or isDivLongNormal

plotshape(applyDiv and isDivLong ? 1 : na, style=shape.diamond, location=location.bottom, color=color.purple, size=size.tiny)
// ------ Divergence end ---------

// -------- indicators result -----------
riskyLongSignal = isMaRisky and ((isRsiRisky and isDivLongRisky) or (isRsiNormal and isDivStrong)) and ((isSrsiLong and isBbStrong) or (isSrsiRisky and isBbRisky)) ? 1 : 0
longSignal = isMaLongNormal and ((isRsiLongNormal and isDivLongNormal) or isDivStrong) and isSrsiLong and isBbLongNormal ? 1 : 0
strongLongSignal = isMaStrong and (isRsiStrong or (isRsiNormal and isDivRisky)) and isSrsiLong and isBbStrong ? 1 : 0

buySignal = riskyLongSignal or longSignal or strongLongSignal ? 1 : na

// indicators show
plot(strongLongSignal ? 1 : na, "strongSignal", display=display.none)

bgcolor(isMaLong and isRsiLong and isBbLong and isSrsiOnlyKBelowLine and isDivLong ? color.new(color.green, 80) : na, title="Time to buy")
bgcolor(isMaStrong and (isRsiStrong or (isRsiNormal and isDivStrong)) and isBbStrong and isSrsiOnlyKBelowLine ? color.new(color.green, 65) : na, title="Time to buy strongg")

plotshape(buySignal, style=shape.triangleup, location=location.bottom, color=color.green, size=size.tiny)

// --------- Strategy ----------
// Strategy inputs
closeOnTP = input(title="Close when TP reached", type=input.bool, defval=true)
closeOnSL = input(title="Close when SL reached", type=input.bool, defval=true)
takeProfitPercentage = input(title="Take Profit (%)", type=input.float, minval=0.0, step=1, defval=1) * 0.01
stopLossPercentage = input(title="Stop Loss (%)", type=input.float, minval=0.0, step=1, defval=1) * 0.01
firstPositionQty = input(title="Position, qty", type=input.float, minval=0.0, step=0.01, defval=1)
safetyStep = input(title="Pyramiding step for each safety order", type=input.float, minval=1.0, step=0.01, defval=5)
maxSafetyOrders = input(title="Max safety orders count", type=input.integer, minval=0, step=1, defval=0)

// Strategy calculations
int maxOrders = maxSafetyOrders + 1

float tpLongExitPrice  = strategy.position_avg_price * (1 + takeProfitPercentage)
float slLongExitPrice  = strategy.position_avg_price * (1 - stopLossPercentage)


int filledOrders = 0
float filledTotalVolume = 0.0
float maxTotalVolume = 0.0
float lastPosition = 0.0
float absolutePosition = strategy.position_size

for i = 0 to maxOrders
    currentPosition = firstPositionQty * pow(safetyStep, i)
    maxTotalVolume := maxTotalVolume + currentPosition

    if (filledTotalVolume < absolutePosition)
        filledOrders := filledOrders + 1
        lastPosition := currentPosition
        filledTotalVolume := filledTotalVolume + currentPosition

float buyMoreQty = lastPosition * safetyStep

float safetyStepMult = safetyStep < 2 ? absolutePosition / lastPosition : 1
float buyMoreLongPrice = strategy.position_avg_price * (100 - safetyStepMult) * 0.01

strategy.entry("Long", strategy.long, qty=firstPositionQty, when = buySignal and absolutePosition == 0)

strategy.entry("Long" + tostring(filledOrders + 1), strategy.long, qty=buyMoreQty, when=(absolutePosition > 0 and filledOrders < maxOrders), limit=buyMoreLongPrice)

shouldSellOnTP = closeOnTP and close >= tpLongExitPrice ? 1 : 0
shouldSellOnSL = closeOnSL and filledOrders == maxOrders and close <= slLongExitPrice ? 1 : 0

strategy.close_all(comment="TP", when=(shouldSellOnTP or shouldSellOnSL))
