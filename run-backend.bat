@echo off
title MediTrack - Backend Server
echo ========================================================
echo Starting MediTrack Express & MongoDB Backend Server...
echo ========================================================
set "PATH=%~dp0..\nodejs;%PATH%"
cd "%~dp0backend"
node src/server.js
pause
