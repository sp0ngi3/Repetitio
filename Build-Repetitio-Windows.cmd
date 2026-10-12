@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Build-Repetitio-Windows.ps1" %*
if errorlevel 1 (
  echo.
  echo Build failed. Existing releases and your data have not been deleted.
)
pause
