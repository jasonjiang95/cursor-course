@echo off
REM 弹出 UAC，用管理员 PowerShell 释放 8000（适合本机进程、Cursor 里杀不到时）。
set "SCRIPT=%~dp0kill_port.ps1"
if not exist "%SCRIPT%" (
  echo Missing kill_port.ps1 next to this file.
  exit /b 1
)
REM 注意：路径传给 -File 时保持引号
powershell -NoProfile -Command "Start-Process -FilePath powershell.exe -Verb RunAs -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','%SCRIPT%','-Port','8000'"
exit /b 0
