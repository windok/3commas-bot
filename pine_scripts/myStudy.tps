//@version=4
study(title="myStudy", precision=4)

src = input(close, title="Source")
resolution = timeframe.period
getOutValue(resolution, expression) => security(syminfo.tickerid, resolution, expression)

// ------ Relative Strenght Index -------
// RSI inputs
applyRSI = input(title="Apply RSI", type=input.bool, defval=true)
applyTrendingRSI = input(title="Apply only when RSI persists trend", type=input.bool, defval=false)
rsiLength = input(12, minval=1, title="RSI Length")
rsiUpLine = input(70, minval=40, maxval=90, title="RSI Upper Line Value")
rsiLowLine = input(40, minval=10, maxval=60, title="RSI Lower Line Value")
// Second RSI
useSecondRsi = input(title="Apply Second RSI", type=input.bool, defval=false)
secondRsiResolution = input(title="Second RSI Time Resolution, min", type=input.resolution, defval="120")
secondRsiLength = input(14, minval=1, title="Second RSI Length")
secondRsiUpLine = input(65, minval=10, maxval=90, title="Second RSI Upper Line Value")
secondRsiLowLine = input(50, minval=10, maxval=90, title="Second RSI Lower Line Value")
// Third RSI
useThirdRsi = input(title="Apply Third RSI", type=input.bool, defval=false)
thirdRsiResolution = input(title="Third RSI Time Resolution, min", type=input.resolution, defval="1")
thirdRsiLength = input(7, minval=1, title="Third RSI Length")
thirdRsiUpLine = input(65, minval=10, maxval=90, title="Third RSI Upper Line Value")
thirdRsiLowLine = input(50, minval=10, maxval=90, title="Third RSI Lower Line Value")

// RSI calculation
outRSI = getOutValue(resolution, rsi(src, rsiLength))
secondOutRSI = getOutValue(secondRsiResolution, rsi(src, secondRsiLength))
thirdOutRSI = getOutValue(thirdRsiResolution, rsi(src, thirdRsiLength))

rsiAboveLine = outRSI >= rsiUpLine ? 1 : 0
rsiBelowLine = outRSI <= rsiLowLine ? 1 : 0
rsiTrendingUp = not applyTrendingRSI or outRSI / outRSI[1] > 1.01 ? 1 : 0
rsiTrendingDown = not applyTrendingRSI or outRSI / outRSI[1] < 0.99 ? 1 : 0
secondRsiBelowLine = not useSecondRsi or secondOutRSI <= secondRsiLowLine ? 1 : 0
secondRsiAboveLine = not useSecondRsi or secondOutRSI >= secondRsiUpLine ? 1 : 0
thirdRsiBelowLine = not useThirdRsi or thirdOutRSI <= thirdRsiLowLine ? 1 : 0
thirdRsiAboveLine = not useThirdRsi or thirdOutRSI >= thirdRsiUpLine ? 1 : 0

rsiShortSignal = not applyRSI or (rsiAboveLine and rsiTrendingUp and secondRsiAboveLine and thirdRsiAboveLine) ? 1 : 0
rsiLongSignal = not applyRSI or (rsiBelowLine and rsiTrendingDown and secondRsiBelowLine and thirdRsiBelowLine) ? 1 : 0

// RSI plot
plot(applyRSI ? outRSI : na, title="RSI", style=plot.style_line, linewidth=3, color=color.red)
plot(useSecondRsi ? secondOutRSI : na, title="Second RSI", style=plot.style_line, linewidth=2, color=color.orange, transp=20)
plot(useThirdRsi ? thirdOutRSI : na, title="Third RSI", style=plot.style_line, linewidth=1, color=color.teal, transp=20)
plot(applyRSI ? rsiUpLine : na, title= "RSI Upper Line", style=hline.style_solid, linewidth=2, color=color.red)
plot(applyRSI ? rsiLowLine : na, title= "RSI Lower Line", style=hline.style_solid, linewidth=2, color=color.green)
plot(applyRSI and useSecondRsi ? secondRsiUpLine : na, title= "Second RSI Upper Line", style=hline.style_solid, linewidth=2, color=color.yellow, transp=80)
plot(applyRSI and useSecondRsi ? secondRsiLowLine : na, title= "Second RSI Lower Line", style=hline.style_solid, linewidth=2, color=color.yellow, transp=80)
plot(applyRSI and useThirdRsi ? thirdRsiUpLine : na, title= "Third RSI Upper Line", style=hline.style_solid, linewidth=2, color=color.teal, transp=80)
plot(applyRSI and useThirdRsi ? thirdRsiLowLine : na, title= "Third RSI Lower Line", style=hline.style_solid, linewidth=2, color=color.teal, transp=80)
// ------ Relative Strenght Index end -------

// ----- Stochastic RSI -------
// Stochastic RSI inputs
applySRSI = input(title="Apply Stochastic RSI", type=input.bool, defval=true)
applyCrossingSRSI = input(title="Apply Stochastic RSI crossing", type=input.bool, defval=true)
srsiLength = input(14, minval=1, title="SRSI Length")
srsiSmoothK = input(3, "Stochastic K", minval=1)
srsiSmoothD = input(3, "Stochastic D", minval=1)
srsiUpLine = input(80, minval=50, maxval=95, title="SRSI Upper Line Value")
srsiLowLine = input(20, minval=5, maxval=50, title="SRSI Lower Line Value")
// Second Stochastic RSI
useSecondSRSI = input(title="Use Second SRSI", type=input.bool, defval=false)
secondSrsiResolution = input(title="Second SRSI Time Resolution, min", type=input.resolution, defval="1")
secondSrsiLength = input(14, minval=1, title="Second RSI Length")
secondSrsiUpLine = input(75, minval=50, maxval=95, title="Second SRSI Upper Line Value")
secondSrsiLowLine = input(30, minval=5, maxval=50, title="Second SRSI Lower Line Value")

// Stochastic RSI calculation
sRSI = rsi(src, srsiLength)
srsiK = sma(stoch(sRSI, sRSI, sRSI, srsiLength), srsiSmoothK)
srsiD = sma(srsiK, srsiSmoothD)

secondSrsi = getOutValue(secondSrsiResolution, rsi(src, secondSrsiLength))
secondSrsiK = getOutValue(secondSrsiResolution, sma(stoch(secondSrsi, secondSrsi, secondSrsi, secondSrsiLength), srsiSmoothK))
secondSrsiD = getOutValue(secondSrsiResolution, sma(secondSrsiK, srsiSmoothD))

srsiAboveLine = srsiK >= srsiUpLine and srsiD >= srsiUpLine ? 1 : 0
srsiBelowLine = srsiK <= srsiLowLine and srsiD <= srsiLowLine ? 1 : 0

srsiCrossingVeryLow = (srsiD < 3 or srsiK < 3) and srsiD / srsiK < 1.8 and srsiD / srsiK > 0.9
srsiCrossingLow = srsiBelowLine and srsiD / srsiK < 1.3 and srsiD / srsiK > 0.95
srsiCrossingHigh = srsiAboveLine and srsiK / srsiD < 1.08 and srsiK / srsiD > 0.99
srsiCrossingVeryHigh = (srsiD > 96 or srsiK > 96) and srsiK / srsiD < 1.04 and srsiK / srsiD > 1
srsiCrossing = not applyCrossingSRSI or srsiCrossingVeryLow or srsiCrossingLow or srsiCrossingHigh or srsiCrossingVeryHigh ? 1 : 0

secondSrsiAboveLine = not useSecondSRSI or (secondSrsiK >= secondSrsiUpLine and secondSrsiD >= secondSrsiUpLine) ? 1 : 0
secondSrsiBelowLine = not useSecondSRSI or (secondSrsiK <= secondSrsiLowLine and secondSrsiD <= secondSrsiLowLine) ? 1 : 0

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
plotshape(applySRSI and applyCrossingSRSI and (srsiCrossingHigh or srsiCrossingVeryHigh) ? 1 : na, style=shape.diamond, location=location.top, color=color.red, size=size.small)
plotshape(applySRSI and applyCrossingSRSI and (srsiCrossingLow or srsiCrossingVeryLow) ? 1 : na, style=shape.diamond, location=location.top, color=color.green, size=size.small)
// ----- Exponental Moving Average end -------

// ------ Ultimate Oscillator ---------
// UO inputs
applyUO = input(title="Apply Ultimate Oscillator", type=input.bool, defval=false)
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

uoShortSignal = not applyUO or uo >= uoUpLine ? 1 : 0
uoLongSignal = not applyUO or uo <= uoLowLine ? 1 : 0

// UO plots
plot(applyUO ? uo : na, title="UO", color=color.purple, style=plot.style_line, linewidth = 3)
hline(applyUO ? uoUpLine : na, title= "UO Upper Line", linewidth=1, color=color.red)
hline(applyUO ? uoLowLine : na, title= "UO Lower Line", linewidth=1, color=color.green)
// ------ Ultimate Oscillator end ---------

// ------ Bollinger Bands ---------
// BB inputs
applyBB = input(title="Apply Bollinger Bands", type=input.bool, defval=true)
applyAlternateBB = input(title="Apply BB w/o crossing", type=input.bool, defval=true)
bbLength = input(20, title="BB Length", minval=1)
bbMult1 = input(1.5, minval=0.0, maxval=50, title="BB StdDev 1")
bbMult2 = input(0, minval=0.0, maxval=50, title="BB StdDev 2")
bbMult3 = input(0, minval=0.0, maxval=50, title="BB StdDev 3")

// BB calculations
bbBasis = ema(src, bbLength)
bbDev1 = bbMult1 * stdev(src, bbLength)
bbUpper1 = bbBasis + bbDev1
bbLower1 = bbBasis - bbDev1
bbDev2 = bbMult2 * stdev(src, bbLength)
bbUpper2 = bbBasis + bbDev2
bbLower2 = bbBasis - bbDev2
bbDev3 = bbMult3 * stdev(src, bbLength)
bbUpper3 = bbBasis + bbDev3
bbLower3 = bbBasis - bbDev3

bbUpperCross1 = bbMult1 and src[1] >= bbUpper1[1] and src <= bbUpper1
bbLowerCross1 = bbMult1 and src[1] <= bbLower1[1] and src >= bbLower1
bbUpperCross2 = bbMult2 and src[1] >= bbUpper2[1] and src <= bbUpper2
bbLowerCross2 = bbMult2 and src[1] <= bbLower2[1] and src >= bbLower2
bbUpperCross3 = bbMult3 and src[1] >= bbUpper3[1] and src <= bbUpper3
bbLowerCross3 = bbMult3 and src[1] <= bbLower3[1] and src >= bbLower3

bbAlternateAbove = src >= bbUpper1
bbAlternateBelow = src <= bbLower1

bbShortSignal = not applyBB or (applyAlternateBB ? bbAlternateAbove : bbUpperCross1 or bbUpperCross2 or bbUpperCross3) ? 1 : 0
bbLongSignal = not applyBB or (applyAlternateBB ? bbAlternateBelow : bbLowerCross1 or bbLowerCross2 or bbLowerCross3) ? 1 : 0

// BB plots
plotshape(applyBB ? bbUpperCross1 : na, style=shape.triangledown, location=location.top, color=color.teal, size=size.tiny)
plotshape(applyBB ? bbLowerCross1 : na, style=shape.triangleup, location=location.top, color=color.teal, size=size.tiny)
plotshape(applyBB ? bbUpperCross2 : na, style=shape.triangledown, location=location.top, color=color.blue, size=size.tiny)
plotshape(applyBB ? bbLowerCross2 : na, style=shape.triangleup, location=location.top, color=color.blue, size=size.tiny)
plotshape(applyBB ? bbUpperCross3 : na, style=shape.triangledown, location=location.top, color=color.purple, size=size.tiny)
plotshape(applyBB ? bbLowerCross3 : na, style=shape.triangleup, location=location.top, color=color.purple, size=size.tiny)
// ------ Bollinger Bands end ---------

// ----- Moving Average -------
// MA inputs
applyMa = input(title="Apply SMA/EMA level", type=input.bool, defval=true)
maResolution = input(title="SMA/EMA Time Resolution, min", type=input.resolution, defval="240")
maLength = input(20, minval=1, title="SMA/EMA Length")
maMultLong = input(0.75, minval=0.0, step=0.1, title="SMA/EMA Mult For Lower Bollinger Bands")
maMultShort = input(2.0, minval=0.0, step=0.1, title="SMA/EMA Mult For Upper Bollinger Bands")

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
maLengthFixed = bbLength * maRatio

sma = sma(src, maLengthFixed)
ema = ema(src, maLengthFixed)
maBBDevLong = maMultLong * stdev(src, maLengthFixed)
maBBDevShort = maMultShort * stdev(src, maLengthFixed)

maBasis = (sma + ema) / 2
maBBUpper = (sma < ema ? sma : ema) + maBBDevShort
maBBLower = (sma > ema ? sma : ema) - maBBDevLong

maShortSignal = not applyMa or src >= maBBUpper ? 1 : 0
maLongSignal = not applyMa or src <= maBBLower ? 1 : 0

// plot(close, color=color.black, linewidth = 2)
// plot(maBasis, color=color.blue, linewidth = 2)
// plot(maBBUpper, color=color.red, linewidth = 2)
// plot(maBBLower, color=color.green, linewidth = 2)

// ----- Moving Average end -------

// -------- indicators result -----------
sellSignal = rsiShortSignal and srsiShortSignal and uoShortSignal and bbShortSignal and maShortSignal ? 1 : 0
buySignal = rsiLongSignal and srsiLongSignal and uoLongSignal and bbLongSignal and maLongSignal ? 1 : 0

// indicators show
bgcolor(rsiShortSignal and srsiAboveLine and secondSrsiAboveLine and uoShortSignal and maShortSignal ? color.new(color.red, 80) : na, title="Time to sell")
bgcolor(rsiLongSignal and srsiBelowLine and secondSrsiBelowLine and uoLongSignal and maLongSignal ? color.new(color.green, 80) : na, title="Time to buy")
plotshape(sellSignal, style=shape.triangledown, location=location.bottom, color=color.red, size=size.tiny)
plotshape(buySignal, style=shape.triangleup, location=location.bottom, color=color.green, size=size.tiny)

// --------- Alert ----------
alertcondition(buySignal, title="My buy signal")
alertcondition(sellSignal, title="My sell signal")
