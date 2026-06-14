@echo off
chcp 65001 >nul
cd /d "D:\download\测试"

echo.
echo ╔══════════════════════════════════════════╗
echo ║  永久部署 - Cloudflare Pages（推荐）   ║
echo ╚══════════════════════════════════════════╝
echo.
echo 首次使用需要登录 Cloudflare 账号（免费注册）
echo.
echo [1/2] 安装部署工具...
call npm install -g wrangler 2>nul

echo [2/2] 部署到 Cloudflare...
echo.
echo 浏览器会自动打开，请登录你的 Cloudflare 账号
echo 登录后部署会自动完成，获得永久域名！
echo.
npx wrangler pages deploy . --project-name=ivl-test
echo.
echo 部署完成！你的永久域名会在上面显示。
pause
