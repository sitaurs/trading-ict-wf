ICT/
├── 📄 Main Files
│   ├── index.js                    # Entry point utama bot
│   ├── package.json               # Dependencies & scripts
│   ├── .env                       # Environment variables
│   └── .env.example              # Template environment
│
├── 📁 modules/                    # Core modules
│   ├── analysisHandler.js         # AI analysis engine
│   ├── brokerHandler.js          # MetaTrader 5 integration
│   ├── commandHandler.js         # WhatsApp command processor
│   ├── contextManager.js         # Daily context management
│   ├── journalingHandler.js      # Trade journaling
│   ├── logger.js                 # Logging system
│   ├── monitoringHandler.js      # Position monitoring
│   ├── whatsappClient.js         # WhatsApp integration
│   └── analysis/                 # Analysis sub-modules
│       ├── helpers.js            # Analysis utilities
│       ├── priceAnalysis.js      # Price action analysis
│       └── technicalAnalysis.js  # Technical indicators
│
├── 📁 config/                     # Configuration files
│   ├── api_key_status.json       # API status tracking
│   ├── bot_status.json           # Bot operational status
│   ├── google-credentials.json   # Google Sheets API key
│   └── recipients.json           # WhatsApp notification list
│
├── 📁 prompts/                    # AI analysis prompts
│   ├── prompt_stage1_bias.txt     # Stage 1: Daily bias
│   ├── prompt_stage1_extractor.txt # Stage 1: Data extraction
│   ├── prompt_stage2_extractor.txt # Stage 2: Data extraction
│   ├── prompt_stage2_manipulation.txt # Stage 2: Manipulation detection
│   ├── prompt_stage3_entry.txt    # Stage 3: Entry confirmation
│   ├── prompt_extractor.txt       # General data extraction
│   └── prompt_hold_close.txt      # Hold/Close analysis
│
├── 📁 python api mt5/             # MetaTrader 5 API service
│   ├── app.py                     # Flask main application
│   ├── auth.py                    # Authentication middleware
│   ├── constants.py               # MT5 constants
│   ├── lib.py                     # Core MT5 functions
│   ├── requirements.txt           # Python dependencies
│   ├── swagger.py                 # API documentation
│   └── routes/                    # API endpoints
│       ├── data.py               # Market data endpoints
│       ├── error.py              # Error handling
│       ├── health.py             # Health check
│       ├── history.py            # Historical data
│       ├── order.py              # Order management
│       ├── order_status.py       # Order status
│       ├── position.py           # Position management
│       └── symbol.py             # Symbol information
│
├── 📁 analysis_cache/             # Cached analysis results
├── 📁 daily_context/             # Daily trading context
├── 📁 pending_orders/            # Pending order files
├── 📁 src/utils/                 # Utility functions
│   └── aggregate.js              # Data aggregation
├── 📁 tests/                     # Test files
│   ├── aggregate.test.js         # Aggregation tests
│   ├── contextManager.test.js    # Context manager tests
│   └── cronSchedule.test.js      # Schedule tests
│
└── 📁 panduan prompt ict/        # Documentation & guides
    ├── cookbook Prompt Gemini 2.5 Pro.txt
    ├── Strategi PO3 (Power of Three) dalam Trading Forex.txt
    └── Strategi PO3 Trading Forex_.txt
