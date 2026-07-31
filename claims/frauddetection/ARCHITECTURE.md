# System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    StateFarm Fraud Detection System             │
└─────────────────────────────────────────────────────────────────┘

                              Users
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Web Browser         │
                    │   (Dashboard UI)      │
                    └───────────┬───────────┘
                                │ HTTP/HTTPS
                                ▼
                    ┌───────────────────────┐
                    │   Flask API Server    │
                    │   (app.py)           │
                    └───────────┬───────────┘
                                │
                                ▼
        ┌──────────────────────────────────────────────┐
        │       Hybrid Fraud Detection Service         │
        │    (fraud_detection_service.py)             │
        └────────────┬─────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  OpenAI GPT-4   │    │  NVIDIA Model   │
│  (Primary)      │    │  (Future)       │
└─────────────────┘    └─────────────────┘
```

## Component Details

### 1. Frontend Layer
```
┌──────────────────────────────────────┐
│         Dashboard (HTML/JS)          │
├──────────────────────────────────────┤
│  • Real-time Statistics              │
│  • Interactive Charts (Chart.js)     │
│  • Claim Analysis Form               │
│  • Risk Visualization                │
│  • High-Risk Alerts                  │
└──────────────────────────────────────┘
```

### 2. API Layer
```
┌──────────────────────────────────────┐
│         Flask REST API               │
├──────────────────────────────────────┤
│  Endpoints:                          │
│  • POST /api/analyze-claim           │
│  • POST /api/batch-analyze           │
│  • GET  /api/insights/summary        │
│  • GET  /api/insights/trends         │
│  • GET  /api/insights/high-risk      │
│  • GET  /api/insights/top-indicators │
└──────────────────────────────────────┘
```

### 3. Service Layer
```
┌──────────────────────────────────────────────────────┐
│           Fraud Detection Service                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │     FraudDetectionService (OpenAI)          │   │
│  ├─────────────────────────────────────────────┤   │
│  │  • Analyze single claim                     │   │
│  │  • Batch analysis                           │   │
│  │  • Generate insights                        │   │
│  │  • Create detailed prompts                  │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │     NVIDIAFraudDetectionService (Future)    │   │
│  ├─────────────────────────────────────────────┤   │
│  │  • Ready for NVIDIA integration             │   │
│  │  • Placeholder for inference                │   │
│  │  • Availability checking                    │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │     HybridFraudDetectionService             │   │
│  ├─────────────────────────────────────────────┤   │
│  │  • Intelligent model selection              │   │
│  │  • Automatic fallback                       │   │
│  │  • Preference management                    │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 4. External Services
```
┌──────────────────┐        ┌──────────────────┐
│   OpenAI API     │        │  NVIDIA Inference│
│   (GPT-4)        │        │  Server (Future) │
├──────────────────┤        ├──────────────────┤
│  • Natural Lang  │        │  • Fast Inference│
│  • Contextual    │        │  • Specialized   │
│  • Reasoning     │        │  • High Accuracy │
└──────────────────┘        └──────────────────┘
```

## Data Flow

### Single Claim Analysis Flow
```
User Input (Dashboard)
    │
    ├─> Claim Data (JSON)
    │
    ▼
Flask API (/api/analyze-claim)
    │
    ├─> Validate Data
    ├─> Prepare Request
    │
    ▼
Hybrid Service
    │
    ├─> Check NVIDIA Available?
    │   ├─> Yes → Use NVIDIA
    │   └─> No  → Use OpenAI
    │
    ▼
AI Model (OpenAI/NVIDIA)
    │
    ├─> Analyze Context
    ├─> Detect Patterns
    ├─> Generate Score
    ├─> Identify Indicators
    │
    ▼
Response (JSON)
    │
    ├─> fraud_score
    ├─> risk_level
    ├─> fraud_indicators
    ├─> reasoning
    ├─> recommended_actions
    │
    ▼
Store in History
    │
    ▼
Return to Dashboard
    │
    ▼
Display Results + Update Charts
```

### Batch Analysis Flow
```
Multiple Claims Input
    │
    ▼
Batch API Endpoint
    │
    ├─> For Each Claim:
    │   └─> Analyze Individual
    │
    ▼
Aggregate Results
    │
    ├─> Calculate Statistics
    ├─> Identify Trends
    ├─> Generate Summary
    │
    ▼
Return Batch Results
```

## Analysis Process Detail

```
┌─────────────────────────────────────────────────────────┐
│              AI Analysis Pipeline                       │
└─────────────────────────────────────────────────────────┘

1. Input Processing
   ├─> Extract claim details
   ├─> Validate required fields
   └─> Format data structure

2. Prompt Engineering
   ├─> Build contextual prompt
   ├─> Include all claim details
   ├─> Add policy information
   └─> Include incident context

3. AI Model Inference
   ├─> Send to OpenAI/NVIDIA
   ├─> Process with temperature=0.3
   ├─> Request JSON response
   └─> Wait for completion

4. Response Processing
   ├─> Parse JSON response
   ├─> Extract fraud indicators
   ├─> Calculate confidence
   └─> Generate recommendations

5. Result Enrichment
   ├─> Add timestamp
   ├─> Add model metadata
   ├─> Calculate risk level
   └─> Format for display

6. Storage & Return
   ├─> Store in history
   ├─> Update statistics
   └─> Return to caller
```

## Heuristic vs AI Comparison

```
┌──────────────────────────────────────────────────────────┐
│                 OLD: Heuristic System                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Claim Input                                             │
│      │                                                   │
│      ▼                                                   │
│  Fixed Rules Check                                       │
│      ├─> Days < 30? Add 25 points                       │
│      ├─> Amount > 20k? Add 20 points                    │
│      ├─> No police report? Add 15 points                │
│      └─> Previous claims? Add 30 points                 │
│      │                                                   │
│      ▼                                                   │
│  Score Threshold                                         │
│      ├─> Score >= 60: HIGH                              │
│      ├─> Score >= 30: MEDIUM                            │
│      └─> Score < 30: LOW                                │
│      │                                                   │
│      ▼                                                   │
│  Generic Output                                          │
│                                                          │
│  ❌ No context understanding                            │
│  ❌ Fixed rules only                                    │
│  ❌ High false positives                                │
│  ❌ No detailed reasoning                               │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                 NEW: AI-Powered System                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Claim Input                                             │
│      │                                                   │
│      ▼                                                   │
│  Contextual Analysis (AI)                                │
│      ├─> Understand full context                        │
│      ├─> Analyze patterns                               │
│      ├─> Consider relationships                         │
│      ├─> Detect anomalies                               │
│      └─> Cross-reference indicators                     │
│      │                                                   │
│      ▼                                                   │
│  Intelligent Scoring                                     │
│      ├─> Nuanced fraud score (0-100)                    │
│      ├─> Confidence level (0-100)                       │
│      ├─> Risk classification                            │
│      └─> Multiple indicators                            │
│      │                                                   │
│      ▼                                                   │
│  Detailed Output                                         │
│      ├─> Specific fraud indicators                      │
│      ├─> Detailed reasoning                             │
│      ├─> Recommended actions                            │
│      └─> Red flag analysis                              │
│                                                          │
│  ✅ Deep context understanding                          │
│  ✅ Adaptive analysis                                   │
│  ✅ Low false positives                                 │
│  ✅ Actionable insights                                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Future Architecture (with NVIDIA)

```
                    User Request
                         │
                         ▼
                  ┌──────────────┐
                  │ Hybrid Router│
                  └──────┬───────┘
                         │
        ┌────────────────┼────────────────┐
        │                                 │
        ▼                                 ▼
┌───────────────┐              ┌────────────────┐
│  NVIDIA Model │              │  OpenAI Model  │
│  (Preferred)  │              │  (Fallback)    │
├───────────────┤              ├────────────────┤
│ • Fast        │              │ • Reliable     │
│ • Specialized │              │ • Available    │
│ • Accurate    │              │ • Proven       │
└───────┬───────┘              └────────┬───────┘
        │                               │
        └───────────┬───────────────────┘
                    │
                    ▼
              Best Result
                    │
                    ▼
             User Dashboard
```

## Scalability Considerations

```
Current (Development)
├─> Single Flask Instance
├─> In-Memory Storage
└─> Direct API Calls

Future (Production)
├─> Load Balanced Flask Instances
├─> Database (PostgreSQL)
├─> Redis Caching Layer
├─> Message Queue (Celery)
├─> Monitoring (Prometheus)
└─> Auto-Scaling
```

## Security Architecture

```
┌────────────────────────────────────────┐
│          Security Layers               │
├────────────────────────────────────────┤
│                                        │
│  1. Network Layer                      │
│     ├─> HTTPS/TLS                      │
│     ├─> Firewall Rules                 │
│     └─> Rate Limiting                  │
│                                        │
│  2. Application Layer                  │
│     ├─> Input Validation               │
│     ├─> SQL Injection Prevention       │
│     ├─> XSS Protection                 │
│     └─> CSRF Tokens                    │
│                                        │
│  3. Authentication Layer               │
│     ├─> OAuth 2.0 (Future)             │
│     ├─> JWT Tokens                     │
│     └─> Role-Based Access              │
│                                        │
│  4. Data Layer                         │
│     ├─> Encrypted at Rest              │
│     ├─> Encrypted in Transit           │
│     └─> API Key Management             │
│                                        │
└────────────────────────────────────────┘
```

---

*This architecture is designed for scalability, reliability, and future enhancements.*
