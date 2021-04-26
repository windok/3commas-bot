//@version=4
study(title="myStudy", precision=4)

src = input(close, title="Source")
getOutValue(resolution, expression) => security(syminfo.tickerid, resolution, expression)

// ------ Relative Strenght Index -------
// RSI inputs
applyRSI = input(title="Apply RSI", type=input.bool, defval=true)
rsiLength = input(12, minval=1, title="RSI Length")
rsiUpLine = input(70, minval=20, maxval=95, title="RSI Upper Line Value")
rsiLowLine = input(40, minval=5, maxval=80, title="RSI Lower Line Value")
// Second RSI
useSecondRsi = input(title="Apply Second RSI", type=input.bool, defval=false)
secondRsiResolution = input(title="Second RSI Time Resolution, min", type=input.resolution, defval="120")
secondRsiLength = input(14, minval=1, title="Second RSI Length")
secondRsiUpLine = input(65, minval=20, maxval=95, title="Second RSI Upper Line Value")
secondRsiLowLine = input(50, minval=5, maxval=80, title="Second RSI Lower Line Value")

// RSI calculation
outRSI = rsi(src, rsiLength)
secondOutRSI = getOutValue(secondRsiResolution, rsi(src, secondRsiLength))

rsiAboveLine = outRSI >= rsiUpLine ? 1 : 0
rsiBelowLine = outRSI <= rsiLowLine ? 1 : 0
secondRsiBelowLine = not useSecondRsi or secondOutRSI <= secondRsiLowLine ? 1 : 0
secondRsiAboveLine = not useSecondRsi or secondOutRSI >= secondRsiUpLine ? 1 : 0

rsiShortSignal = not applyRSI or (rsiAboveLine and secondRsiAboveLine) ? 1 : 0
rsiLongSignal = not applyRSI or (rsiBelowLine and secondRsiBelowLine) ? 1 : 0

// RSI plot
plot(applyRSI ? outRSI : na, title="RSI", style=plot.style_line, linewidth=3, color=color.red)
plot(useSecondRsi ? secondOutRSI : na, title="Second RSI", style=plot.style_line, linewidth=2, color=color.new(color.orange, 80))
hline(applyRSI ? rsiUpLine : na, title= "RSI Upper Line", linestyle=hline.style_solid, linewidth=2, color=color.red)
hline(applyRSI ? rsiLowLine : na, title= "RSI Lower Line", linestyle=hline.style_solid, linewidth=2, color=color.green)
hline(applyRSI and useSecondRsi ? secondRsiUpLine : na, title= "Second RSI Upper Line", linestyle=hline.style_solid, linewidth=1, color=color.new(color.yellow, 80))
hline(applyRSI and useSecondRsi ? secondRsiLowLine : na, title= "Second RSI Lower Line", linestyle=hline.style_solid, linewidth=1, color=color.new(color.yellow, 80))
// ------ Relative Strenght Index end -------

// ----- Stochastic RSI -------
// Stochastic RSI inputs
applySRSI = input(title="Apply Stochastic RSI", type=input.bool, defval=true)
applyCrossingSRSI = input(title="Apply Stochastic RSI crossing", type=input.bool, defval=true)
srsiLength = input(14, minval=1, title="SRSI Length")
srsiSmoothK = input(3, "Stochastic K", minval=1)
srsiSmoothD = input(3, "Stochastic D", minval=1)
srsiUpLine = input(80, minval=20, maxval=95, title="SRSI Upper Line Value")
srsiLowLine = input(12, minval=5, maxval=80, title="SRSI Lower Line Value")
// Second Stochastic RSI
useSecondSRSI = input(title="Use Second SRSI", type=input.bool, defval=false)
secondSrsiResolution = input(title="Second SRSI Time Resolution, min", type=input.resolution, defval="1")
secondSrsiLength = input(14, minval=1, title="Second RSI Length")
secondSrsiUpLine = input(75, minval=20, maxval=95, title="Second SRSI Upper Line Value")
secondSrsiLowLine = input(30, minval=5, maxval=80, title="Second SRSI Lower Line Value")

// Stochastic RSI calculation
sRSI = rsi(src, srsiLength)
srsiK = sma(stoch(sRSI, sRSI, sRSI, srsiLength), srsiSmoothK)
srsiD = sma(srsiK, srsiSmoothD)

secondSrsi = getOutValue(secondSrsiResolution, rsi(src, secondSrsiLength))
secondSrsiK = getOutValue(secondSrsiResolution, sma(stoch(secondSrsi, secondSrsi, secondSrsi, secondSrsiLength), srsiSmoothK))
secondSrsiD = getOutValue(secondSrsiResolution, sma(secondSrsiK, srsiSmoothD))

srsiAboveLine = srsiK >= srsiUpLine ? 1 : 0
srsiBelowLine = srsiK <= srsiLowLine ? 1 : 0

srsiCrossingVeryLow = (srsiD < 5 or srsiK < 3) and srsiD / srsiK < 1.8 and srsiD / srsiK > 0.95 and srsiD[1] > srsiK[1]
srsiCrossingLow = srsiK <= srsiLowLine and srsiD / srsiK < 1.3 and srsiD / srsiK > 0.98 and srsiD[1] > srsiK[1]
srsiCrossingHigh = srsiAboveLine and srsiK / srsiD < 1.08 and srsiK / srsiD > 0.99
srsiCrossingVeryHigh = (srsiD > 96 or srsiK > 95) and srsiK / srsiD < 1.04 and srsiK / srsiD > 1
srsiCrossing = not applyCrossingSRSI or srsiCrossingVeryLow or srsiCrossingLow or srsiCrossingHigh or srsiCrossingVeryHigh ? 1 : 0

secondSrsiAboveLine = not useSecondSRSI or (secondSrsiK >= secondSrsiUpLine and secondSrsiD >= secondSrsiUpLine) ? 1 : 0
secondSrsiBelowLine = not useSecondSRSI or (secondSrsiK <= secondSrsiLowLine and secondSrsiD <= secondSrsiLowLine) ? 1 : 0

srsiShortSignalWOCrossing = not applySRSI or (srsiAboveLine and secondSrsiAboveLine) ? 1 : 0
srsiLongSignalWOCrossing = not applySRSI or (srsiBelowLine and secondSrsiBelowLine) ? 1 : 0

srsiShortSignal = not applySRSI or (srsiAboveLine and srsiCrossing and secondSrsiAboveLine) ? 1 : 0
srsiLongSignal = not applySRSI or (srsiBelowLine and srsiCrossing and secondSrsiBelowLine) ? 1 : 0

// Stochastic RSI plot
plot(applySRSI ? srsiK : na, "SRSI K Stochastic", color=color.blue, linewidth=1)
plot(applySRSI ? srsiD : na, "SRSI D Stochastic", color=color.red, linewidth=1)
plot(useSecondSRSI ? secondSrsiK : na, "Second SRSI K Stochastic", color=#03f4fc, linewidth=1)
plot(useSecondSRSI ? secondSrsiD : na, "Second SRSI D Stochastic", color=color.orange, linewidth=1)
hline(applySRSI ? srsiUpLine : na, "SRSI Upper Band", color=#606060)
hline(applySRSI ? srsiLowLine : na, "SRSI Lower Band", color=#606060)
hline(applySRSI and useSecondSRSI ? secondSrsiUpLine : na, "Second SRSI Upper Band", color=#606060)
hline(applySRSI and useSecondSRSI ? secondSrsiLowLine : na, "Second SRSI Lower Band", color=#606060)
// ----- Exponental Moving Average end -------

// ------ Bollinger Bands ---------
// BB inputs
applyBB = input(title="Apply Bollinger Bands", type=input.bool, defval=true)
applyAlternateBB = input(title="Apply BB w/o crossing", type=input.bool, defval=true)
bbLength = input(20, title="BB Length", minval=1)
bbMult1 = input(1.6, minval=0.0, maxval=50, title="BB StdDev 1")
bbMult2 = input(1.85, minval=0.0, maxval=50, title="BB StdDev 2")
bbUpperMult = input(1.12, minval=1.0, maxval=2.5, title="BB Upper line mult relating to lower line")

// BB calculations
bbBasis = ema(src, bbLength)
bbDev1 = bbMult1 * stdev(src, bbLength)
bbUpper1 = bbBasis + bbDev1 * bbUpperMult
bbLower1 = bbBasis - bbDev1
bbDev2 = bbMult2 * stdev(src, bbLength)
bbUpper2 = bbBasis + bbDev2 * bbUpperMult
bbLower2 = bbBasis - bbDev2

bbUpperCross1 = bbMult1 and src[1] >= bbUpper1[1] and src <= bbUpper1
bbLowerCross1 = bbMult1 and src[1] <= bbLower1[1] and src >= bbLower1
bbUpperCross2 = bbMult2 and src[1] >= bbUpper2[1] and src <= bbUpper2
bbLowerCross2 = bbMult2 and src[1] <= bbLower2[1] and src >= bbLower2

bbAbove = bbMult1 and src >= bbUpper1
bbBelow = bbMult1 and src <= bbLower1
bbAboveStrong = bbMult2 > bbMult1 and src >= bbUpper2
bbBelowStrong = bbMult2 > bbMult1 and src <= bbLower2

bbShortSignal = not applyBB or (applyAlternateBB ? bbAbove : bbUpperCross1 or bbUpperCross2) ? 1 : 0
bbLongSignal = not applyBB or (applyAlternateBB ? bbBelow : bbLowerCross1 or bbLowerCross2) ? 1 : 0
bbShortSignalStrong = applyBB and applyAlternateBB and bbAboveStrong ? 1 : 0
bbLongSignalStrong = applyBB and applyAlternateBB and bbBelowStrong ? 1 : 0
// ------ Bollinger Bands end ---------

// ----- Moving Average -------
// MA inputs
applyMa = input(title="Apply EMA longterm level", type=input.bool, defval=true)
maResolution = input(title="EMA Time Resolution, min", type=input.resolution, defval="240")
maLength = input(20, minval=1, title="EMA Length")
maMultLong = input(0.85, minval=0.0, step=0.1, title="EMA Mult For Lower Bollinger Bands")
maMultLongStrong = input(1.4, minval=0.0, step=0.1, title="Strong EMA Mult For Lower Bollinger Bands")
maMultShort = input(1.9, minval=0.0, step=0.1, title="EMA Mult For Upper Bollinger Bands")
maMultShortStrong = input(2.1, minval=0.0, step=0.1, title="Strong EMA Mult For Upper Bollinger Bands")

// MA calculation
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

currentResolutionInt = castResolutionToInt(timeframe.period)
maResolutionInt = castResolutionToInt(maResolution)
maRatio = currentResolutionInt < 180 and maResolutionInt / currentResolutionInt ? maResolutionInt / currentResolutionInt : 1
maLengthFixed = maLength * maRatio

maBasis = ema(src, maLengthFixed)
maStdev = stdev(src, maLengthFixed)

maBBUpper = maBasis + maMultShort * maStdev
maBBLower = maBasis - maMultLong * maStdev
maBBUpperStrong = maBasis + maMultShortStrong * maStdev
maBBLowerStrong = maBasis - maMultLongStrong * maStdev

maShortSignal = not applyMa or src >= maBBUpper ? 1 : 0
maLongSignal = not applyMa or src <= maBBLower ? 1 : 0
maShortSignalStrong = applyMa and maMultShortStrong > maMultShort and src >= maBBUpperStrong ? 1 : 0
maLongSignalStrong = applyMa and maMultLongStrong > maMultLong and src <= maBBLowerStrong ? 1 : 0

// plot(close, color=color.black, linewidth = 2)
// plot(maBasis, color=color.blue, linewidth = 2)
// plot(maBBUpper, color=color.red, linewidth = 2)
// plot(maBBLower, color=color.green, linewidth = 2)

// ----- Moving Average end -------

// -------- indicators result -----------
sellSignal = rsiShortSignal and srsiShortSignal and bbShortSignal and maShortSignal ? 1 : 0
buySignal = rsiLongSignal and srsiLongSignal and bbLongSignal and maLongSignal ? 1 : 0
sellSignalStrong = rsiShortSignal and srsiShortSignal and bbShortSignalStrong and maShortSignalStrong ? 1 : 0
buySignalStrong = rsiLongSignal and srsiLongSignal and bbLongSignalStrong and maLongSignalStrong ? 1 : 0

// indicators show
plot(sellSignalStrong or buySignalStrong ? 1 : na, "strongSignal", display=display.none)

bgcolor(rsiShortSignal and srsiShortSignalWOCrossing and (not applyAlternateBB or bbShortSignal) and maShortSignal ? color.new(color.red, 80) : na, title="Time to sell")
bgcolor(rsiShortSignal and srsiShortSignalWOCrossing and bbShortSignalStrong and maShortSignalStrong ? color.new(color.red, 65) : na, title="Time to sell strong")

bgcolor(rsiLongSignal and srsiLongSignalWOCrossing and (not applyAlternateBB or bbLongSignal) and maLongSignal ? color.new(color.green, 80) : na, title="Time to buy")
bgcolor(rsiLongSignal and srsiLongSignalWOCrossing and bbLongSignalStrong and maLongSignalStrong ? color.new(color.green, 65) : na, title="Time to buy strong")

plotshape(sellSignal, style=shape.triangledown, location=location.bottom, color=color.red, size=size.tiny)
plotshape(buySignal, style=shape.triangleup, location=location.bottom, color=color.green, size=size.tiny)

// --------- Alert ----------
alertcondition(buySignal, title="My buy signal")
alertcondition(buySignalStrong, title="My strong buy signal")
alertcondition(sellSignal, title="My sell signal")
alertcondition(sellSignalStrong, title="My strong sell signal")
