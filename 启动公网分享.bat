@echo off
chcp 65001 >nul
cd /d "D:\download\测试"

echo ╔══════════════════════════════════════════╗
echo ║  🎯 IVL监管者人格测试 - 公网部署       ║
echo ╚══════════════════════════════════════════╝
echo.
echo [1/2] 启动本地服务器...
start "IVL-Server" node server.js
timeout /t 2 /nobreak >nul

echo [2/2] 启动内网穿透隧道...
echo.
echo 等待生成公网地址...
npx localtunnel --port 3000
echo.
echo 隧道已关闭。按任意键退出...
pause >nul
