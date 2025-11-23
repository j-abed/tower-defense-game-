@echo off
REM Simple script to run the Tower Defense game on Windows
REM This starts a local web server so the game can be accessed via browser

set PORT=8000

echo Starting Tower Defense Game server...
echo Game will be available at: http://localhost:%PORT%
echo.
echo Press Ctrl+C to stop the server
echo.

REM Check if Python 3 is available
python -m http.server %PORT% 2>nul
if %errorlevel% equ 0 goto :end

REM Check if Python 2 is available
python -m SimpleHTTPServer %PORT% 2>nul
if %errorlevel% equ 0 goto :end

REM Check if Node.js is available
npx http-server -p %PORT% 2>nul
if %errorlevel% equ 0 goto :end

echo Error: No suitable web server found.
echo Please install Python 3, Python 2, or Node.js
echo.
echo Alternatively, you can open index.html directly in your browser
pause
exit /b 1

:end
pause

