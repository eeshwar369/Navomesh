@echo off
echo ========================================
echo Starting SmartPark AI Backend
echo ========================================
echo.

cd /d "%~dp0backend"

echo Checking if node_modules exists...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed
        pause
        exit /b 1
    )
)

echo.
echo Starting Node.js Express server...
echo The API will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

call npm start
