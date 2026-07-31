#!/bin/bash

# ============================================================================
# BACKEND DIAGNOSTIC SCRIPT
# ============================================================================
# This will check your backend configuration and identify the issue
# Usage: bash diagnose-backend.sh
# ============================================================================

echo "╔════════════════════════════════════════╗"
echo "║  🔍 BACKEND DIAGNOSTICS               ║"
echo "╚════════════════════════════════════════╝"
echo ""

cd /Users/aojah/Documents/GenAI-CoE/Agentic-Framework/source-code/claims/state-farm-portal/backend/

echo "1. Checking if chatbot-backend-endpoints.js exists..."
echo "─────────────────────────────────────────────────"
if [ -f "chatbot-backend-endpoints.js" ]; then
    echo "✅ File exists"
    echo ""
else
    echo "❌ File not found!"
    exit 1
fi

echo "2. Checking for database imports..."
echo "─────────────────────────────────────────────────"
if grep -q "import oracledb" chatbot-backend-endpoints.js; then
    echo "✅ Using Direct Oracle Connection (oracledb)"
    DB_TYPE="oracledb"
elif grep -q "ORDS_BASE_URL" chatbot-backend-endpoints.js; then
    echo "✅ Using ORDS REST API"
    DB_TYPE="ords"
else
    echo "❌ No database integration found!"
    DB_TYPE="none"
fi
echo ""

echo "3. Checking insertClaimToDatabase function..."
echo "─────────────────────────────────────────────────"
grep -A15 "function insertClaimToDatabase" chatbot-backend-endpoints.js | head -20
echo ""

echo "4. Checking if function is actually called..."
echo "─────────────────────────────────────────────────"
if grep -q "await insertClaimToDatabase(claimData)" chatbot-backend-endpoints.js; then
    echo "✅ Function IS being called"
else
    echo "❌ Function NOT being called!"
fi
echo ""

if [ "$DB_TYPE" = "oracledb" ]; then
    echo "5. Checking oracledb installation..."
    echo "─────────────────────────────────────────────────"
    if npm list oracledb 2>/dev/null | grep -q "oracledb@"; then
        echo "✅ oracledb is installed"
        npm list oracledb | grep "oracledb@"
    else
        echo "❌ oracledb NOT installed!"
        echo "   Install with: npm install oracledb"
    fi
    echo ""
    
    echo "6. Checking .env file..."
    echo "─────────────────────────────────────────────────"
    if [ -f ".env" ]; then
        echo "✅ .env file exists"
        if grep -q "DB_USER" .env; then
            echo "   ✅ DB_USER is set"
        else
            echo "   ❌ DB_USER is missing!"
        fi
        if grep -q "DB_PASSWORD" .env; then
            echo "   ✅ DB_PASSWORD is set"
        else
            echo "   ❌ DB_PASSWORD is missing!"
        fi
        if grep -q "DB_CONNECTION_STRING" .env; then
            echo "   ✅ DB_CONNECTION_STRING is set"
        else
            echo "   ❌ DB_CONNECTION_STRING is missing!"
        fi
    else
        echo "❌ .env file NOT found!"
        echo "   Create .env with DB credentials"
    fi
elif [ "$DB_TYPE" = "ords" ]; then
    echo "5. Checking ORDS configuration..."
    echo "─────────────────────────────────────────────────"
    if [ -f ".env" ]; then
        if grep -q "ORDS_BASE_URL" .env; then
            echo "✅ ORDS_BASE_URL is set"
            grep "ORDS_BASE_URL" .env
        else
            echo "⚠️  ORDS_BASE_URL not in .env (using hardcoded default)"
        fi
    fi
fi
echo ""

echo "7. Checking uploads directory..."
echo "─────────────────────────────────────────────────"
if [ -d "uploads/claims" ]; then
    echo "✅ uploads/claims/ exists"
else
    echo "❌ uploads/claims/ does NOT exist!"
    echo "   Create with: mkdir -p uploads/claims"
fi
echo ""

echo "8. Checking for JSON body parser..."
echo "─────────────────────────────────────────────────"
if grep -q "express.json()" *.js; then
    echo "✅ JSON body parser is configured"
else
    echo "❌ JSON body parser might be missing!"
fi
echo ""

echo "╔════════════════════════════════════════╗"
echo "║  📊 DIAGNOSTIC SUMMARY                 ║"
echo "╚════════════════════════════════════════╝"
echo ""

if [ "$DB_TYPE" = "none" ]; then
    echo "❌ CRITICAL ISSUE: No database integration!"
    echo ""
    echo "Your backend is NOT configured to save to database."
    echo "This is why claims show success but don't appear in DB."
    echo ""
    echo "SOLUTION:"
    echo "Replace chatbot-backend-endpoints.js with:"
    echo "  chatbot-backend-endpoints-WORKING.js"
    echo ""
elif [ "$DB_TYPE" = "oracledb" ]; then
    echo "✅ Using Direct Oracle Connection"
    echo ""
    echo "Next steps:"
    echo "1. Make sure oracledb is installed: npm install oracledb"
    echo "2. Make sure .env has DB credentials"
    echo "3. Restart backend: npm start"
    echo "4. Check backend logs for database connection messages"
    echo "5. Submit test claim and check logs for insertion messages"
    echo ""
elif [ "$DB_TYPE" = "ords" ]; then
    echo "✅ Using ORDS REST API"
    echo ""
    echo "Next steps:"
    echo "1. Make sure ORDS endpoint is accessible"
    echo "2. Check ORDS_BASE_URL is correct"
    echo "3. Test ORDS with: curl ORDS_BASE_URL/claims/"
    echo "4. If ORDS doesn't work, switch to Direct Oracle Connection"
    echo ""
fi

echo "═══════════════════════════════════════════"
echo ""
echo "To see what backend logs when you submit:"
echo "1. Make sure backend is running (npm start)"
echo "2. Submit a test claim"
echo "3. Check backend console for these messages:"
echo "   [Database] Inserting claim: CLM-..."
echo "   [Database] ✅ Successfully inserted to database!"
echo ""
echo "If you DON'T see these messages, the database"
echo "integration is not working."
echo ""
