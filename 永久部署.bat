@echo off
chcp 65001 >nul
cd /d "D:\download\测试"

echo.
echo ╔══════════════════════════════════════════╗
echo ║     🚀 IVL测试 - 一键永久部署          ║
echo ╚══════════════════════════════════════════╝
echo.
echo 选择部署平台（推荐 1）:
echo   1. Vercel（最稳定）
echo   2. Cloudflare Pages（国内访问较好）
echo   3. Netlify（简单易用）
echo.
set /p choice="请输入选项 (1/2/3): "

if "%choice%"=="1" goto vercel
if "%choice%"=="2" goto cloudflare
if "%choice%"=="3" goto netlify
goto end

:vercel
echo.
echo 正在部署到 Vercel...
echo 首次使用会打开浏览器，用 GitHub 账号一键登录即可。
echo.
npx vercel --prod
goto end

:cloudflare
echo.
echo 正在部署到 Cloudflare Pages...
echo 首次使用会打开浏览器，注册/登录 Cloudflare 账号。
echo.
npx wrangler pages deploy . --project-name=ivl-test
goto end

:netlify
echo.
echo 正在部署到 Netlify...
echo 首次使用会打开浏览器，用 GitHub 账号登录即可。
echo.
npx netlify-cli deploy --prod --dir=.
goto end

:end
echo.
echo ══════════════════════════════════════════
echo  部署完成后你会得到一个永久域名！
echo  如 https://ivl-test.vercel.app
echo ══════════════════════════════════════════
echo.
pause
