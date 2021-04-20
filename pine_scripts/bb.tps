//@version=4
study(title="custom Bollinger Bands (BB)", shorttitle="myBB", overlay=true, resolution="")

// BB inputs
src = input(close, title="BB Source")
bbLength = input(20, title="BB Length", minval=1)
bbMult1 = input(1.5, minval=0.0, maxval=50, title="BB StdDev 1")
bbMult2 = input(0, minval=0.0, maxval=50, title="BB StdDev 2")
bbMult3 = input(0, minval=0.0, maxval=50, title="BB StdDev 3")
isExponentalMovingAverage = input(title="EMA/SMA", type=input.bool, defval=true)

// BB calculations
bbBasis = isExponentalMovingAverage ?  ema(src, bbLength) : sma(src, bbLength)

bbDev1 = bbMult1 * stdev(src, bbLength)
bbUpper1 = bbBasis + bbDev1
bbLower1 = bbBasis - bbDev1

bbDev2 = bbMult2 * stdev(src, bbLength)
bbUpper2 = bbBasis + bbDev2
bbLower2 = bbBasis - bbDev2

bbDev3 = bbMult3 * stdev(src, bbLength)
bbUpper3 = bbBasis + bbDev3
bbLower3 = bbBasis - bbDev3

// Result calculations
bbUpperCross1 = bbMult1 and src[1] > bbUpper1[1] and src < bbUpper1
bbLowerCross1 = bbMult1 and src[1] < bbLower1[1] and src > bbLower1
bbUpperCross2 = bbMult2 and src[1] > bbUpper2[1] and src < bbUpper2
bbLowerCross2 = bbMult2 and src[1] < bbLower2[1] and src > bbLower2
bbUpperCross3 = bbMult3 and src[1] > bbUpper3[1] and src < bbUpper3
bbLowerCross3 = bbMult3 and src[1] < bbLower3[1] and src > bbLower3

// BB Plots
plot(bbBasis, title="BB Basis", color=#872323, linewidth=2)

bbUpperPlot1 = plot(bbUpper1, title="BB Upper 1", color=color.teal, linewidth=2)
bbLowerPlot1 = plot(bbLower1, title="BB Lower 1", color=color.teal, linewidth=2)
fill(bbUpperPlot1, bbLowerPlot1, title = "BB Background 2", color=color.teal, transp=95)

bbUpperPlot2 = plot(bbUpper2, title="BB Upper 2", color=color.blue, linewidth=2)
bbLowerPlot2 = plot(bbLower2, title="BB Lower 2", color=color.blue, linewidth=2)
fill(bbUpperPlot2, bbLowerPlot2, title = "BB Background 2", color=color.blue, transp=95)

bbUpperPlot3 = plot(bbUpper3, title="BB Upper 3", color=color.purple, linewidth=2)
bbLowerPlot3 = plot(bbLower3, title="BB Lower 3", color=color.purple, linewidth=2)
fill(bbUpperPlot3, bbLowerPlot3, title = "BB Background 3", color=color.purple, transp=95)

plotshape(bbUpperCross1, style=shape.triangledown, location=location.bottom, color=color.teal, size=size.tiny)
plotshape(bbLowerCross1, style=shape.triangleup, location=location.bottom, color=color.teal, size=size.tiny)
plotshape(bbUpperCross2, style=shape.triangledown, location=location.bottom, color=color.blue, size=size.tiny)
plotshape(bbLowerCross2, style=shape.triangleup, location=location.bottom, color=color.blue, size=size.tiny)
plotshape(bbUpperCross3, style=shape.triangledown, location=location.bottom, color=color.purple, size=size.tiny)
plotshape(bbLowerCross3, style=shape.triangleup, location=location.bottom, color=color.purple, size=size.tiny)


applyMa = input(title="Apply SMA/EMA level", type=input.bool, defval=true)
maResolution = input(title="SMA/EMA Time Resolution, min", type=input.resolution, defval="240")
maMult = input(0.0, minval=0.0, step=0.1, title="MA Deviation Mult (Bollinger Bands)")

// MA calculation
castResolutionToInt(resolution) =>
     resolution == 'W' ? 10080 :
         resolution == 'D' ? 1440 :
             resolution == '240' ? 240 :
                 resolution == '180' ? 180 :
                     resolution == '120' ? 120 :
                         resolution == '60' ? 60 :
                             resolution == '30' ? 30 :
                                 resolution == '15' ? 15 :
                                     resolution == '5' ? 5 :
                                         resolution == '3' ? 3 : na

currentResolutionInt = castResolutionToInt(timeframe.period)
maResolutionInt = castResolutionToInt(maResolution)
maRatio = currentResolutionInt < 180 and maResolutionInt / currentResolutionInt ? maResolutionInt / currentResolutionInt : 1
maLengthFixed = bbLength * maRatio

sma = sma(src, maLengthFixed)
ema = ema(src, maLengthFixed)
maBBDev = maMult * stdev(src, maLengthFixed)

maBBUpper = (sma < ema ? sma : ema) + maBBDev
maBBLower = (sma > ema ? sma : ema) - maBBDev

plot(applyMa ? sma : na, title="SMA", color=color.red, linewidth=4)
plot(applyMa ? ema : na, title="EMA", color=color.blue, linewidth=4)
plot(maBBUpper, title="MA BB Upper", color=color.green, linewidth=1)
plot(maBBLower, title="MA BB Lower", color=color.green, linewidth=1)
