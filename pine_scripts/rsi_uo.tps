//@version=4
study(title="custom Ultimate Oscillator (UO)", precision=4)

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

plot(outRSI, title="RSI", style=plot.style_line, linewidth=2, color=color.orange)
plot(useSecondRsi ? secondOutRSI : na, title="Second RSI", style=plot.style_line, linewidth=2, color=color.yellow)

plot(rsiUpLine, title= "RSI Upper Line", style=hline.style_solid, linewidth=2, color=color.red)
plot(rsiLowLine, title= "RSI Lower Line", style=hline.style_solid, linewidth=2, color=color.green)
plot(useSecondRsi ? secondRsiLowLine : na, title= "Second RSI Lower Line", style=hline.style_solid, linewidth=2, color=color.green, transp=80)

rsiAboveLine = outRSI > rsiUpLine ? 1 : 0
rsiBelowLine = outRSI < rsiLowLine ? 1 : 0
secondRsiBelowLine = not useSecondRsi or secondOutRSI < secondRsiLowLine ? 1 : 0

// Ultimate Oscillator
length7 = input(7, minval=1, title="UO Length 1")
length14 = input(14, minval=1, title="UO Length 2")
length28 = input(28, minval=1, title="UO Length 3")
uoUpLine = input(65, minval=50, maxval=90, title="UO Upper Line Value")
uoLowLine = input(40, minval=10, maxval=50, title="UO Lower Line Value")

average(bp, tr_, length) => sum(bp, length) / sum(tr_, length)
high_ = max(high, close[1])
low_ = min(low, close[1])
bp = close - low_
tr_ = high_ - low_
avg7 = average(bp, tr_, length7)
avg14 = average(bp, tr_, length14)
avg28 = average(bp, tr_, length28)
uo = 100 * (4*avg7 + 2*avg14 + avg28) / 7
plot(uo, title="UO", color=color.purple, style=plot.style_line, linewidth = 2)
hline(uoUpLine, title= "UO Upper Line", linewidth=2, color=color.red)
hline(uoLowLine, title= "UO Lower Line", linewidth=2, color=color.green)

uoAboveLine = uo > uoUpLine ? 1 : 0
uoBelowLine = uo < uoLowLine ? 1 : 0

bgcolor(rsiAboveLine and uoAboveLine ? color.new(color.red, 80) : na, title="Time to sell")
bgcolor(rsiBelowLine and secondRsiBelowLine and uoBelowLine ? color.new(color.green, 80) : na, title="Time to buy")
