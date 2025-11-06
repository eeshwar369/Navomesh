@echo off
echo ========================================
echo Starting SmartPark AI Frontend
echo ========================================
echo.

cd /d "%~dp0frontend"

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
echo Starting Angular development server...
echo The app will be available at: http://localhost:4200
echo.
echo Press Ctrl+C to stop the server
echo.

call npm start
