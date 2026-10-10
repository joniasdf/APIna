@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul && (py -3 setup_tesla.py %*) || (python setup_tesla.py %*)
if errorlevel 9009 echo Asenna Python: https://www.python.org/downloads/ (rastita "Add python.exe to PATH")
pause
