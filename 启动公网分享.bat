@echo off
chcp 65001 >nul
cd /d "D:\download\测试"

echo ╔══════════════════════════════════════════╗
echo ║  🎯 IVL监管者人格测试 - 公网部署       ║
echo ╚══════════════════════════════════════════╝
echo.
echo [1/2] 启动本地服务器...
start "IVL-Server" node server.js
timeout /t 3 /nobreak >nul

echo [2/2] 启动内网穿透...
echo.
echo ══════════════════════════════════════════
echo  测试网站: https://ivl-hunter-test.loca.lt
echo  后台管理: https://ivl-hunter-test.loca.lt/admin
echo ══════════════════════════════════════════
echo.
echo 首次访问需输入你的公网IP验证。
echo 关闭此窗口即停止服务。
echo.
npx localtunnel --port 3000 --subdomain ivl-hunter-test --print-requests
pause >nul
