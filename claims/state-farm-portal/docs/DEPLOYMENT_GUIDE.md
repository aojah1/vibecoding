# State Farm Live Portal - Deployment Guide

## 🎯 Overview
This application connects to your Oracle Autonomous Database (VIBECODING_MEDIUM) and displays real-time insurance claims data with AI analytics.

---

## 📋 Prerequisites

### 1. **Oracle Database Requirements**
- Oracle Autonomous Database instance (VIBECODING_MEDIUM)
- Database connection details:
  - Username (typically `ADMIN`)
  - Password
  - Connection string (from Oracle Cloud Console)
- Required tables: `CLAIMS`, `ADJUSTERS`, `DAMAGES`

### 2. **Software Requirements**
- Node.js (v16 or higher)
- npm or yarn
- Oracle Instant Client (for oracledb package)

---

## 🚀 Installation Steps

### Step 1: Install Oracle Instant Client

**For macOS:**
```bash
# Download from Oracle website or use Homebrew
brew tap InstantClientTap/instantclient
brew install instantclient-basic
```

**For Linux (Ubuntu/Debian):**
```bash
# Download the Oracle Instant Client RPM/DEB from Oracle's website
# Then install it
sudo apt-get update
sudo apt-get install alien libaio1
alien -i oracle-instantclient-basic-*.rpm
```

**For Windows:**
1. Download from Oracle website
2. Extract to C:\oracle\instantclient_XX_X
3. Add to PATH environment variable

### Step 2: Set up the Backend

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Copy the environment template
cp .env.template .env

# Edit .env with your actual database credentials
nano .env  # or use your preferred editor
```

### Step 3: Configure Database Connection

Edit the `.env` file with your Oracle credentials:

```env
DB_USER=ADMIN
DB_PASSWORD=YourActualPassword123!
DB_CONNECT_STRING=(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1522)(host=your-host.oraclecloud.com))(connect_data=(service_name=your_service_name_high.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))
PORT=3001
```

**To get your connection string:**
1. Log into Oracle Cloud Console
2. Go to Autonomous Database → VIBECODING_MEDIUM
3. Click "DB Connection"
4. Download the Wallet (if required)
5. Copy the connection string for your service level (HIGH, MEDIUM, or LOW)

### Step 4: Verify Database Schema

Make sure your Oracle database has the required tables with these columns:

**CLAIMS table:**
- CLAIM_ID, CLAIM_NUMBER, CLAIM_TYPE, CLAIM_SUBTYPE
- POLICY_NUMBER, CUSTOMER_NAME, CUSTOMER_EMAIL, CUSTOMER_PHONE
- INCIDENT_DATE, STATUS, PRIORITY, PERIL_CODE
- ESTIMATED_LOSS, AI_CONFIDENCE_SCORE
- ADJUSTER_ID, ADJUSTER_NAME, CREATED_DATE

**ADJUSTERS table:**
- ADJUSTER_ID, ADJUSTER_NAME, EMAIL, PHONE
- SPECIALIZATION, HIRE_DATE

**DAMAGES table:**
- DAMAGE_ID, CLAIM_ID, DAMAGE_TYPE
- DAMAGE_DESCRIPTION, SEVERITY
- ESTIMATED_REPAIR_COST, ASSESSMENT_DATE

### Step 5: Start the Backend Server

```bash
# Start the server
npm start

# Or for development with auto-reload
npm run dev
```

You should see:
```
✅ Oracle connection pool created successfully
🚀 Server running on http://localhost:3001
📊 API endpoints available at http://localhost:3001/api/*
❤️  Health check: http://localhost:3001/health
```

### Step 6: Test the API

```bash
# Test the health endpoint
curl http://localhost:3001/health

# Test the claims endpoint
curl http://localhost:3001/api/claims

# Test the adjusters endpoint
curl http://localhost:3001/api/adjusters
```

### Step 7: Set up the Frontend

```bash
# In a new terminal, navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the React app
npm start
```

The app should open at `http://localhost:3000` and automatically connect to the backend at `http://localhost:3001`.

---

## 🔧 Troubleshooting

### Issue: "ORA-12154: TNS:could not resolve the connect identifier"
**Solution:** Check your connection string format. It should be a complete TNS descriptor.

### Issue: "DPI-1047: Cannot locate a 64-bit Oracle Client library"
**Solution:** Install Oracle Instant Client and ensure it's in your system PATH.

### Issue: "Connection pool creation failed"
**Solution:** 
- Verify your credentials in `.env`
- Check network connectivity to Oracle Cloud
- Ensure your IP is whitelisted in Oracle Cloud ACL

### Issue: Frontend shows "Connection Error"
**Solution:**
- Ensure backend is running on port 3001
- Check CORS is enabled in server.js
- Verify firewall allows localhost:3001

### Issue: "Cannot find module 'oracledb'"
**Solution:**
```bash
npm install oracledb --save
# If it fails, you may need to install build tools first
```

---

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/claims` | GET | Get all claims |
| `/api/claims/:id` | GET | Get single claim |
| `/api/adjusters` | GET | Get all adjusters |
| `/api/damages` | GET | Get all damages |
| `/api/stats` | GET | Get dashboard statistics |

---

## 🎨 Features

- ✅ **Real-time data** from Oracle Autonomous Database
- ✅ **AI confidence scoring** for claims
- ✅ **Interactive dashboard** with charts and KPIs
- ✅ **Live claims feed** with auto-refresh (30s)
- ✅ **Claim detail views** with full information
- ✅ **Adjuster management** and workload tracking
- ✅ **Damage assessments** with severity indicators
- ✅ **AI insights** for low-confidence claims

---

## 🔐 Security Notes

- **Never commit `.env` file** to version control
- Use **environment variables** for production
- Implement **authentication** for production use
- Use **Oracle Wallet** for secure credential storage
- Enable **SSL/TLS** for database connections
- Consider using **Oracle Cloud IAM** for authentication

---

## 📈 Performance Optimization

1. **Connection Pooling:** Already configured (2-10 connections)
2. **Query Optimization:** Add indexes on frequently queried columns
3. **Caching:** Consider Redis for frequently accessed data
4. **Pagination:** Implement for large datasets
5. **Compression:** Enable gzip compression in Express

---

## 🎯 Next Steps

1. ✅ Complete database setup with sample data
2. ✅ Configure Oracle connection
3. ✅ Test backend API endpoints
4. ✅ Launch frontend application
5. ⬜ Add user authentication
6. ⬜ Implement real-time WebSocket updates
7. ⬜ Add export/reporting features
8. ⬜ Deploy to production

---

## 📞 Support

For issues or questions:
- Check Oracle Cloud documentation
- Review Node.js oracledb documentation
- Verify network connectivity and credentials
- Check server logs for detailed error messages

---

## 📝 License

MIT License - See LICENSE file for details
