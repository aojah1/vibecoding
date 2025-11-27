@echo off
REM StateFarm AI Fraud Detection - Setup Script for Windows

echo ======================================
echo StateFarm AI Fraud Detection Setup
echo ======================================
echo.

REM Check Python version
echo Checking Python version...
python --version
if errorlevel 1 (
    echo Error: Python is not installed
    pause
    exit /b 1
)

REM Create virtual environment
echo.
echo Creating virtual environment...
python -m venv venv

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo Error: Could not activate virtual environment
    pause
    exit /b 1
)

REM Install dependencies
echo.
echo Installing dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt
if errorlevel 1 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

REM Setup .env file
echo.
if not exist .env (
    echo Setting up .env file...
    copy .env.template .env
    echo.
    echo WARNING: Edit .env file and add your OpenAI API key!
    echo.
    echo To edit the .env file, run:
    echo   notepad .env
    echo.
    echo Then replace 'your_openai_api_key_here' with your actual API key.
) else (
    echo .env file already exists
)

echo.
echo ======================================
echo Setup Complete!
echo ======================================
echo.
echo Next steps:
echo 1. Edit .env file and add your OpenAI API key:
echo    notepad .env
echo.
echo 2. Run the test script to verify installation:
echo    python test_fraud_detection.py
echo.
echo 3. Start the dashboard:
echo    python app.py
echo.
echo 4. Open your browser to:
echo    http://localhost:5000
echo.

pause
