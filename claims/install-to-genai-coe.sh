#!/bin/bash

# State Farm Live Portal - Installation Script
# Target Location: /Users/aojah/Documents/GenAI-CoE

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                              ║"
echo "║              🏢 STATE FARM LIVE PORTAL - INSTALLATION 🏢                     ║"
echo "║                                                                              ║"
echo "║                 Installing to: /Users/aojah/Documents/GenAI-CoE             ║"
echo "║                                                                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Target directory
TARGET_DIR="/Users/aojah/Documents/GenAI-CoE/Agentic-Framework/source-code/claims"
SOURCE_DIR="/tmp/state-farm-portal"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo -e "${RED}❌ Source directory not found: $SOURCE_DIR${NC}"
    echo "Please ensure all files are downloaded first."
    exit 1
fi

# Create target directory
echo -e "${BLUE}📁 Creating project directory...${NC}"
mkdir -p "$TARGET_DIR"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Directory created: $TARGET_DIR${NC}"
else
    echo -e "${RED}❌ Failed to create directory${NC}"
    exit 1
fi

# Copy all files
echo ""
echo -e "${BLUE}📦 Copying project files...${NC}"

# Copy backend
echo "  → Backend files..."
cp -r "$SOURCE_DIR/backend" "$TARGET_DIR/"
echo -e "${GREEN}  ✅ Backend files copied${NC}"

# Copy frontend
echo "  → Frontend files..."
cp -r "$SOURCE_DIR/frontend" "$TARGET_DIR/"
echo -e "${GREEN}  ✅ Frontend files copied${NC}"

# Copy documentation
echo "  → Documentation..."
cp -r "$SOURCE_DIR/docs" "$TARGET_DIR/"
echo -e "${GREEN}  ✅ Documentation copied${NC}"

# Copy utilities
echo "  → Utilities..."
cp "$SOURCE_DIR/setup.sh" "$TARGET_DIR/" 2>/dev/null
cp "$SOURCE_DIR/sample-data.sql" "$TARGET_DIR/" 2>/dev/null
chmod +x "$TARGET_DIR/setup.sh" 2>/dev/null
echo -e "${GREEN}  ✅ Utilities copied${NC}"

# Create .env file in backend
echo ""
echo -e "${BLUE}📝 Setting up configuration...${NC}"
if [ -f "$TARGET_DIR/backend/.env.template" ]; then
    cp "$TARGET_DIR/backend/.env.template" "$TARGET_DIR/backend/.env"
    echo -e "${GREEN}✅ .env file created in backend/${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Edit backend/.env with your Oracle credentials${NC}"
else
    echo -e "${YELLOW}⚠️  .env.template not found, skipping .env creation${NC}"
fi

# Create project README in target directory
cat > "$TARGET_DIR/README.md" << 'EOF'
# State Farm Live Portal

**Installation Location:** `/Users/aojah/Documents/GenAI-CoE/Agentic-Framework/source-code/claims`

## 🚀 Quick Start

### 1. Configure Database

Edit the backend configuration:
```bash
cd backend
nano .env
```

Add your Oracle credentials:
```env
DB_USER=ADMIN
DB_PASSWORD=YourPassword
DB_CONNECT_STRING=vibecoding_medium
TNS_ADMIN=/path/to/your/wallet
WALLET_PASSWORD=
PORT=3001
```

### 2. Install & Test Backend

```bash
cd backend
npm install
npm run test    # Test database connection
npm start       # Start the server
```

### 3. Setup Frontend

In a new terminal:
```bash
cd frontend
npm install
npm start
```

## 📚 Documentation

All documentation is in the `docs/` folder:
- **_START_HERE.txt** - Start here!
- **UPDATE_SUMMARY.md** - What's new
- **ES_MODULES_SETUP.md** - Wallet setup guide
- **GETTING_STARTED.md** - Quick start
- **INDEX.md** - File navigation

## 🗂️ Project Structure

```
state-farm-portal/
├── backend/
│   ├── server.js
│   ├── test-connection.js
│   ├── package.json
│   └── .env (configure this!)
├── frontend/
│   ├── StateFarmLivePortal.jsx
│   ├── App.js
│   └── package.json
├── docs/
│   └── (all documentation)
├── sample-data.sql
└── README.md (this file)
```

## ✅ Next Steps

1. Read: `docs/_START_HERE.txt`
2. Configure: `backend/.env`
3. Test: `cd backend && npm run test`
4. Start: `cd backend && npm start`
5. Frontend: `cd frontend && npm install && npm start`

Happy coding! 🚀
EOF

echo -e "${GREEN}✅ Project README created${NC}"

# Create helpful startup scripts
echo ""
echo -e "${BLUE}📝 Creating startup scripts...${NC}"

# Backend startup script
cat > "$TARGET_DIR/start-backend.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/backend"
echo "🚀 Starting State Farm Backend Server..."
echo ""
echo "Server will run at: http://localhost:3001"
echo "Press Ctrl+C to stop"
echo ""
npm start
EOF
chmod +x "$TARGET_DIR/start-backend.sh"
echo -e "${GREEN}✅ Created start-backend.sh${NC}"

# Frontend startup script
cat > "$TARGET_DIR/start-frontend.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/frontend"
echo "🎨 Starting State Farm Frontend..."
echo ""
echo "App will open at: http://localhost:3000"
echo "Press Ctrl+C to stop"
echo ""
npm start
EOF
chmod +x "$TARGET_DIR/start-frontend.sh"
echo -e "${GREEN}✅ Created start-frontend.sh${NC}"

# Test connection script
cat > "$TARGET_DIR/test-db.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/backend"
echo "🧪 Testing Oracle Database Connection..."
echo ""
npm run test
EOF
chmod +x "$TARGET_DIR/test-db.sh"
echo -e "${GREEN}✅ Created test-db.sh${NC}"

# Create a master installation status file
cat > "$TARGET_DIR/INSTALLATION.md" << EOF
# Installation Status

**Installed:** $(date)  
**Location:** $TARGET_DIR  
**User:** $(whoami)

## ✅ Installation Complete

Your State Farm Live Portal has been installed successfully!

### What's Installed:

- ✅ Backend (Node.js + Express + Oracle)
- ✅ Frontend (React)
- ✅ Documentation (7 guides)
- ✅ Utilities (Setup scripts, sample data)

### Quick Commands:

\`\`\`bash
# From: $TARGET_DIR

# Test database connection
./test-db.sh

# Start backend
./start-backend.sh

# Start frontend (in new terminal)
./start-frontend.sh
\`\`\`

### Configuration Required:

1. **Edit backend/.env** with your Oracle credentials
2. **Download Oracle Wallet** (see docs/ES_MODULES_SETUP.md)
3. **Run ./test-db.sh** to verify connection

### File Count:
- Backend: 4 files
- Frontend: 3 files  
- Documentation: 9 files
- Utilities: 2 files + 3 scripts

### Next Steps:

1. Read: docs/_START_HERE.txt
2. Configure: backend/.env
3. Test: ./test-db.sh
4. Start: ./start-backend.sh
5. Frontend: ./start-frontend.sh

---

**Need Help?**  
See docs/INDEX.md for complete file navigation
EOF

echo -e "${GREEN}✅ Created INSTALLATION.md${NC}"

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Installation Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}📂 Project Location:${NC}"
echo "   $TARGET_DIR"
echo ""
echo -e "${BLUE}📋 What's Next:${NC}"
echo ""
echo "   1. Navigate to project:"
echo -e "      ${YELLOW}cd $TARGET_DIR${NC}"
echo ""
echo "   2. Configure database:"
echo -e "      ${YELLOW}nano backend/.env${NC}"
echo ""
echo "   3. Test connection:"
echo -e "      ${YELLOW}./test-db.sh${NC}"
echo ""
echo "   4. Start backend:"
echo -e "      ${YELLOW}./start-backend.sh${NC}"
echo ""
echo "   5. Start frontend (new terminal):"
echo -e "      ${YELLOW}./start-frontend.sh${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✨ Your State Farm Live Portal is ready!${NC}"
echo ""
echo "Documentation: $TARGET_DIR/docs/_START_HERE.txt"
echo ""

# Open Finder to the location (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${BLUE}📁 Opening project folder in Finder...${NC}"
    open "$TARGET_DIR"
fi

exit 0
EOF
chmod +x /tmp/state-farm-portal/install-to-genai-coe.sh

echo "Installation script created"