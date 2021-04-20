//@version=4
study(title="custom Stochastic RSI", shorttitle="custom Stoch RSI", format=format.price, precision=4)

srsiSrc = input(close, title="Stochastic RSI Source")
srsiResolution = input(title="Stochastic RSI Time Resolution, min", type=input.resolution, defval="1")
srsiLengthRSI = input(14, "Stochastic RSI Length", minval=1)
srsiLengthStoch = input(14, "Stochastic Length", minval=1)
srsiSmoothK = input(3, "Stochastic Smooth K", minval=1)
srsiSmoothD = input(3, "Stochastic Smooth D", minval=1)
srsiUpLine = input(80, minval=50, maxval=95, title="SRSI Upper Line Value")
srsiLowLine = input(20, minval=5, maxval=50, title="SRSI Lower Line Value")

getOutValue(expression) => security(syminfo.tickerid, srsiResolution, expression)

srsi = getOutValue(rsi(srsiSrc, srsiLengthRSI))
srsiK = getOutValue(sma(stoch(srsi, srsi, srsi, srsiLengthStoch), srsiSmoothK))
srsiD = getOutValue(sma(srsiK, srsiSmoothD))

plot(srsiK, "SRSI K Stochastic", color=#0094FF)
plot(srsiD, "SRSI D Stochastic", color=#FF6A00)
srsiUp = hline(srsiUpLine, "SRSI Upper Band", color=#606060)
srsiLow = hline(srsiLowLine, "SRSI Lower Band", color=#606060)
