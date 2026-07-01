@echo off
title DocuIntel RAG Pipeline Startup Console
cls
echo =======================================================================
echo                   DocuIntel RAG Pipeline Startup Console
echo =======================================================================
echo.
echo Please select how you want to run the project:
echo.
echo   [1] Local Development Mode (Run local server and dev client)
echo   [2] Docker Compose Mode (Run multi-container production stack)
echo   [3] Exit
echo.
echo =======================================================================
set /p choice="Enter your choice (1, 2, or 3): "

:: Get active directory and strip trailing backslash to prevent quote escaping issues
set "CURRENT_DIR=%~dp0"
if "%CURRENT_DIR:~-1%"=="\" set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"

if "%choice%"=="1" goto LOCAL
if "%choice%"=="2" goto DOCKER
if "%choice%"=="3" goto EXIT
echo Invalid choice. Exiting...
pause
exit

:LOCAL
echo.
echo Starting Vite React Frontend...
cd /d "%CURRENT_DIR%\frontend"
start "React Frontend" cmd /k "npm run dev"

echo Starting FastAPI Backend...
cd /d "%CURRENT_DIR%"
start "FastAPI Backend" cmd /k "call .venv\Scripts\activate.bat && python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000"

echo.
echo Both backend and frontend are starting up!
echo Backend will be available at: http://127.0.0.1:8000
echo Frontend will be available at: http://localhost:5173
echo.
pause
exit

:DOCKER
echo.
echo Starting Docker Compose stack...
cd /d "%CURRENT_DIR%"
docker compose up --build
pause
exit

:EXIT
exit
