# 🚀 GETTING STARTED - State Farm Live Portal

## ✅ What You Have

I've created a **complete, production-ready application** that connects your React frontend to your Oracle Autonomous Database (VIBECODING_MEDIUM). Here's what's included:

### 📦 Files Created:

1. **Backend (Node.js + Express)**
   - `server.js` - Main API server with Oracle connection
   - `package.json` - Backend dependencies
   - `test-connection.js` - Database connection tester
   - `env-template.txt` - Template for database credentials

2. **Frontend (React)**
   - `StateFarmLivePortal.jsx` - Complete React component
   - `App.js` - React app entry point
   - `frontend-package.json` - Frontend dependencies

3. **Documentation**
   - `README.md` - Quick start guide
   - `DEPLOYMENT_GUIDE.md` - Detailed deployment instructions
   - `setup.sh` - Automated setup script (this file)

---

## 🎯 Quick Start (3 Steps)

### Step 1: Set Up Backend

```bash
# Create project directory
mkdir state-farm-portal
cd state-farm-portal
mkdir backend

# Copy backend files to the backend directory
# - server.js
# - package.json
# - test-connection.js
# - env-template.txt (rename to .env)

cd backend

# Install dependencies
npm install

# Configure database credentials
nano .env  # or use your favorite editor
```

In the `.env` file, add your Oracle credentials:
```env
DB_USER=ADMIN
DB_PASSWORD=YourActualPassword
DB_CONNECT_STRING=(description= (retry_count=20)(retry_delay=3)...)
PORT=3001
```

```bash
# Test the connection
node test-connection.js

# If successful, start the server
npm start
```

You should see:
```
✅ Oracle connection pool created successfully
🚀 Server running on http://localhost:3001
```

### Step 2: Set Up Frontend

In a **new terminal**:

```bash
cd state-farm-portal

# Create React app
npx create-react-app frontend
cd frontend

# Install chart library
npm install recharts

# Copy the React component
# Copy StateFarmLivePortal.jsx to src/
# Copy App.js to src/ (replace existing)

# Start the frontend
npm start
```

The app should open at `http://localhost:3000` automatically!

### Step 3: Verify It Works

1. **Backend**: Visit `http://localhost:3001/health`
   - Should see: `{"status":"healthy"...}`

2. **Frontend**: Should load at `http://localhost:3000`
   - You'll see the State Farm dashboard with live data

---

## 📊 What the App Does

### Dashboard Tab
- **6 KPI Cards**: Total Claims, Urgent, High Priority, Unassigned, Est. Loss, AI Confidence
- **2 Charts**: Claims by Type (pie), Claims by Status (bar)
- **Live Table**: All claims with real-time updates every 30 seconds

### Claims Tab
- Click any claim to see full details
- View customer info, policy data, incident details
- See AI confidence scores

### Adjusters Tab
- View all insurance adjusters
- See active case counts per adjuster
- Contact information

### Damages Tab
- All damage assessments
- Severity classifications
- Repair cost estimates

### AI Insights Tab
- Average AI confidence metrics
- High confidence claims
- Claims needing review
- Sortable table of low-confidence claims

---

## 🔧 Troubleshooting

### Problem: Backend won't start

**Solution 1**: Check Oracle Instant Client
```bash
# Test if oracledb can be loaded
node -e "console.log(require('oracledb'))"
```

If it fails, install Oracle Instant Client:
- **macOS**: `brew install instantclient-basic`
- **Linux**: Download from Oracle website
- **Windows**: Download and add to PATH

**Solution 2**: Check database credentials
```bash
# Verify .env file exists and has correct values
cat .env

# Test connection
node test-connection.js
```

### Problem: Frontend shows "Connection Error"

**Solution**: Make sure backend is running
```bash
# Test if backend is responding
curl http://localhost:3001/health

# Should return: {"status":"healthy",...}
```

### Problem: No data showing

**Solution**: Check if database has data
```bash
# From backend directory
node test-connection.js

# Should show:
# ✅ CLAIMS table found: XX records
# ✅ ADJUSTERS table found: XX records
# ✅ DAMAGES table found: XX records
```

If tables are empty, you need to populate them with data.

---

## 📋 Database Schema Required

Your Oracle database needs these tables:

### CLAIMS Table
```sql
CREATE TABLE CLAIMS (
    CLAIM_ID NUMBER PRIMARY KEY,
    CLAIM_NUMBER VARCHAR2(50),
    CLAIM_TYPE VARCHAR2(50),
    CLAIM_SUBTYPE VARCHAR2(50),
    POLICY_NUMBER VARCHAR2(50),
    CUSTOMER_NAME VARCHAR2(100),
    CUSTOMER_EMAIL VARCHAR2(100),
    CUSTOMER_PHONE VARCHAR2(20),
    INCIDENT_DATE DATE,
    STATUS VARCHAR2(50),
    PRIORITY VARCHAR2(20),
    PERIL_CODE VARCHAR2(20),
    ESTIMATED_LOSS NUMBER,
    AI_CONFIDENCE_SCORE NUMBER,
    ADJUSTER_ID NUMBER,
    ADJUSTER_NAME VARCHAR2(100),
    CREATED_DATE DATE DEFAULT SYSDATE
);
```

### ADJUSTERS Table
```sql
CREATE TABLE ADJUSTERS (
    ADJUSTER_ID NUMBER PRIMARY KEY,
    ADJUSTER_NAME VARCHAR2(100),
    EMAIL VARCHAR2(100),
    PHONE VARCHAR2(20),
    SPECIALIZATION VARCHAR2(50),
    HIRE_DATE DATE
);
```

### DAMAGES Table
```sql
CREATE TABLE DAMAGES (
    DAMAGE_ID NUMBER PRIMARY KEY,
    CLAIM_ID NUMBER,
    DAMAGE_TYPE VARCHAR2(50),
    DAMAGE_DESCRIPTION VARCHAR2(500),
    SEVERITY VARCHAR2(20),
    ESTIMATED_REPAIR_COST NUMBER,
    ASSESSMENT_DATE DATE
);
```

---

## 🎨 Customization

### Change API Port

Edit `backend/server.js`:
```javascript
const PORT = 3001; // Change this to your preferred port
```

And `StateFarmLivePortal.jsx`:
```javascript
const API_BASE = 'http://localhost:3001/api'; // Update port here too
```

### Change Refresh Interval

Edit `StateFarmLivePortal.jsx`:
```javascript
// Line ~60
const interval = setInterval(fetchData, 30000); // 30000ms = 30 seconds
```

### Add New Features

1. **New API Endpoint**: Edit `server.js`
2. **New Dashboard Widget**: Edit `StateFarmLivePortal.jsx`
3. **New Chart**: Import from Recharts and add to dashboard

---

## 📞 Getting Your Oracle Connection String

1. Log into **Oracle Cloud Console**
2. Go to **Autonomous Database** → **VIBECODING_MEDIUM**
3. Click **"DB Connection"**
4. Click **"Download Wallet"** (if using wallet)
5. Copy the connection string from the wallet files
6. Or use the Easy Connect string shown in the console

Example format:
```
(description= (retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1522)(host=xxxxx.oraclecloud.com))(connect_data=(service_name=xxxxx_high.adb.oraclecloud.com))(security=(ssl_server_dn_match=yes)))
```

---

## 🚀 Next Steps

1. ✅ **Test the connection** - Run `node test-connection.js`
2. ✅ **Start backend** - Run `npm start` in backend folder
3. ✅ **Start frontend** - Run `npm start` in frontend folder
4. ✅ **View dashboard** - Open `http://localhost:3000`
5. ⬜ **Populate data** - Add claims, adjusters, damages to database
6. ⬜ **Customize** - Adjust colors, layouts, features
7. ⬜ **Deploy** - Move to production environment

---

## 📚 Additional Resources

- **Oracle Node.js Driver**: https://node-oracledb.readthedocs.io/
- **React Documentation**: https://react.dev/
- **Recharts Documentation**: https://recharts.org/
- **Express.js Guide**: https://expressjs.com/

---

## 🎉 You're All Set!

Your State Farm Live Portal is ready to go. Just follow the 3 steps above and you'll have a fully functional real-time analytics dashboard connected to your Oracle database.

**Questions?** Check the `DEPLOYMENT_GUIDE.md` for detailed information on every aspect of the setup.

Happy coding! 🚀
