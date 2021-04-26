//@version=4
study(title="custom Bollinger Bands (BB)", shorttitle="myBB", overlay=true)

// BB inputs
src = input(close, title="BB Source")
bbLength = input(20, title="BB Length", minval=1)
bbMult1 = input(1.6, minval=0.0, maxval=50, title="BB StdDev 1")
bbMult2 = input(1.85, minval=0.0, maxval=50, title="BB StdDev 2")
bbMult3 = input(0, minval=0.0, maxval=50, title="BB StdDev 3")
bbUpperMult = input(1.1, minval=1.0, maxval=2.5, title="BB Upper line mult relating to lower line")
isExponentalMovingAverage = input(title="EMA/SMA", type=input.bool, defval=true)

// BB calculations
bbBasis = isExponentalMovingAverage ?  ema(src, bbLength) : sma(src, bbLength)

bbDev1 = bbMult1 * stdev(src, bbLength)
bbUpper1 = bbBasis + bbDev1 * bbUpperMult
bbLower1 = bbBasis - bbDev1

bbDev2 = bbMult2 * stdev(src, bbLength)
bbUpper2 = bbBasis + bbDev2 * bbUpperMult
bbLower2 = bbBasis - bbDev2

bbDev3 = bbMult3 * stdev(src, bbLength)
bbUpper3 = bbBasis + bbDev3 * bbUpperMult
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

bbUpperPlot1 = plot(bbUpper1, title="BB Upper 1", color=color.teal, linewidth=1)
bbLowerPlot1 = plot(bbLower1, title="BB Lower 1", color=color.teal, linewidth=1)
fill(bbUpperPlot1, bbLowerPlot1, title = "BB Background 2", color=color.teal, transp=98)

bbUpperPlot2 = plot(bbUpper2, title="BB Upper 2", color=color.blue, linewidth=1)
bbLowerPlot2 = plot(bbLower2, title="BB Lower 2", color=color.blue, linewidth=1)
fill(bbUpperPlot2, bbLowerPlot2, title = "BB Background 2", color=color.blue, transp=98)

bbUpperPlot3 = plot(bbUpper3, title="BB Upper 3", color=color.purple, linewidth=1)
bbLowerPlot3 = plot(bbLower3, title="BB Lower 3", color=color.purple, linewidth=1)
fill(bbUpperPlot3, bbLowerPlot3, title = "BB Background 3", color=color.purple, transp=98)

plotshape(bbUpperCross1, style=shape.triangledown, location=location.bottom, color=color.teal, size=size.tiny)
plotshape(bbLowerCross1, style=shape.triangleup, location=location.bottom, color=color.teal, size=size.tiny)
plotshape(bbUpperCross2, style=shape.triangledown, location=location.bottom, color=color.blue, size=size.tiny)
plotshape(bbLowerCross2, style=shape.triangleup, location=location.bottom, color=color.blue, size=size.tiny)
plotshape(bbUpperCross3, style=shape.triangledown, location=location.bottom, color=color.purple, size=size.tiny)
plotshape(bbLowerCross3, style=shape.triangleup, location=location.bottom, color=color.purple, size=size.tiny)


// ----- Moving Average -------
// MA inputs
applyMa = input(title="Apply EMA level", type=input.bool, defval=true)
maResolution = input(title="EMA Time Resolution, min", type=input.resolution, defval="240")
maLength = input(20, minval=1, title="EMA Length")
maMultLong = input(0.75, minval=0.0, step=0.1, title="EMA Lower BB Mult First")
maMultLong2 = input(1.25, minval=0.0, step=0.1, title="EMA Lower BB Mult Second")
maMultShort = input(2.0, minval=0.0, step=0.1, title="EMA Upper BB Mult")

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
maRatio = currentResolutionInt < 180 and maResolutionInt > 0 and currentResolutionInt > 0 ? maResolutionInt / currentResolutionInt : 1
maLengthFixed = maLength * maRatio

basis = ema(src, maLengthFixed)

maBBUpper = basis + maMultShort * stdev(src, maLengthFixed)
maBBLower = basis - maMultLong * stdev(src, maLengthFixed)
maBBLower2 = basis - maMultLong2 * stdev(src, maLengthFixed)

plot(basis, title="MA Basis", color=color.blue, linewidth=4)
plot(maBBUpper, title="MA BB Upper", color=color.red, linewidth=4)
plot(maBBLower, title="MA BB Lower", color=color.green, linewidth=4)
plot(maBBLower2, title="MA BB Lower", color=color.green, linewidth=2)
