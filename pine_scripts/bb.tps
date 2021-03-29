//@version=4
study(title="custom Bollinger Bands (BB)", shorttitle="myBB", overlay=true, resolution="")

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

// Result calculations
bbUpperCross1 = bbMult1 and close[1] > bbUpper1[1] and close < bbUpper1
bbLowerCross1 = bbMult1 and close[1] < bbLower1[1] and close > bbLower1
bbUpperCross2 = bbMult2 and close[1] > bbUpper2[1] and close < bbUpper2
bbLowerCross2 = bbMult2 and close[1] < bbLower2[1] and close > bbLower2
bbUpperCross3 = bbMult3 and close[1] > bbUpper3[1] and close < bbUpper3
bbLowerCross3 = bbMult3 and close[1] < bbLower3[1] and close > bbLower3

// BB Plots
plot(bbBasis, title="BB Basis", color=#872323)

bbUpperPlot1 = plot(bbUpper1, title="BB Upper 1", color=color.teal)
bbLowerPlot1 = plot(bbLower1, title="BB Lower 1", color=color.teal)
fill(bbUpperPlot1, bbLowerPlot1, title = "BB Background 2", color=color.teal, transp=95)

bbUpperPlot2 = plot(bbUpper2, title="BB Upper 2", color=color.blue)
bbLowerPlot2 = plot(bbLower2, title="BB Lower 2", color=color.blue)
fill(bbUpperPlot2, bbLowerPlot2, title = "BB Background 2", color=color.blue, transp=95)

bbUpperPlot3 = plot(bbUpper3, title="BB Upper 3", color=color.purple)
bbLowerPlot3 = plot(bbLower3, title="BB Lower 3", color=color.purple)
fill(bbUpperPlot3, bbLowerPlot3, title = "BB Background 3", color=color.purple, transp=95)

plotshape(bbUpperCross1, style=shape.triangledown, location=location.bottom, color=color.teal, size=size.tiny)
plotshape(bbLowerCross1, style=shape.triangleup, location=location.bottom, color=color.teal, size=size.tiny)
plotshape(bbUpperCross2, style=shape.triangledown, location=location.bottom, color=color.blue, size=size.tiny)
plotshape(bbLowerCross2, style=shape.triangleup, location=location.bottom, color=color.blue, size=size.tiny)
plotshape(bbUpperCross3, style=shape.triangledown, location=location.bottom, color=color.purple, size=size.tiny)
plotshape(bbLowerCross3, style=shape.triangleup, location=location.bottom, color=color.purple, size=size.tiny)
