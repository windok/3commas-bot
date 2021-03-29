//@version=4
study(title="myStudy", precision=4)

// ------ Relative Strenght Index -------
// RSI inputs
rsiLength = input(11, minval=1, title="RSI Length")
rsiSrc = input(close, title="RSI Source")
rsiResolution = input(title="RSI Time Resolution, min", type=input.resolution, defval="15")
rsiUpLine = input(80, minval=40, maxval=90, title="RSI Upper Line Value")
rsiLowLine = input(40, minval=10, maxval=60, title="RSI Lower Line Value")
// Second RSI
useSecondRsi = input(title="Second RSI", type=input.bool, defval=true)
secondRsiResolution = input(title="Second RSI Time Resolution, min", type=input.resolution, defval="120")
secondRsiLength = input(14, minval=1, title="Second RSI Length")
secondRsiSrc = input(close, title="Second RSI Source")
secondRsiUpLine = input(65, minval=10, maxval=90, title="Second RSI Upper Line Value")
secondRsiLowLine = input(50, minval=10, maxval=90, title="Second RSI Lower Line Value")

// RSI calculation
outRSI = security(syminfo.tickerid, rsiResolution, rsi(rsiSrc, rsiLength))
secondOutRSI = security(syminfo.tickerid, secondRsiResolution, rsi(secondRsiSrc, secondRsiLength))

// RSI plot
plot(outRSI, title="RSI", style=plot.style_line, linewidth=2, color=color.orange)
plot(useSecondRsi ? secondOutRSI : na, title="Second RSI", style=plot.style_line, linewidth=2, color=color.yellow)
plot(rsiUpLine, title= "RSI Upper Line", style=hline.style_solid, linewidth=2, color=color.red)
plot(rsiLowLine, title= "RSI Lower Line", style=hline.style_solid, linewidth=2, color=color.green)
plot(useSecondRsi ? secondRsiUpLine : na, title= "Second RSI Upper Line", style=hline.style_solid, linewidth=2, color=color.red, transp=80)
plot(useSecondRsi ? secondRsiLowLine : na, title= "Second RSI Lower Line", style=hline.style_solid, linewidth=2, color=color.green, transp=80)
// ------ Relative Strenght Index end -------

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
bbMult2 = input(2.0, minval=0.0, maxval=50, title="BB StdDev 2")
bbMult3 = input(3.0, minval=0.0, maxval=50, title="BB StdDev 3")

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

// ----- Crypto Market Cap RSI -------
// RSI inputs
useCryptoRsi = input(title="Show Crypto RSI", type=input.bool, defval=false)
cmcRsiLength = input(10, minval=1, title="CMC RSI Length")
cmcRsiSrc = input(close, title="CMC RSI Source")
cmcRsiResolution = input(title="CMC RSI Time Resolution, min", type=input.resolution, defval="15")
cmcRsiUpLine = input(70, minval=40, maxval=90, title="CMC RSI Upper Line Value")
cmcRsiLowLine = input(40, minval=10, maxval=60, title="CMC RSI Lower Line Value")

// RSI calculation
cmcRSI = security('TOTAL2', cmcRsiResolution, rsi(cmcRsiSrc, cmcRsiLength))

// RSI plot
plot(useCryptoRsi ? cmcRSI : na, title="CMC RSI", style=plot.style_line, linewidth=2, color=color.teal)
plot(useCryptoRsi ? cmcRsiUpLine : na, title= "CMC RSI Upper Line", style=hline.style_solid, linewidth=2, color=color.teal, transp=80)
plot(useCryptoRsi ? cmcRsiLowLine : na, title= "CMC RSI Lower Line", style=hline.style_solid, linewidth=2, color=color.teal, transp=80)
// ----- Crypto Market Cap RSI end -------

// -------- indicators result -----------
applyRSI = input(title="Apply RSI on signal", type=input.bool, defval=true)
applyUO = input(title="Apply UO on signal", type=input.bool, defval=true)
applyBB = input(title="Apply BB on signal", type=input.bool, defval=true)
applyCryptoRSI = input(title="Apply Crypto RSI on signal", type=input.bool, defval=false)

rsiAboveLine = outRSI >= rsiUpLine ? 1 : 0
rsiBelowLine = outRSI <= rsiLowLine ? 1 : 0
secondRsiBelowLine = not useSecondRsi or secondOutRSI <= secondRsiLowLine ? 1 : 0
secondRsiAboveLine = not useSecondRsi or secondOutRSI >= secondRsiUpLine ? 1 : 0

uoAboveLine = uo >= uoUpLine ? 1 : 0
uoBelowLine = uo <= uoLowLine ? 1 : 0

bbUpperCross1 = bbMult1 and close[1] > bbUpper1[1] and close < bbUpper1
bbLowerCross1 = bbMult1 and close[1] < bbLower1[1] and close > bbLower1
bbUpperCross2 = bbMult2 and close[1] > bbUpper2[1] and close < bbUpper2
bbLowerCross2 = bbMult2 and close[1] < bbLower2[1] and close > bbLower2
bbUpperCross3 = bbMult3 and close[1] > bbUpper3[1] and close < bbUpper3
bbLowerCross3 = bbMult3 and close[1] < bbLower3[1] and close > bbLower3

// calculated in opposite direction than usual RSI,
// because when whole market changes drastically it is not good time for orders
cmcRsiBelowBuyingLine = cmcRSI <= cmcRsiUpLine ? 1 : 0
cmcRsiAboveSellingLine = cmcRSI >= cmcRsiLowLine ? 1 : 0

rsiShortSignal = not applyRSI or (rsiAboveLine and secondRsiAboveLine) ? 1 : 0
rsiLongSignal = not applyRSI or (rsiBelowLine and secondRsiBelowLine) ? 1 : 0
uoShortSignal = not applyUO or uoAboveLine ? 1 : 0
uoLongSignal = not applyUO or uoBelowLine ? 1 : 0
bbShortSignal = not applyBB or bbUpperCross1 or bbUpperCross2 or bbUpperCross3 ? 1 : 0
bbLongSignal = not applyBB or bbLowerCross1 or bbLowerCross2 or bbLowerCross3 ? 1 : 0
cryptoRsiShortSignal = not applyCryptoRSI or cmcRsiBelowBuyingLine ? 1 : 0
cryptoRsiLongSignal = not applyCryptoRSI or cmcRsiAboveSellingLine ? 1 : 0

sellSignal = rsiShortSignal and uoShortSignal and bbShortSignal and cryptoRsiShortSignal ? 1 : 0
buySignal = rsiLongSignal and uoLongSignal and bbLongSignal and cryptoRsiLongSignal ? 1 : 0

// indicators show
bgcolor(rsiShortSignal and uoShortSignal and cryptoRsiShortSignal ? color.new(color.red, 80) : na, title="Time to sell")
bgcolor(rsiLongSignal and uoLongSignal and cryptoRsiLongSignal ? color.new(color.green, 80) : na, title="Time to buy")
plotshape(sellSignal, style=shape.triangledown, location=location.bottom, color=color.red, size=size.tiny)
plotshape(buySignal, style=shape.triangleup, location=location.bottom, color=color.green, size=size.tiny)

plotshape(bbUpperCross1, style=shape.triangledown, location=location.top, color=color.teal, size=size.tiny)
plotshape(bbLowerCross1, style=shape.triangleup, location=location.top, color=color.teal, size=size.tiny)
plotshape(bbUpperCross2, style=shape.triangledown, location=location.top, color=color.blue, size=size.tiny)
plotshape(bbLowerCross2, style=shape.triangleup, location=location.top, color=color.blue, size=size.tiny)
plotshape(bbUpperCross3, style=shape.triangledown, location=location.top, color=color.purple, size=size.tiny)
plotshape(bbLowerCross3, style=shape.triangleup, location=location.top, color=color.purple, size=size.tiny)

// --------- Alert ----------
alertcondition(buySignal, title="My buy signal")
alertcondition(sellSignal, title="My sell signal")
