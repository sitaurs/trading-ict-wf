# ICT Trading Bot - Enhanced Version

## 🎯 Recent Updates

### ✅ Full Narrative Context Enhancement (Jan 28, 2025)
- **Major Upgrade**: Complete analytical journey now preserved between stages
- **Problem**: Only extracted data passed between stages, losing institutional reasoning
- **Solution**: Full narrative from each stage now available to subsequent analysis
- **Impact**: Gemini Pro has complete context for institutional-grade decisions
- **Documentation**: [FULL_NARRATIVE_ENHANCEMENT.md](docs/FULL_NARRATIVE_ENHANCEMENT.md)

### ✅ Stage 1 Completion Accuracy Fix (Jan 28, 2025)
- **Problem**: Bot reported "STAGE 1 SELESAI" even when some pairs failed
- **Solution**: Implemented detailed summary reporting
- **Result**: Users now see accurate status with detailed breakdown
- **Documentation**: [STAGE1_COMPLETION_FIX.md](docs/STAGE1_COMPLETION_FIX.md)

### ✅ Profit Monitoring & Circuit Breaker Verification
- Comprehensive testing with `test_profit_monitoring.js` and `test_circuit_breaker_scenarios.js`
- Confirmed robust operation and data persistence
- Enhanced error handling and restart protection

### ✅ Command Deduplication from BOT-V9
- All ICT commands now unique and modular
- Separate documentation structure
- Enhanced monitoring and journaling features

## 🚀 Quick Start

1. Install dependencies: `npm install`
2. Configure environment: Copy `.env.example` to `.env`
3. Run tests: `node test_stage1_completion.js`
4. Start bot: `node index.js`

## 📁 Key Modules

- `commandHandler.js` - WhatsApp command processing
- `analysisHandler.js` - Market analysis and Gemini integration
- `monitoringHandler.js` - Profit tracking and circuit breaker
- `brokerHandler.js` - MetaTrader 5 integration

## 🧪 Testing

Run all verification tests:
```bash
# Test full narrative storage and context enhancement
node test_full_narrative_storage.js

# Test stage completion accuracy
node test_stage1_completion.js

# Test profit monitoring and circuit breaker
node test_profit_monitoring.js
node test_circuit_breaker_scenarios.js
```

## 📚 Documentation

- [Full Narrative Enhancement](docs/FULL_NARRATIVE_ENHANCEMENT.md) - **NEW**
- [Stage 1 Completion Fix](docs/STAGE1_COMPLETION_FIX.md)
- [Profit Monitoring Test](docs/PROFIT_MONITORING_TEST.md)
- [Circuit Breaker Test](docs/CIRCUIT_BREAKER_TEST.md)
- [Pterodactyl Deployment](PTERODACTYL_DEPLOYMENT_GUIDE.md)