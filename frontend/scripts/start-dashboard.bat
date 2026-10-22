@echo off
REM ---------------------------------------------------------------------
REM  EMS Analytics - Bawal Plant : one-click local start (Windows)
REM
REM  Double-click this file. It installs and builds on first run only,
REM  then serves the dashboard at http://localhost:3101 and opens it.
REM  Leave the window open while presenting; close it to stop.
REM ---------------------------------------------------------------------
setlocal
cd /d "%~dp0.."

set "PORT=3101"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed.
  echo   Install the LTS version from https://nodejs.org  then run this again.
  echo.
  pause
  exit /b 1
)

echo Using Node:
node -v

if not exist "node_modules\" (
  echo.
  echo   First run - installing dependencies. This takes a few minutes.
  echo.
  call npm ci
  if errorlevel 1 call npm install
  if errorlevel 1 (
    echo.
    echo   Dependency install failed. Check your internet connection.
    pause
    exit /b 1
  )
)

if not exist ".next\BUILD_ID" (
  echo.
  echo   Building the dashboard. This takes about a minute.
  echo.
  call npm run build
  if errorlevel 1 (
    echo.
    echo   Build failed.
    pause
    exit /b 1
  )
)

echo.
echo  ===================================================================
echo   EMS Analytics is starting on  http://localhost:%PORT%
echo   Leave this window open while presenting. Close it to stop.
echo  ===================================================================
echo.

REM Give the server a moment, then open the browser.
start "" /b cmd /c "timeout /t 4 /nobreak >nul & start """" ""http://localhost:%PORT%"""

call npx next start --port %PORT%

echo.
echo  Server stopped.
pause
