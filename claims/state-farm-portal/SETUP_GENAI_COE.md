# 🚀 SETUP GUIDE FOR /Users/aojah/Documents/GenAI-CoE

## 📍 Installation Location
**Target Directory:** `/Users/aojah/Documents/GenAI-CoE/state-farm-portal`

---

## ⚡ QUICK INSTALLATION (2 Minutes)

### Option 1: Automated Installation (Recommended)

1. **Download the installation script:**
   - Download: `install-to-genai-coe.sh`
   - Make it executable: `chmod +x install-to-genai-coe.sh`

2. **Run the installer:**
   ```bash
   ./install-to-genai-coe.sh
   ```

3. **Done!** The script will:
   - Create `/Users/aojah/Documents/GenAI-CoE/state-farm-portal`
   - Copy all files (backend, frontend, docs, utilities)
   - Create startup scripts
   - Set up configuration templates
   - Open the folder in Finder

---

### Option 2: Manual Installation

```bash
# 1. Create the directory
mkdir -p /Users/aojah/Documents/GenAI-CoE/state-farm-portal
cd /Users/aojah/Documents/GenAI-CoE/state-farm-portal

# 2. Create subdirectories
mkdir backend frontend docs

# 3. Copy backend files to backend/
#    - server.js
#    - test-connection.js
#    - package.json
#    - .env.template → rename to .env

# 4. Copy frontend files to frontend/
#    - StateFarmLivePortal.jsx
#    - App.js
#    - package.json (the frontend one)

# 5. Copy documentation to docs/
#    - All .md and .txt files

# 6. Copy utilities to root
#    - setup.sh
#    - sample-data.sql
```

---

## 📂 Project Structure After Installation

```
/Users/aojah/Documents/GenAI-CoE/state-farm-portal/
│
├── backend/                          ← Backend server
│   ├── server.js                     ← Express API
│   ├── test-connection.js            ← Connection tester
│   ├── package.json                  ← Dependencies
│   ├── .env.template                 ← Config template
│   └── .env                          ← Your config (create from template)
│
├── frontend/                         ← React application
│   ├── StateFarmLivePortal.jsx       ← Main component
│   ├── App.js                        ← App entry
│   └── package.json                  ← Dependencies
│
├── docs/                             ← All documentation
│   ├── _START_HERE.txt              ← Read first!
│   ├── UPDATE_SUMMARY.md            ← What's new
│   ├── ES_MODULES_SETUP.md          ← Wallet setup
│   ├── GETTING_STARTED.md           ← Quick start
│   ├── INDEX.md                     ← File navigation
│   ├── PROJECT_SUMMARY.md           ← Complete overview
│   ├── README.md                    ← Project overview
│   ├── DEPLOYMENT_GUIDE.md          ← Deployment guide
│   ├── ARCHITECTURE.md              ← System design
│   └── QUICK_REFERENCE.txt          ← Cheat sheet
│
├── start-backend.sh                  ← Start backend script
├── start-frontend.sh                 ← Start frontend script
├── test-db.sh                        ← Test DB connection
├── sample-data.sql                   ← Test data
├── README.md                         ← This location's README
└── INSTALLATION.md                   ← Installation status
```

---

## ⚙️ Configuration Steps

### Step 1: Configure Oracle Database

```bash
cd /Users/aojah/Documents/GenAI-CoE/state-farm-portal/backend
nano .env
```

Add your credentials:

```env
# Oracle Database Configuration
DB_USER=ADMIN
DB_PASSWORD=YourActualPassword123!
DB_CONNECT_STRING=vibecoding_medium
TNS_ADMIN=/Users/aojah/Documents/GenAI-CoE/wallet
WALLET_PASSWORD=
PORT=3001
```

### Step 2: Download Oracle Wallet (If Using Wallet)

1. **Log into Oracle Cloud Console**
2. **Go to:** Autonomous Database → VIBECODING_MEDIUM
3. **Click:** "DB Connection"
4. **Download Wallet**
5. **Extract to:** `/Users/aojah/Documents/GenAI-CoE/wallet`

Your wallet directory should contain:
- `cwallet.sso`
- `tnsnames.ora`
- `sqlnet.ora`
- `ewallet.p12`

### Step 3: Update .env with Wallet Path

```env
TNS_ADMIN=/Users/aojah/Documents/GenAI-CoE/wallet
```

---

## 🚀 Starting the Application

### Terminal 1: Backend

```bash
cd /Users/aojah/Documents/GenAI-CoE/state-farm-portal
./start-backend.sh
```

Or manually:
```bash
cd /Users/aojah/Documents/GenAI-CoE/state-farm-portal/backend
npm install
npm start
```

**Expected output:**
```
✅ Oracle connection pool created successfully
🚀 State Farm Backend Server Started
📊 Server running:     http://localhost:3001
```

### Terminal 2: Frontend

```bash
cd /Users/aojah/Documents/GenAI-CoE/state-farm-portal
./start-frontend.sh
```

Or manually:
```bash
cd /Users/aojah/Documents/GenAI-CoE/state-farm-portal/frontend

# First time only - create React app
npx create-react-app .
npm install recharts

# Copy your files to src/
cp StateFarmLivePortal.jsx src/
cp App.js src/

# Start
npm start
```

**Opens:** http://localhost:3000

---

## 🧪 Testing

### Test Database Connection

```bash
cd /Users/aojah/Documents/GenAI-CoE/state-farm-portal
./test-db.sh
```

Or manually:
```bash
cd /Users/aojah/Documents/GenAI-CoE/state-farm-portal/backend
npm run test
```

**Expected output:**
```
✅ Connection successful!
✅ CLAIMS table found: 10 records
✅ ADJUSTERS table found: 5 records
✅ DAMAGES table found: 11 records
✅ Connection pool created successfully!
```

---

## 📝 Quick Commands Reference

All from: `/Users/aojah/Documents/GenAI-CoE/state-farm-portal`

```bash
# Navigate to project
cd /Users/aojah/Documents/GenAI-CoE/state-farm-portal

# Test database
./test-db.sh

# Start backend
./start-backend.sh

# Start frontend (new terminal)
./start-frontend.sh

# View documentation
open docs/_START_HERE.txt

# Edit configuration
nano backend/.env

# View logs
# Backend runs in terminal, watch output
# Frontend opens browser automatically
```

---

## 🗂️ File Aliases (For Easy Access)

Add to your `~/.zshrc` or `~/.bash_profile`:

```bash
# State Farm Portal Aliases
alias sfp='cd /Users/aojah/Documents/GenAI-CoE/state-farm-portal'
alias sfp-backend='cd /Users/aojah/Documents/GenAI-CoE/state-farm-portal/backend'
alias sfp-frontend='cd /Users/aojah/Documents/GenAI-CoE/state-farm-portal/frontend'
alias sfp-docs='cd /Users/aojah/Documents/GenAI-CoE/state-farm-portal/docs'
alias sfp-start='cd /Users/aojah/Documents/GenAI-CoE/state-farm-portal && ./start-backend.sh'
alias sfp-test='cd /Users/aojah/Documents/GenAI-CoE/state-farm-portal && ./test-db.sh'
```

Then reload:
```bash
source ~/.zshrc
```

Now you can use:
```bash
sfp          # Go to project
sfp-backend  # Go to backend
sfp-start    # Start backend
sfp-test     # Test connection
```

---

## 🎯 First Time Setup Checklist

- [ ] Project files installed to `/Users/aojah/Documents/GenAI-CoE/state-farm-portal`
- [ ] Oracle Wallet downloaded to `/Users/aojah/Documents/GenAI-CoE/wallet`
- [ ] `backend/.env` created from template
- [ ] Oracle credentials added to `.env`
- [ ] TNS_ADMIN path set to wallet location
- [ ] Backend dependencies installed: `cd backend && npm install`
- [ ] Database connection tested: `./test-db.sh`
- [ ] Backend starts successfully: `./start-backend.sh`
- [ ] React app created in frontend folder
- [ ] Frontend dependencies installed: `cd frontend && npm install recharts`
- [ ] React files copied to `frontend/src/`
- [ ] Frontend starts successfully: `./start-frontend.sh`
- [ ] Dashboard loads at http://localhost:3000
- [ ] Live data appears in dashboard

---

## 📚 Documentation Priority

**Read in this order:**

1. **docs/_START_HERE.txt** - Welcome & overview
2. **docs/UPDATE_SUMMARY.md** - What's new (ES modules)
3. **docs/ES_MODULES_SETUP.md** - Wallet setup (detailed)
4. **docs/GETTING_STARTED.md** - Quick start guide
5. **docs/INDEX.md** - Navigate all files
6. **docs/QUICK_REFERENCE.txt** - Cheat sheet

---

## 🆘 Troubleshooting

### Issue: Can't find project

**Check path:**
```bash
ls -la /Users/aojah/Documents/GenAI-CoE/state-farm-portal
```

**If not there, run installer again:**
```bash
./install-to-genai-coe.sh
```

### Issue: Permission denied

**Fix permissions:**
```bash
cd /Users/aojah/Documents/GenAI-CoE/state-farm-portal
chmod +x *.sh
chmod +x backend/*.js
```

### Issue: npm command not found

**Install Node.js:**
```bash
# Using Homebrew
brew install node

# Or download from nodejs.org
```

### Issue: Database connection fails

**Check:**
1. `.env` file exists: `ls backend/.env`
2. Wallet path correct: `ls $TNS_ADMIN`
3. Credentials valid
4. Test: `./test-db.sh`

**See detailed troubleshooting:**
```bash
open docs/ES_MODULES_SETUP.md
```

---

## 🎓 VS Code Setup (Optional)

**Open in VS Code:**
```bash
cd /Users/aojah/Documents/GenAI-CoE/state-farm-portal
code .
```

**Recommended Extensions:**
- ES7+ React/Redux/React-Native snippets
- ESLint
- Prettier
- Oracle Developer Tools for VS Code

**Workspace Settings:**
Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "files.exclude": {
    "**/node_modules": true
  }
}
```

---

## 🌟 Success Indicators

**You're set up correctly when:**

✅ `./test-db.sh` shows all green checkmarks  
✅ `./start-backend.sh` shows "Server running"  
✅ `./start-frontend.sh` opens browser to localhost:3000  
✅ Dashboard shows KPI cards with numbers  
✅ Charts display data  
✅ Claims table has rows  
✅ Green "LIVE" indicator appears  
✅ Clicking claim shows details  

---

## 📞 Next Steps

1. **Configure**: Edit `backend/.env`
2. **Test**: Run `./test-db.sh`
3. **Start**: Run `./start-backend.sh`
4. **Build**: Create frontend with `npx create-react-app frontend`
5. **Launch**: Run `./start-frontend.sh`
6. **Customize**: Modify as needed!

---

**Installation Location:**  
`/Users/aojah/Documents/GenAI-CoE/state-farm-portal`

**Ready to start! 🚀**
