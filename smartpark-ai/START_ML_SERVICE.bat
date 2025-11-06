@echo off
echo ========================================
echo Starting SmartPark AI ML Service
echo ========================================
echo.

cd /d "%~dp0ml-service"

echo Checking if virtual environment exists...
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        echo Make sure Python is installed and in PATH
        pause
        exit /b 1
    )
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Checking if dependencies are installed...
pip show flask >nul 2>&1
if errorlevel 1 (
    echo Installing Python dependencies...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ERROR: pip install failed
        pause
        exit /b 1
    )
)

echo.
echo Starting Flask ML service...
echo The ML API will be available at: http://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo.

python app.py
