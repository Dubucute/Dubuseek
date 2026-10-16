@echo off
title Restart Dubuseek [Port 8080]
echo Stopping old Dubuseek instance on port 8080...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080" ^| findstr "LISTENING"') do (
    echo Terminating PID %%a
    taskkill /f /pid %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul
echo Starting updated Dubuseek...
cd /d "%~dp0"
set PORT=8080
set DUBUSEEK_API_KEY=sk-dubuseek
set DUBUSEEK_TOOL_REASONING=clean
node dist/index.js start
