@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Build-Repetitio-Launcher.ps1"
if errorlevel 1 (
    echo.
    echo The launcher could not be built. Review the error above.
    pause
    exit /b 1
)

echo.
echo Launcher build completed successfully.
pause
