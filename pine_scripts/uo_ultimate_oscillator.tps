//@version=4
study(title="custom Ultimate Oscillator (UO)", precision=4)

// Ultimate Oscillator
uoLength7 = input(7, minval=1, title="UO Length 1")
uoLength14 = input(14, minval=1, title="UO Length 2")
uoLength28 = input(28, minval=1, title="UO Length 3")
uoUpLine = input(65, minval=50, maxval=90, title="UO Upper Line Value")
uoLowLine = input(40, minval=10, maxval=50, title="UO Lower Line Value")

average(bp, tr_, length) => sum(bp, length) / sum(tr_, length)
high_ = max(high, close[1])
low_ = min(low, close[1])
bp = close - low_
tr_ = high_ - low_
uoAverage7 = average(bp, tr_, uoLength7)
uoAverage14 = average(bp, tr_, uoLength14)
uoAverage28 = average(bp, tr_, uoLength28)
uo = 100 * (4*uoAverage7 + 2*uoAverage14 + uoAverage28) / 7

plot(uo, title="UO", color=color.purple, style=plot.style_line, linewidth = 2)
hline(uoUpLine, title= "UO Upper Line", linewidth=2, color=color.red)
hline(uoLowLine, title= "UO Lower Line", linewidth=2, color=color.green)

uoAboveLine = uo > uoUpLine ? 1 : 0
uoBelowLine = uo < uoLowLine ? 1 : 0

bgcolor(uoAboveLine ? color.new(color.red, 80) : na, title="UO Above Line")
bgcolor(uoBelowLine ? color.new(color.green, 80) : na, title="UO Below Line")
