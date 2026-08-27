@echo off
title Gemini Watermark Remover
cd /d "%~dp0"
echo Starting Gemini Watermark Remover...
start http://localhost:3000/
node server.js
pause
