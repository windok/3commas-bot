//@version=4
study(title="custom Relative Strength Index (RSI)", precision=4)

// RSI
rsiLength = input(7, minval=1, title="RSI Length")
rsiSrc = input(close, title="RSI Source")
rsiUpLine = input(70, minval=50, maxval=90, title="RSI Upper Line Value")
rsiLowLine = input(30, minval=10, maxval=50, title="RSI Lower Line Value")

// Second RSI
useSecondRsi = input(true, title="Second RSI")
secondRsiResolution = input(title="Second RSI Time Resolution, min", type=input.resolution, defval="60")
secondRsiLength = input(7, minval=1, title="Second RSI Length")
secondRsiSrc = input(close, title="Second RSI Source")
secondRsiLowLine = input(45, minval=10, maxval=90, title="Second RSI Lower Line Value")

rsiResolution = timeframe.period

rsiUp = rma(max(change(rsiSrc), 0), rsiLength)
rsiDown = rma(-min(change(rsiSrc), 0), rsiLength)
rsi = rsiDown == 0 ? 100 : rsiUp == 0 ? 0 : 100 - (100 / (1 + rsiUp / rsiDown))
outRSI = security(syminfo.tickerid, rsiResolution, rsi)

// secondRsi = rsi(rsiSrc, rsiLength)
secondRsiUp = rma(max(change(secondRsiSrc), 0), secondRsiLength)
secondRsiDown = rma(-min(change(secondRsiSrc), 0), secondRsiLength)
secondRsi = secondRsiDown == 0 ? 100 : secondRsiUp == 0 ? 0 : 100 - (100 / (1 + secondRsiUp / secondRsiDown))
secondOutRSI = security(syminfo.tickerid, secondRsiResolution, secondRsi)

plot(outRSI, title="RSI", style=plot.style_line, linewidth=2, color=color.purple)
plot(useSecondRsi ? secondOutRSI : na, title="Second RSI", style=plot.style_line, linewidth=2, color=color.orange)

plot(rsiUpLine, title= "RSI Upper Line", style=hline.style_solid, linewidth=2, color=color.red)
plot(rsiLowLine, title= "RSI Lower Line", style=hline.style_solid, linewidth=2, color=color.green)
plot(useSecondRsi ? secondRsiLowLine : na, title= "Second RSI Lower Line", style=hline.style_solid, linewidth=2, color=color.green, transp=80)

rsiAboveLine = outRSI > rsiUpLine ? 1 : 0
rsiBelowLine = outRSI < rsiLowLine ? 1 : 0
secondRsiBelowLine = not useSecondRsi or secondOutRSI < secondRsiLowLine ? 1 : 0

bgcolor(rsiAboveLine ? color.new(color.red, 80) : na, title="RSA Above Line")
bgcolor(rsiBelowLine and secondRsiBelowLine ? color.new(color.green, 80) : na, title="RSA Below Line")

// rsiCrossUp = outRSI[1] < rsiLowLine and outRSI > rsiLowLine ? 1 : 0
// rsiCrossDn = outRSI[1] > rsiUpLine and outRSI < rsiUpLine ? 1 : 0

