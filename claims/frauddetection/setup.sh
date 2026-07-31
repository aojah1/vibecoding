#!/bin/bash

# StateFarm AI Fraud Detection - Setup Script
echo "======================================"
echo "StateFarm AI Fraud Detection Setup"
echo "======================================"
echo ""

# Check Python version
echo "Checking Python version..."
python3 --version || {
    echo "Error: Python 3 is not installed"
    exit 1
}

# Create virtual environment
echo ""
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate || {
    echo "Error: Could not activate virtual environment"
    exit 1
}

# Install dependencies
echo ""
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt || {
    echo "Error: Failed to install dependencies"
    exit 1
}

# Setup .env file
echo ""
if [ ! -f .env ]; then
    echo "Setting up .env file..."
    cp .env.template .env
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file and add your OpenAI API key!"
    echo ""
    echo "To edit the .env file, run:"
    echo "  nano .env"
    echo ""
    echo "Then replace 'your_openai_api_key_here' with your actual API key."
else
    echo "✓ .env file already exists"
fi

echo ""
echo "======================================"
echo "✅ Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Edit .env file and add your OpenAI API key:"
echo "   nano .env"
echo ""
echo "2. Run the test script to verify installation:"
echo "   python test_fraud_detection.py"
echo ""
echo "3. Start the dashboard:"
echo "   python app.py"
echo ""
echo "4. Open your browser to:"
echo "   http://localhost:5000"
echo ""
