#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                                                                    ║"
echo "║              🔍 VERIFY BACKEND INSTALLATION 🔍                    ║"
echo "║                                                                    ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

cd backend

echo "Checking if backend has the new endpoint..."
echo ""

echo "1. Does /api/claims-chatbot endpoint exist?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep -c "'/api/claims-chatbot'" chatbot-backend-endpoints.js

if [ $? -eq 0 ]; then
    COUNT=$(grep -c "'/api/claims-chatbot'" chatbot-backend-endpoints.js)
    if [ "$COUNT" -gt 0 ]; then
        echo "✅ YES - Found $COUNT occurrence(s)"
    else
        echo "❌ NO - Endpoint not found"
    fi
else
    echo "❌ NO - Endpoint not found"
fi

echo ""
echo "2. Does initPool function exist?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep -c "async function initPool" chatbot-backend-endpoints.js

if [ $? -eq 0 ]; then
    COUNT=$(grep -c "async function initPool" chatbot-backend-endpoints.js)
    if [ "$COUNT" -gt 0 ]; then
        echo "✅ YES - Found"
    else
        echo "❌ NO - Function not found"
    fi
else
    echo "❌ NO - Function not found"
fi

echo ""
echo "3. Does run function exist?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep -c "async function run" chatbot-backend-endpoints.js

if [ $? -eq 0 ]; then
    COUNT=$(grep -c "async function run" chatbot-backend-endpoints.js)
    if [ "$COUNT" -gt 0 ]; then
        echo "✅ YES - Found"
    else
        echo "❌ NO - Function not found"
    fi
else
    echo "❌ NO - Function not found"
fi

echo ""
echo "4. Show the GET endpoint line:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep "app.get.*claims" chatbot-backend-endpoints.js

echo ""
echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                     WHAT TO DO                                     ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo "If you see ❌ above, the file was NOT replaced."
echo ""
echo "Run these commands:"
echo ""
echo "  cd backend"
echo "  cp ~/Downloads/chatbot-backend-endpoints-COMPLETE.js chatbot-backend-endpoints.js"
echo "  "
echo "  # Stop backend (Ctrl+C or kill it)"
echo "  pkill -f node"
echo "  "
echo "  # Start backend"
echo "  npm start"
echo ""
echo "Then test:"
echo "  node test-portal-api.js"
echo ""
