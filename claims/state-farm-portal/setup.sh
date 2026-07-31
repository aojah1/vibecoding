#!/bin/bash

# State Farm Live Portal - Automated Setup Script
# This script will set up both backend and frontend

echo "🏢 State Farm Live Portal - Automated Setup"
echo "==========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo "🔍 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js $NODE_VERSION found${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✅ npm $NPM_VERSION found${NC}"
echo ""

# Create project structure
echo "📁 Creating project structure..."
mkdir -p state-farm-portal
cd state-farm-portal

mkdir -p backend
mkdir -p frontend/src
mkdir -p frontend/public

echo -e "${GREEN}✅ Project structure created${NC}"
echo ""

# Setup Backend
echo "🔧 Setting up backend..."
cd backend

# Copy backend files
cp ../server.js .
cp ../package.json .
cp ../.env.template .env
cp ../test-connection.js .

echo "📦 Installing backend dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install backend dependencies${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Configure your database credentials${NC}"
echo "Edit backend/.env with your Oracle Autonomous Database credentials:"
echo "  - DB_USER (usually ADMIN)"
echo "  - DB_PASSWORD"
echo "  - DB_CONNECT_STRING"
echo ""
read -p "Press Enter after you've configured the .env file..."

echo ""
echo "🧪 Testing database connection..."
node test-connection.js

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database connection successful!${NC}"
else
    echo -e "${RED}❌ Database connection failed. Please check your credentials.${NC}"
    echo "You can test again later with: cd backend && node test-connection.js"
fi

cd ..

# Setup Frontend
echo ""
echo "🎨 Setting up frontend..."

# Check if create-react-app is available
if ! command -v create-react-app &> /dev/null; then
    echo "📦 Installing create-react-app globally..."
    npm install -g create-react-app
fi

# Create React app if it doesn't exist
if [ ! -f "frontend/package.json" ]; then
    echo "⚛️  Creating React application..."
    npx create-react-app frontend
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to create React app${NC}"
        exit 1
    fi
fi

cd frontend

# Copy frontend files
cp ../StateFarmLivePortal.jsx src/
cp ../App.js src/

# Install recharts
echo "📦 Installing recharts..."
npm install recharts

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
    exit 1
fi

cd ..

# Create startup scripts
echo ""
echo "📝 Creating startup scripts..."

# Backend start script
cat > start-backend.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting State Farm Backend Server..."
cd backend
node server.js
EOF

chmod +x start-backend.sh

# Frontend start script
cat > start-frontend.sh << 'EOF'
#!/bin/bash
echo "🎨 Starting State Farm Frontend..."
cd frontend
npm start
EOF

chmod +x start-frontend.sh

# Combined start script
cat > start-all.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting State Farm Live Portal..."
echo ""

# Start backend in background
echo "Starting backend server..."
cd backend
node server.js &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend to start..."
sleep 3

# Start frontend
cd ../frontend
echo "Starting frontend..."
npm start &
FRONTEND_PID=$!

# Handle Ctrl+C
trap "echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT

# Wait for processes
wait
EOF

chmod +x start-all.sh

echo -e "${GREEN}✅ Startup scripts created${NC}"
echo ""

# Create VS Code workspace
cat > state-farm-portal.code-workspace << 'EOF'
{
  "folders": [
    {
      "name": "Backend",
      "path": "backend"
    },
    {
      "name": "Frontend",
      "path": "frontend"
    }
  ],
  "settings": {
    "files.exclude": {
      "**/node_modules": true
    }
  }
}
EOF

echo -e "${GREEN}✅ VS Code workspace created${NC}"
echo ""

# Final instructions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1️⃣  Start the backend server:"
echo "   cd backend && npm start"
echo "   OR"
echo "   ./start-backend.sh"
echo ""
echo "2️⃣  In a new terminal, start the frontend:"
echo "   cd frontend && npm start"
echo "   OR"
echo "   ./start-frontend.sh"
echo ""
echo "3️⃣  Or start both together:"
echo "   ./start-all.sh"
echo ""
echo "📍 Application URLs:"
echo "   Backend API:  http://localhost:3001"
echo "   Frontend UI:  http://localhost:3000"
echo "   Health Check: http://localhost:3001/health"
echo ""
echo "📚 Documentation:"
echo "   See README.md and DEPLOYMENT_GUIDE.md for details"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create a quick reference file
cat > QUICK_START.txt << 'EOF'
STATE FARM LIVE PORTAL - QUICK REFERENCE
=========================================

STARTING THE APPLICATION:
-------------------------
Backend:  cd backend && npm start
Frontend: cd frontend && npm start
Both:     ./start-all.sh

URLS:
-----
Backend API:  http://localhost:3001
Frontend UI:  http://localhost:3000
Health Check: http://localhost:3001/health

API ENDPOINTS:
--------------
GET /health              - Server health check
GET /api/claims          - All claims
GET /api/claims/:id      - Single claim
GET /api/adjusters       - All adjusters
GET /api/damages         - All damages
GET /api/stats           - Dashboard statistics

TESTING:
--------
Test DB Connection: cd backend && node test-connection.js
Test Health:        curl http://localhost:3001/health
Test Claims API:    curl http://localhost:3001/api/claims

TROUBLESHOOTING:
----------------
1. Backend won't start → Check .env file and Oracle Instant Client
2. Frontend error → Ensure backend is running on port 3001
3. Connection error → Run: node test-connection.js
4. No data showing → Check database has records in CLAIMS table

DATABASE CONFIGURATION:
-----------------------
File: backend/.env

Required:
- DB_USER (usually ADMIN)
- DB_PASSWORD
- DB_CONNECT_STRING (from Oracle Cloud Console)

DOCUMENTATION:
--------------
- README.md - Overview and quick start
- DEPLOYMENT_GUIDE.md - Detailed deployment instructions

For more help, see documentation files.
EOF

echo -e "${GREEN}✅ Quick reference created: QUICK_START.txt${NC}"
echo ""
echo "Happy coding! 🚀"
