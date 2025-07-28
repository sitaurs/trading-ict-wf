# 📈 ICT Power of Three (PO3) Trading Strategy

## 🎯 Strategy Overview

**Power of Three (PO3)** adalah strategi trading forex yang dikembangkan oleh **Inner Circle Trader (ICT)** berdasarkan konsep bahwa market bergerak dalam 3 tahap utama setiap hari:

1. **🌅 Accumulation** (Stage 1) - Smart Money mengumpulkan posisi
2. **⚡ Manipulation** (Stage 2) - Market dimanipulasi untuk liquidity grab
3. **🚀 Distribution** (Stage 3) - Smart Money mendistribusikan posisi

---

## ⏰ Trading Sessions & Timing

### London Session Focus
Bot ini fokus pada **London Trading Session** karena:
- Volume trading tertinggi
- Volatility optimal untuk PO3 strategy
- Overlapping dengan session lain memberikan momentum

### Daily Schedule (UTC)
```
04:00-05:00  🌅 Pre-London Preparation
05:00        📊 Stage 1: Daily Bias Analysis
06:30        ⚡ Stage 2: Early Manipulation Detection
07:00-12:00  🚀 Stage 3: Entry Confirmation (every 30min)
09:00        ⚡ Stage 2: Late Manipulation Detection
15:00        🌅 EOD: Force Close All Positions
```

---

## 📊 Three Stages Breakdown

### 🌅 Stage 1: Accumulation (Daily Bias)
**Waktu**: 05:00 UTC (12:00 WIB)

**Tujuan**: Menentukan bias harian (bullish/bearish)

**Analisis**:
- **Market Structure**: Higher Highs/Lower Lows pattern
- **Liquidity Zones**: Identify key support/resistance
- **Order Blocks**: Previous day's institutional levels
- **Fair Value Gaps**: Imbalance areas yang perlu diisi
- **Economic Calendar**: High-impact news yang mempengaruhi bias

**AI Analysis**:
```
1. Analisis chart H4 & D1 untuk trend dominan
2. Identifikasi level key dari session sebelumnya
3. Evaluasi sentiment fundamental
4. Tentukan bias: BULLISH, BEARISH, atau NEUTRAL
5. Set target dan invalidation levels
```

### ⚡ Stage 2: Manipulation (Liquidity Grab)
**Waktu**: 06:30 UTC & 09:00 UTC (13:30 & 16:00 WIB)

**Tujuan**: Deteksi manipulasi untuk liquidity grab

**Analisis**:
- **Stop Hunt**: False breakout di level key
- **Liquidity Sweep**: Sweeping highs/lows untuk liquidity
- **Market Maker Move**: Artificial price movement
- **Volume Analysis**: Unusually high volume spikes
- **Reversal Patterns**: Confirmation setelah manipulation

**AI Analysis**:
```
1. Deteksi false breakout di level penting
2. Analisis volume dan price action anomaly
3. Identifikasi reversal signals
4. Konfirmasi manipulation berhasil
5. Prepare untuk distribution phase
```

### 🚀 Stage 3: Distribution (Entry Execution)
**Waktu**: 07:00-12:00 UTC setiap 30 menit (14:00-19:00 WIB)

**Tujuan**: Eksekusi entry berdasarkan confirmation

**Analisis**:
- **Entry Confirmation**: Multi-timeframe confluence
- **Risk Management**: SL, TP, dan position sizing
- **Market Flow**: Continuation pattern confirmation
- **Momentum**: RSI, MACD, dan momentum indicators
- **Price Action**: Candlestick patterns dan formations

**AI Analysis**:
```
1. Konfirmasi bias dari Stage 1 masih valid
2. Validasi manipulation dari Stage 2 completed
3. Multi-timeframe analysis (M15, M30, H1)
4. Entry trigger confirmation
5. Calculate optimal SL/TP levels
```

---

## 🎯 Entry Criteria

### Bullish Entry Criteria
- ✅ Stage 1: Bias BULLISH confirmed
- ✅ Stage 2: Bearish manipulation detected & completed
- ✅ Stage 3: Price shows bullish reversal structure
- ✅ Break of structure (BOS) to the upside
- ✅ Confluence dengan support level
- ✅ Fair Value Gap formed for entry

### Bearish Entry Criteria
- ✅ Stage 1: Bias BEARISH confirmed
- ✅ Stage 2: Bullish manipulation detected & completed
- ✅ Stage 3: Price shows bearish reversal structure
- ✅ Change of character (CHoCH) to the downside
- ✅ Confluence dengan resistance level
- ✅ Fair Value Gap formed for entry

---

## 🛡️ Risk Management

### Position Sizing
- **Fixed Risk**: 1-2% per trade dari total capital
- **Dynamic Sizing**: Berdasarkan volatility pair
- **Maximum Exposure**: Max 6% total capital (3 pairs × 2%)

### Stop Loss Strategy
- **Structure-Based SL**: Di below/above manipulation level
- **ATR-Based SL**: 1.5-2.0 × ATR untuk volatility adjustment
- **Time-Based SL**: Exit jika tidak ada momentum dalam 4 jam

### Take Profit Strategy
- **Target 1**: 1:1.5 Risk-Reward minimum
- **Target 2**: Major liquidity level (previous high/low)
- **Target 3**: Next significant structure level
- **Trail SL**: After Target 1 hit, trail stop to breakeven

---

## 📊 Technical Indicators Used

### Primary Indicators
- **Market Structure**: HH/HL for uptrend, LH/LL for downtrend
- **Order Blocks**: Previous candle yang menyebabkan impulse move
- **Fair Value Gaps**: Imbalance antara supply dan demand
- **Liquidity Zones**: Areas dengan banyak stop loss

### Confirmation Indicators
- **RSI (14)**: Untuk momentum confirmation
- **MACD (12,26,9)**: Untuk trend confirmation
- **ATR (14)**: Untuk volatility measurement
- **Volume**: Untuk confirmation breakout/reversal

---

## 🤖 AI Integration

### Google Gemini 2.5 Pro Features
- **Multi-Modal Analysis**: Text + Chart image analysis
- **Pattern Recognition**: Advanced candlestick pattern detection
- **Sentiment Analysis**: News impact pada bias harian
- **Probability Scoring**: Confidence level untuk setiap signal
- **Dynamic Adaptation**: Learning dari previous trades

### AI Prompt Engineering
- **Stage-Specific Prompts**: Setiap stage punya prompt yang dioptimasi
- **Context Awareness**: AI memahami previous analysis
- **Market Condition Adaptation**: Berbeda prompt untuk trending/ranging
- **Multi-Language**: Support Bahasa Indonesia dan English

---

## 📈 Performance Metrics

### Expected Performance
- **Win Rate**: 60-70% (realistic expectation)
- **Risk:Reward**: Minimum 1:1.5, target 1:2
- **Maximum Drawdown**: <15% dari capital
- **Monthly Return**: 8-15% (conservative)

### Tracking Metrics
- **Daily Profit/Loss**: Real-time P&L tracking
- **Win/Loss Ratio**: Success rate per pair
- **Average Risk:Reward**: Actual vs target R:R
- **Maximum Consecutive Losses**: Risk management

---

## 🚨 Risk Warnings

### Market Risks
- **High Volatility**: Forex market sangat volatile
- **Slippage**: Entry/exit price bisa berbeda dari target
- **Overnight Risk**: Position overnight berisiko gap
- **News Impact**: High-impact news bisa invalidate analysis

### Technical Risks
- **System Failure**: Bot/internet connection bisa down
- **API Limitations**: Google AI/MT5 API ada batasan
- **Data Latency**: Delay data bisa mempengaruhi timing
- **False Signals**: AI analysis tidak 100% akurat

---

## 📚 Learning Resources

### ICT Concepts
- **Market Maker Model**: How institutions move market
- **Liquidity Concepts**: Understanding where liquidity sits
- **Order Block Theory**: How to identify institutional levels
- **Fair Value Gap**: Imbalance yang perlu diisi market

### Advanced Concepts
- **Kill Zones**: Specific times when institutions trade
- **Turtle Soup Pattern**: Reversal pattern after false breakout
- **Breaker Block**: Failed support becomes resistance (vice versa)
- **Mitigation Block**: How market returns to balance levels

---

**[⬅️ Commands](./COMMANDS.md)** | **[➡️ Architecture](./ARCHITECTURE.md)**
