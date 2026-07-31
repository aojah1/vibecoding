# 🚀 Quick Start Reference

One-page reference for running the EBS AP Analytics Dashboard.

---

## ⚡ Prerequisites Installed?

```bash
node --version    # Should be v18+
python3 --version # Should be v3.10+
/Applications/sqlcl/bin/sql -version
```

---

## 📦 Install Dependencies

```bash
# Backend
cd backend
npm install
pip3 install mcp --break-system-packages

# Frontend
cd ..
npm install
```

---

## ⚙️ Configure

**Create `backend/.env`:**
```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
SQLCL_PATH=/Applications/sqlcl/bin/sql
SQLCL_CONNECTION=ebs_aby_db_marsh
PORT=4001
```

**Create SQLcl saved connection:**
```bash
/Applications/sqlcl/bin/sql /nolog
SQL> connect username@connection_string
SQL> @save ebs_aby_db_marsh
SQL> exit
```

---

## 🏃 Run Application

### Terminal 1 - Backend:
```bash
cd backend
# Start backend python http server

PYTHON_SERVER_PORT=5001 SERVER_HOST=localhost SQLCL_PATH=/Applications/sqlcl/bin/sql \
  .venv_backend/bin/python3 -u sqlcl_http_server.py

# On OCI Server
PYTHON_SERVER_PORT=5001 SERVER_HOST=0.0.0.0 SQLCL_PATH=/home/opc/sqlcl/sqlcl/bin/sql \
  nohup .venv_backend/bin/python3 -u sqlcl_http_server.py > python_server.log 2>&1 &

tail -f python_server.log

#PORT=4001 HOST=0.0.0.0 node server.js &
env HOST=localhost PORT=4001 node server.js 

# On OCI Server

nohup env HOST=0.0.0.0 PORT=4001 node server.js \
  > server.log 2>&1 &

tail -f server.log
```

### Terminal 2 - Frontend:
```bash
cd ebs_agentic

npm run dev -- --host localhost --port 4000

# On OCI Server

nohup npm run dev -- --host 0.0.0.0 --port 4000 \
  > frontend.log 2>&1 &
```

### Browser:
```
http://localhost:4000
```

---

## ✅ Quick Test

```bash
# Health check
curl http://localhost:4001/health

# Database test
curl -X POST http://localhost:4001/api/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT COUNT(*) FROM ap.ap_suppliers"}'
```

---

## 🐛 Quick Fixes

**Port in use:**
```bash
lsof -ti:5001 | xargs kill -9
lsof -ti:4001 | xargs kill -9
lsof -ti:4000 | xargs kill -9
```

**Python error:**
```bash
cd backend
source .venv_backend/bin/activate
pip3 install mcp --break-system-packages
```

**Blank dashboard:**
```bash
npm install recharts
```

---

## 📁 Required Files

**Backend:**
- server.js (or server-http.js)
- sqlcl_http_server.py (or sqlcl_http_server_simple.py)
- package.json
- .env

**Frontend:**
- src/components/Dashboard.jsx
- src/components/SupplierAnalysis.jsx
- src/services/sqlcl.js
- src/App.jsx
- src/main.jsx
- src/index.css
- package.json
- vite.config.js
- tailwind.config.js
- index.html
- .env

---

## 🎯 Ports

- Frontend: **4000**
- Backend: **4001**
- Python: **5001**

---

## 📚 Full Guide

See **INSTALL.md** for complete installation instructions.
