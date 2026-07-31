# State Farm Live Portal - Architecture

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                           │
│                     http://localhost:3000                       │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   React Frontend                          │ │
│  │                                                           │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │ │
│  │  │Dashboard │  │  Claims  │  │Adjusters │  │ Damages  │ │ │
│  │  │   Tab    │  │   Tab    │  │   Tab    │  │   Tab    │ │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │ │
│  │                                                           │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │         AI Insights Tab                              │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                           │ │
│  │  Components: KPIs, Charts, Tables, Live Feed             │ │
│  │  Libraries: React 18, Recharts                           │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTP/JSON (REST API)
                               │ Auto-refresh every 30s
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend API Server                           │
│                  http://localhost:3001                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                 Express.js Server                         │ │
│  │                                                           │ │
│  │  Endpoints:                                               │ │
│  │  ├─ GET /health          → Health check                  │ │
│  │  ├─ GET /api/claims      → All claims                    │ │
│  │  ├─ GET /api/claims/:id  → Single claim                  │ │
│  │  ├─ GET /api/adjusters   → All adjusters                 │ │
│  │  ├─ GET /api/damages     → All damages                   │ │
│  │  └─ GET /api/stats       → Dashboard statistics          │ │
│  │                                                           │ │
│  │  Features:                                                │ │
│  │  ├─ CORS enabled for local development                   │ │
│  │  ├─ Connection pooling (2-10 connections)                │ │
│  │  ├─ Error handling & logging                             │ │
│  │  └─ Environment-based configuration                      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Technology Stack:                                              │
│  ├─ Node.js                                                     │
│  ├─ Express.js                                                  │
│  ├─ oracledb driver (v6.3.0)                                    │
│  └─ dotenv for configuration                                    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ Oracle Protocol (TCP/TLS)
                               │ Port: 1522 (TCPS)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              Oracle Autonomous Database                         │
│                  VIBECODING_MEDIUM                              │
│                      Port: 6100                                 │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   Database Schema                         │ │
│  │                                                           │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │ │
│  │  │    CLAIMS    │  │  ADJUSTERS   │  │   DAMAGES    │   │ │
│  │  ├──────────────┤  ├──────────────┤  ├──────────────┤   │ │
│  │  │ CLAIM_ID     │  │ ADJUSTER_ID  │  │ DAMAGE_ID    │   │ │
│  │  │ CLAIM_NUMBER │  │ ADJUSTER_NAME│  │ CLAIM_ID (FK)│   │ │
│  │  │ CLAIM_TYPE   │  │ EMAIL        │  │ DAMAGE_TYPE  │   │ │
│  │  │ STATUS       │  │ PHONE        │  │ SEVERITY     │   │ │
│  │  │ PRIORITY     │  │ SPECIALIST   │  │ REPAIR_COST  │   │ │
│  │  │ AI_CONF_SCORE│  │ HIRE_DATE    │  │ ASSESS_DATE  │   │ │
│  │  │ ADJUSTER_ID  │  └──────────────┘  └──────────────┘   │ │
│  │  │ ESTIMATED_   │                                        │ │
│  │  │   LOSS       │                                        │ │
│  │  │ CUSTOMER_*   │                                        │ │
│  │  │ CREATED_DATE │                                        │ │
│  │  └──────────────┘                                        │ │
│  │                                                           │ │
│  │  Features:                                                │ │
│  │  ├─ SSL/TLS encryption                                    │ │
│  │  ├─ Automatic scaling                                     │ │
│  │  ├─ Automatic backups                                     │ │
│  │  └─ High availability                                     │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### 1. Page Load Flow
```
User Opens Browser
       │
       ▼
React App Loads (StateFarmLivePortal.jsx)
       │
       ▼
useEffect() Triggers
       │
       ▼
Fetch Request to Backend API
       │
       ├─ GET /api/claims
       ├─ GET /api/adjusters
       ├─ GET /api/damages
       └─ GET /api/stats
       │
       ▼
Backend Server Receives Request
       │
       ▼
Query Oracle Database
       │
       ▼
Return JSON Response
       │
       ▼
React Updates State
       │
       ▼
UI Re-renders with Live Data
       │
       ▼
Auto-refresh every 30 seconds
```

### 2. User Interaction Flow
```
User Clicks Claim Row
       │
       ▼
setSelectedClaim(claim)
setActiveTab('claims')
       │
       ▼
Component Re-renders
       │
       ▼
Shows Claim Detail View
       │
       ▼
Displays:
  ├─ Customer Information
  ├─ Policy Details
  ├─ AI Confidence Score
  ├─ Estimated Loss
  └─ Adjuster Assignment
```

---

## 📊 API Request/Response Examples

### GET /api/claims
**Response:**
```json
{
  "success": true,
  "count": 150,
  "data": [
    {
      "CLAIM_ID": 1,
      "CLAIM_NUMBER": "CLM-2024-001",
      "CLAIM_TYPE": "PROPERTY",
      "CLAIM_SUBTYPE": "WATER",
      "POLICY_NUMBER": "POL-123456",
      "CUSTOMER_NAME": "John Doe",
      "CUSTOMER_EMAIL": "john@email.com",
      "CUSTOMER_PHONE": "555-0100",
      "INCIDENT_DATE": "2024-03-15",
      "STATUS": "INVESTIGATING",
      "PRIORITY": "HIGH",
      "PERIL_CODE": "WATER-LEAK",
      "ESTIMATED_LOSS": 15000,
      "AI_CONFIDENCE_SCORE": 87,
      "ADJUSTER_ID": 101,
      "ADJUSTER_NAME": "Jane Smith",
      "CREATED_DATE": "2024-03-16"
    }
  ]
}
```

### GET /api/stats
**Response:**
```json
{
  "success": true,
  "data": [
    { "METRIC": "Total Claims", "VALUE": 150 },
    { "METRIC": "Urgent Claims", "VALUE": 23 },
    { "METRIC": "High Priority", "VALUE": 45 },
    { "METRIC": "Unassigned", "VALUE": 12 }
  ]
}
```

---

## 🔐 Security Architecture

### Current Implementation (Development)
```
Frontend (React)
    │
    │ No Authentication (Dev only)
    │
    ▼
Backend (Express)
    │
    │ CORS: Enabled for localhost
    │ Auth: None (Dev only)
    │
    ▼
Database (Oracle ADB)
    │
    │ SSL/TLS: Enforced
    │ Credentials: Environment variables
    │ Connection: Encrypted
    │
    ▼
Oracle Cloud Infrastructure
```

### Production Recommendations
```
Frontend (React)
    │
    │ ✅ Add JWT Authentication
    │ ✅ Enable HTTPS only
    │ ✅ Input validation
    │
    ▼
Backend (Express)
    │
    │ ✅ Implement OAuth 2.0
    │ ✅ Rate limiting
    │ ✅ API key validation
    │ ✅ Helmet.js security headers
    │ ✅ SQL injection prevention (parameterized queries)
    │
    ▼
Database (Oracle ADB)
    │
    │ ✅ Oracle Wallet for credentials
    │ ✅ IP whitelisting
    │ ✅ Audit logging
    │ ✅ Row-level security
    │
    ▼
Oracle Cloud Infrastructure
    │
    │ ✅ VCN with security lists
    │ ✅ OCI IAM policies
    │ ✅ Vault for secrets
```

---

## 🚀 Deployment Architecture

### Development (Current)
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  localhost  │────▶│  localhost  │────▶│   Oracle    │
│   :3000     │     │   :3001     │     │    Cloud    │
│   React     │     │   Express   │     │     ADB     │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Production (Recommended)
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  CloudFront │────▶│     ALB     │────▶│   Oracle    │
│     CDN     │     │  + ECS/EKS  │     │    Cloud    │
│   (React)   │     │  (Express)  │     │     ADB     │
└─────────────┘     └─────────────┘     └─────────────┘
      │                    │                    │
      │                    │                    │
   Static              Container           Autonomous
   Hosting             Orchestration        Database
```

---

## 📈 Performance Metrics

### Target Performance
- **Page Load**: < 2 seconds
- **API Response**: < 500ms
- **Database Query**: < 200ms
- **Auto-refresh**: Every 30s (configurable)
- **Concurrent Users**: 100+ (with connection pooling)

### Optimization Strategies
1. **Database**: Connection pooling (2-10 connections)
2. **API**: Response caching for stats endpoint
3. **Frontend**: React memoization for large lists
4. **Charts**: Lazy loading for heavy visualizations
5. **Network**: Gzip compression on responses

---

## 🔄 Monitoring & Logging

### Backend Logging Points
- Connection pool status
- API request/response times
- Database query execution times
- Error tracking
- Health check status

### Frontend Logging Points
- Component mount/unmount
- API call successes/failures
- User interactions
- Performance metrics

### Recommended Tools
- **APM**: New Relic, Datadog
- **Logging**: Winston, Morgan
- **Monitoring**: Oracle Cloud Monitoring
- **Alerting**: PagerDuty, Slack

---

This architecture provides a solid foundation for a production-grade insurance claims analytics platform with real-time data updates and AI-powered insights.
