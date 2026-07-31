# 📦 EBS AP Analytics Dashboard - Installation Guide

Complete guide to install and run the EBS AP Analytics Dashboard with AI-powered supplier analysis on a new computer.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Installation Steps](#installation-steps)
4. [Configuration](#configuration)
5. [Running the Application](#running-the-application)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)
8. [Architecture Overview](#architecture-overview)

---

## 🔧 Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version` and `npm --version`

2. **Python** (v3.10 or higher)
   - Download: https://www.python.org/downloads/
   - Verify: `python3 --version` and `pip3 --version`

3. **Oracle SQLcl**
   - Download: https://www.oracle.com/database/sqldeveloper/technologies/sqlcl/
   - Extract to: `/Applications/sqlcl/` (Mac/Linux) or `C:\sqlcl\` (Windows)
   - Verify: `/Applications/sqlcl/bin/sql -version`

   - sudo yum install -y java-11-openjdk

4. **Git** (optional, for version control)
   - Download: https://git-scm.com/

### Required Access

- ✅ **Oracle EBS Database** access credentials
- ✅ **SQLcl saved connection** configured for your EBS database
- ✅ **Anthropic API key** (Claude AI)
  - Get yours at: https://console.anthropic.com/

---

## 💻 System Requirements

- **OS**: macOS, Linux, or Windows 10+
- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 500MB free space
- **Network**: Internet connection for API calls

---

## 📁 Installation Steps

### Step 1: Create Project Directory

```bash
# Create main project directory
mkdir ebs_agentic
cd ebs_agentic

# Create subdirectories
mkdir backend
mkdir src
mkdir src/components
mkdir src/services
```

### Step 2: Setup Backend

#### 2.1 Create Backend Files

```bash
cd backend
```

**Create `package.json`:**
```json
{
  "name": "ebs-ap-backend",
  "version": "1.0.0",
  "description": "Backend for EBS AP Analytics Dashboard",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  }
}
```

**Create `.env` file:**
```env
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
SQLCL_PATH=/Applications/sqlcl/bin/sql
SQLCL_CONNECTION=your_saved_connection_name
PORT=4001
PYTHON_SERVER_PORT=5001
```

**Install dependencies:**
```bash
npm install
```

#### 2.2 Create Python Environment

```bash
# Create virtual environment
python3 -m venv .venv_backend

# Activate virtual environment
# On Mac/Linux:
source .venv_backend/bin/activate
# On Windows:
# .venv_backend\Scripts\activate

# Install Python dependencies
# Upgrade pip first
pip install --upgrade pip

# Install all dependencies
pip install flask flask-cors cx_Oracle
```

#### 2.3 Copy Backend Files

Copy these files to the `backend/` directory:
- `server.js` (or `server-http.js`)
- `sqlcl_http_server.py` (or `sqlcl_http_server_simple.py`)

### Step 3: Setup Frontend

```bash
cd ..  # Back to ebs_agentic root
```

**Create `package.json`:**
```json
{
  "name": "ebs-ap-analytics",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.10.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6"
  }
}
```

**Install dependencies:**
```bash
npm install
```

#### 3.1 Create Configuration Files

**Create `vite.config.js`:**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  }
})
```

**Create `tailwind.config.js`:**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Create `postcss.config.js`:**
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Create `index.html`:**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EBS AP Analytics Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

#### 3.2 Create Source Files

**Create `src/main.jsx`:**
```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**Create `src/index.css`:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
```

**Create `src/App.jsx`:**
```javascript
import React from 'react';
import Dashboard from './components/Dashboard';

function App() {
  return <Dashboard />;
}

export default App;
```

#### 3.3 Copy Frontend Components

Copy these files to `src/components/`:
- `Dashboard.jsx` (Dashboard-minimal.jsx)
- `SupplierAnalysis.jsx` (SupplierAnalysis-streaming.jsx)

**Create `src/services/sqlcl.js`:**
```javascript
const BACKEND_URL = 'http://localhost:4001';

export const executeQuery = async (sql) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Query error:', error);
    return { success: false, error: error.message };
  }
};

export default { executeQuery };
```

---

## ⚙️ Configuration

### 1. Configure SQLcl Connection

**Create saved connection in SQLcl:**

```bash
# Start SQLcl
/Applications/sqlcl/bin/sql /nolog

# Create connection
SQL> set cloudconfig /path/to/wallet  # If using Oracle Cloud
SQL> connect username@connection_string

# Save connection
SQL> @save ebs_aby_db_marsh

# Verify saved connections
SQL> @list

# Exit
SQL> exit
```

**Update `.env` with your connection name:**
```env
SQLCL_CONNECTION=ebs_aby_db_marsh
```

### 2. Configure Anthropic API Key

1. Sign up at https://console.anthropic.com/
2. Create an API key
3. Update `.env`:
```env
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxx
```

### 3. Verify Database Access

Test your SQLcl connection:
```bash
/Applications/sqlcl/bin/sql -name ebs_aby_db_marsh

# Should connect without password prompt
# Test query:
SQL> SELECT COUNT(*) FROM ap.ap_suppliers;
SQL> exit
```

---

## 🚀 Running the Application

lsof -nP -iTCP:4000 -iTCP:4001 -iTCP:5001 -sTCP:LISTEN

sudo lsof -ti :4001 -ti :5001 -ti :4000 | xargs -r sudo kill -9

sudo ss -lntp | grep -E '4001|5001|4000' || echo "All ports are free"

sudo lsof -ti :4000 | xargs -r sudo kill -9

### Terminal 1: Start Backend

```bash
cd ebs_agentic/backend

# Activate Python virtual environment (if not already active)
source .venv_backend/bin/activate  # Mac/Linux
# .venv_backend\Scripts\activate   # Windows

# Start backend python http server

sudo lsof -ti :5001 | xargs -r sudo kill -9

### PYTHON SERVER

PYTHON_SERVER_PORT=5001 SERVER_HOST=localhost SQLCL_PATH=/Applications/sqlcl/bin/sql \
  .venv_backend/bin/python3 -u sqlcl_http_server.py

  PYTHON_SERVER_PORT=5001 SERVER_HOST=localhost SQLCL_PATH=/Applications/sqlcl/bin/sql \
  python3 -u sqlcl_http_server.py

# On OCI Server
PYTHON_SERVER_PORT=5001 SERVER_HOST=0.0.0.0 SQLCL_PATH=/home/opc/sqlcl/bin/sql \
  nohup python3.13 -u sqlcl_http_server.py > python_server.log 2>&1 &

tail -f python_server.log



#### NODE BACKEND
#PORT=4001 HOST=0.0.0.0 node server.js &
env HOST=localhost PORT=4001 node server.js 

# On OCI Server

nohup env HOST=0.0.0.0 PORT=4001 node server.js \
  > server.log 2>&1 &
tail -f server.log


# Working Code 
HOST=0.0.0.0 PORT=4001 pm2 start server.js --name backend

pm2 status
pm2 logs frontend


```

**Expected output:**
```
🐍 Starting Python HTTP server...
[Python] ============================================================
[Python] 🚀 SQLcl HTTP Server Starting (DIRECT MODE)
[Python] ============================================================
[Python] 📡 Port: 5001
[Python] 📊 SQLcl: /Applications/sqlcl/bin/sql
[Python] 🔌 Connection: ebs_aby_db_marsh
[Python] ============================================================
[Python] Testing SQLcl connection...
[Python] 📊 Executing: SELECT 'OK' as status FROM dual...
[Python] ✅ Returned 1 rows
[Python] ✅ SQLcl connection test passed
[Python] ✅ Server running on http://localhost:5001
✅ Python server ready

============================================================
🚀 EBS AP Analytics - Backend Server (HTTP Mode)
============================================================
📡 Node Server: http://localhost:4001
🐍 Python Server: http://localhost:5001
🔑 API Key: ✅
============================================================
```

### Terminal 2: Start Frontend

```bash
cd ebs_agentic

# Start frontend development server
npm run dev -- --host localhost --port 4001

# On OCI Server

nohup npm run dev -- --host 0.0.0.0 --port 4000 \
  > frontend.log 2>&1 &
tail -f frontend.log

# Working code 

npm install -g pm2

pm2 start npm --name frontend -- run dev -- --host 0.0.0.0 --port 4000

pm2 status
pm2 logs frontend


```

**Expected output:**
```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:4000/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

### Access Application

Open your browser and navigate to:
```
http://localhost:4000
```

---

## ✅ Verification

### 1. Backend Health Check

```bash
curl http://localhost:4001/health
```

**Should return:**
```json
{
  "status": "ok",
  "hasApiKey": true,
  "pythonServerReady": true,
  "timestamp": "2026-01-29T..."
}
```

### 2. Test Database Query

```bash
curl -X POST http://localhost:4001/api/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT COUNT(*) as count FROM ap.ap_suppliers"}'
```

**Should return:**
```json
{
  "success": true,
  "data": [{"count": "25"}],
  "rowCount": 1
}
```

### 3. Frontend Verification

Open http://localhost:3000 and verify:
- ✅ Dashboard loads with 4 summary cards
- ✅ Top 5 suppliers bar chart appears
- ✅ Supplier list shows with "Analyze" buttons
- ✅ Click "Analyze" opens chain of thought modal
- ✅ AI analysis completes successfully

---

## 🐛 Troubleshooting

### Issue 1: Port Already in Use

**Error:** `EADDRINUSE: address already in use`

**Solution:**
```bash
# Find and kill process on port
lsof -ti:4001 | xargs kill -9  # Backend
lsof -ti:4000 | xargs kill -9  # Frontend
lsof -ti:5001 | xargs kill -9  # Python
```

### Issue 2: Python Module Not Found

**Error:** `ModuleNotFoundError: No module named 'mcp'`

**Solution:**
```bash
cd backend
source .venv_backend/bin/activate
pip3 install mcp --break-system-packages
```

### Issue 3: SQLcl Connection Failed

**Error:** `SP2-0640: Not connected`

**Solution:**
```bash
# Test SQLcl directly
/Applications/sqlcl/bin/sql -name ebs_aby_db_marsh

# If fails, recreate saved connection
/Applications/sqlcl/bin/sql /nolog
SQL> connect username@connection_string
SQL> @save ebs_aby_db_marsh
```

### Issue 4: Blank Dashboard

**Error:** Dashboard shows nothing

**Solution:**
```bash
# Install missing dependency
npm install recharts

# Clear cache and restart
rm -rf node_modules/.cache
npm run dev
```

### Issue 5: API Key Not Configured

**Error:** `Anthropic API key not configured`

**Solution:**
```bash
# Check .env file exists
cat backend/.env

# Should show:
# ANTHROPIC_API_KEY=sk-ant-...

# If missing, create it:
echo 'ANTHROPIC_API_KEY=sk-ant-your-key-here' > backend/.env
```

### Issue 6: CORS Error

**Error:** `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution:**
Backend already includes CORS middleware. If error persists:
```bash
cd backend
npm install cors
# Restart backend
```

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Browser (Port 4000)                    │
│                  React + Vite + Tailwind                  │
│              Dashboard with AI Analysis UI                │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTP/REST API
                         │
┌────────────────────────▼─────────────────────────────────┐
│              Node.js Backend (Port 4001)                  │
│           Express + CORS + Anthropic API                  │
│          Handles /api/query, /api/chat, etc.              │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTP
                         │
┌────────────────────────▼─────────────────────────────────┐
│           Python HTTP Server (Port 5001)                  │
│              SQLcl subprocess execution                   │
│              CSV parsing and response                     │
└────────────────────────┬─────────────────────────────────┘
                         │ subprocess
                         │
┌────────────────────────▼─────────────────────────────────┐
│                  Oracle SQLcl (subprocess)                │
│              Uses saved connection (-name)                │
│              Returns CSV formatted results                │
└────────────────────────┬─────────────────────────────────┘
                         │ JDBC
                         │
┌────────────────────────▼─────────────────────────────────┐
│                Oracle EBS Database                        │
│               AP Schema (Invoices, Suppliers)             │
│              Analysis Date: 10-OCT-2010                   │
└──────────────────────────────────────────────────────────┘
```

---

## 📝 File Structure

```
ebs_agentic/
├── backend/
│   ├── .env                          # Configuration
│   ├── package.json                  # Node dependencies
│   ├── server.js                     # Express backend
│   ├── sqlcl_http_server.py          # Python SQLcl server
│   ├── .venv_backend/                # Python virtual env
│   └── node_modules/                 # Node dependencies
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx             # Main dashboard
│   │   └── SupplierAnalysis.jsx      # AI analysis modal
│   ├── services/
│   │   └── sqlcl.js                  # API service
│   ├── App.jsx                       # Root component
│   ├── main.jsx                      # Entry point
│   └── index.css                     # Global styles
├── index.html                        # HTML template
├── package.json                      # Frontend dependencies
├── vite.config.js                    # Vite configuration
├── tailwind.config.js                # Tailwind configuration
├── postcss.config.js                 # PostCSS configuration
└── node_modules/                     # Frontend dependencies
```

---

## 🔐 Security Notes

1. **Never commit `.env` file** to version control
2. **Keep API keys private** - don't share your Anthropic key
3. **Database credentials** - use saved SQLcl connections, not hardcoded passwords
4. **Production deployment** - use environment variables, not .env files

---

## 📚 Additional Resources

- **Vite Documentation**: https://vitejs.dev/
- **React Documentation**: https://react.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **Recharts**: https://recharts.org/
- **Anthropic Claude API**: https://docs.anthropic.com/
- **Oracle SQLcl**: https://www.oracle.com/database/sqldeveloper/technologies/sqlcl/

---

## 🆘 Getting Help

If you encounter issues:

1. Check backend logs (Terminal 1)
2. Check frontend console (Browser F12)
3. Verify all dependencies installed
4. Check .env configuration
5. Test SQLcl connection manually
6. Verify Oracle database access

---

## ✅ Installation Checklist

- [ ] Node.js installed (v18+)
- [ ] Python installed (v3.10+)
- [ ] SQLcl installed and configured
- [ ] SQLcl saved connection created
- [ ] Anthropic API key obtained
- [ ] Project directories created
- [ ] Backend dependencies installed (`npm install` in backend/)
- [ ] Python dependencies installed (`pip3 install mcp`)
- [ ] Frontend dependencies installed (`npm install` in root)
- [ ] `.env` file created and configured
- [ ] All component files copied
- [ ] Backend starts successfully (Port 4001)
- [ ] Python server starts successfully (Port 5001)
- [ ] Frontend starts successfully (Port 3000)
- [ ] Dashboard loads in browser
- [ ] Can query database
- [ ] AI analysis works

---

## 🎉 Success!

If all checks pass, you now have a fully functional EBS AP Analytics Dashboard with:
- ✅ Real-time Oracle database queries
- ✅ AI-powered supplier analysis
- ✅ Interactive charts and visualizations
- ✅ Chain-of-thought streaming AI
- ✅ Human-in-the-loop action approval
- ✅ Simulated action execution

**Enjoy analyzing your AP data with AI!** 🚀
