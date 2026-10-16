@echo off
title Dubuseek - DeepSeek Web API [Port 8080]
cd /d "%~dp0"
set PORT=8080
set DUBUSEEK_API_KEY=sk-dubuseek
echo ========================================================
echo  Dubuseek - local OpenAI-compatible API for DeepSeek
echo  Endpoint: http://127.0.0.1:8080/v1
echo  API Key:  sk-dubuseek
echo  Auto-login: set DUBUSEEK_LOGIN_EMAIL / DUBUSEEK_LOGIN_PASSWORD
echo  Models:   deepseek-chat, deepseek-reasoner
echo ========================================================
echo.
node dist/index.js start
pause
