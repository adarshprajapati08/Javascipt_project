@echo off
title MediTrack - Smart Hospital Management System
echo ========================================================
echo   Launching MediTrack Full-Stack Web Application
echo ========================================================
echo Starting Backend API Server (Port 5000)...
start "MediTrack Backend Server" cmd /k "%~dp0run-backend.bat"

timeout /t 3 /nobreak >nul

echo Starting Frontend UI (Port 5173)...
start "MediTrack Frontend UI" cmd /k "%~dp0run-frontend.bat"

echo.
echo Application launched!
echo Open your browser at: http://localhost:5173
echo.
