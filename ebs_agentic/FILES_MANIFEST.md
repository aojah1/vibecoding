# 📋 Files Manifest

Complete list of files needed to replicate the EBS AP Analytics Dashboard.

---

## 🎯 Core Application Files

### Backend Files (backend/)

1. **server.js** (or server-http.js)
   - Express backend with API endpoints
   - Handles /api/query, /api/analyze-supplier-stream, /api/execute-action
   - ~350 lines

2. **sqlcl_http_server.py** (or sqlcl_http_server_simple.py)
   - Python HTTP server for SQLcl interaction
   - Handles database queries via subprocess
   - ~150 lines

3. **package.json**
   - Node.js dependencies
   - Scripts: start, dev

4. **.env**
   - Environment variables
   - API keys, database config
   - **DO NOT COMMIT TO GIT**

### Frontend Files (src/)

5. **components/Dashboard.jsx** (or Dashboard-minimal.jsx)
   - Main dashboard component
   - Top 5 suppliers with Analyze buttons
   - ~250 lines

6. **components/SupplierAnalysis.jsx** (or SupplierAnalysis-streaming.jsx)
   - AI analysis modal with chain of thought
   - Charts, recommendations, action execution
   - ~600 lines

7. **services/sqlcl.js**
   - API service for backend communication
   - executeQuery function
   - ~20 lines

8. **App.jsx**
   - Root component
   - Renders Dashboard
   - ~10 lines

9. **main.jsx**
   - React entry point
   - Renders App to DOM
   - ~10 lines

10. **index.css**
    - Global styles
    - Tailwind directives
    - ~20 lines

### Configuration Files (root)

11. **package.json** (root)
    - Frontend dependencies
    - Scripts: dev, build, preview

12. **vite.config.js**
    - Vite configuration
    - Port 3000

13. **tailwind.config.js**
    - Tailwind CSS configuration
    - Content paths

14. **postcss.config.js**
    - PostCSS configuration
    - Tailwind + Autoprefixer

15. **index.html**
    - HTML template
    - Loads React app

---

## 📦 Files You Create Yourself

These files are NOT downloaded - you create them:

1. **backend/.env**
   ```env
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   SQLCL_PATH=/Applications/sqlcl/bin/sql
   SQLCL_CONNECTION=ebs_aby_db_marsh
   PORT=4001
   PYTHON_SERVER_PORT=5001
   ```

2. **SQLcl Saved Connection**
   - Created via SQLcl: `@save connection_name`
   - Stored in ~/.sqlcl/ or similar

---

## 🔄 Auto-Generated Files

These are created automatically when you run `npm install`:

- **node_modules/** (frontend)
- **backend/node_modules/**
- **backend/.venv_backend/** (Python virtual env)

**Do NOT copy these** - they're created during installation.

---

## 📁 Directory Structure

```
ebs_agentic/
├── backend/
│   ├── .env                          ← CREATE THIS
│   ├── package.json                  ← DOWNLOAD
│   ├── server.js                     ← DOWNLOAD
│   ├── sqlcl_http_server.py          ← DOWNLOAD
│   ├── .venv_backend/                ← AUTO-CREATED
│   └── node_modules/                 ← AUTO-CREATED
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx             ← DOWNLOAD
│   │   └── SupplierAnalysis.jsx      ← DOWNLOAD
│   ├── services/
│   │   └── sqlcl.js                  ← DOWNLOAD
│   ├── App.jsx                       ← DOWNLOAD
│   ├── main.jsx                      ← DOWNLOAD
│   └── index.css                     ← DOWNLOAD
├── index.html                        ← DOWNLOAD
├── package.json                      ← DOWNLOAD
├── vite.config.js                    ← DOWNLOAD
├── tailwind.config.js                ← DOWNLOAD
├── postcss.config.js                 ← DOWNLOAD
└── node_modules/                     ← AUTO-CREATED
```

---

## 📝 File Versions

### Which Files to Use?

**Backend Server:**
- ✅ Use: `server-http.js` → rename to `server.js`
- Contains: All API endpoints including streaming analysis

**Python Server:**
- ✅ Use: `sqlcl_http_server_simple.py` → rename to `sqlcl_http_server.py`
- Contains: Direct SQLcl execution without MCP SDK issues

**Dashboard:**
- ✅ Use: `Dashboard-minimal.jsx` → rename to `Dashboard.jsx`
- Contains: Overview with Analyze buttons (no extra tabs)

**Analysis Modal:**
- ✅ Use: `SupplierAnalysis-streaming.jsx` → rename to `SupplierAnalysis.jsx`
- Contains: Chain of thought streaming, charts, actions

**Analysis Endpoints:**
- Already included in `server-http.js`
- Uses UNPAID invoice filter
- Both streaming and non-streaming versions

---

## 🔍 How to Get These Files

From your current installation:

```bash
# Backend files
cd backend
ls -la server.js sqlcl_http_server.py package.json .env

# Frontend files
cd ../src
ls -la components/ services/ App.jsx main.jsx index.css

# Root config files
cd ..
ls -la package.json vite.config.js tailwind.config.js index.html
```

**Copy these files to your new installation** following the directory structure above.

---

## ✅ Minimum Required Files (15 files)

To run the application, you MUST have these 15 files:

**Backend (4):**
1. server.js
2. sqlcl_http_server.py
3. package.json
4. .env

**Frontend Components (3):**
5. src/components/Dashboard.jsx
6. src/components/SupplierAnalysis.jsx
7. src/services/sqlcl.js

**Frontend Core (3):**
8. src/App.jsx
9. src/main.jsx
10. src/index.css

**Configuration (5):**
11. package.json (root)
12. vite.config.js
13. tailwind.config.js
14. postcss.config.js
15. index.html

---

## 📦 Total File Sizes

- **Backend files**: ~50 KB
- **Frontend files**: ~80 KB
- **Config files**: ~10 KB
- **Dependencies** (after npm install): ~500 MB
- **Total project**: ~500 MB

---

## 🚫 Files to Exclude from Git

Create `.gitignore`:
```
node_modules/
.env
.venv_backend/
dist/
.DS_Store
*.log
.cache/
```

---

## 📤 Export Your Current Installation

To export all files from your current installation:

```bash
# Create export directory
mkdir ../ebs_export

# Copy backend
cp -r backend/*.js backend/*.py backend/package.json ../ebs_export/backend/
cp backend/.env.example ../ebs_export/backend/  # Example env file

# Copy frontend
cp -r src ../ebs_export/
cp package.json vite.config.js tailwind.config.js postcss.config.js index.html ../ebs_export/

# Create archive
cd ..
tar -czf ebs_agentic_export.tar.gz ebs_export/
```

Then transfer `ebs_agentic_export.tar.gz` to the new computer.

---

## ✅ Verification

After copying all files, verify:

```bash
# Backend files exist
ls -la backend/server.js backend/sqlcl_http_server.py backend/package.json

# Frontend files exist
ls -la src/components/Dashboard.jsx src/components/SupplierAnalysis.jsx

# Config files exist
ls -la package.json vite.config.js tailwind.config.js index.html

# All 15 required files present
```

Then follow **INSTALL.md** to install dependencies and run.

---

**With these 15 files + dependencies, you have the complete application!** 🎉
