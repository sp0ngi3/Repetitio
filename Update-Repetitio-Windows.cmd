@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Build-Repetitio-Windows.ps1" -Install %*
if errorlevel 1 (
  echo.
  echo Update did not complete. Your database and backups were not removed.
)
pause
