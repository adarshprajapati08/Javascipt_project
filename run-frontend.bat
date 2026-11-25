@echo off
title MediTrack - Frontend Server
echo ========================================================
echo Starting MediTrack React & Vite Frontend (Port 5173)...
echo ========================================================
set "PATH=%~dp0..\nodejs;%PATH%"
cd "%~dp0frontend"
node node_modules\vite\bin\vite.js --host
pause
