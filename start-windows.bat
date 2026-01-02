@echo off
chcp 65001 >nul
echo ========================================
echo   自助餐桌台计时系统 - Windows启动脚本
echo ========================================
echo.

REM 检查Node.js是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到Node.js，请先安装Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/4] 检测到Node.js版本:
node --version
echo.

REM 检查pnpm是否安装
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [2/4] 未检测到pnpm，正在安装...
    npm install -g pnpm
    if %errorlevel% neq 0 (
        echo [错误] pnpm安装失败
        pause
        exit /b 1
    )
) else (
    echo [2/4] 检测到pnpm版本:
    pnpm --version
)
echo.

REM 检查依赖是否安装
if not exist "node_modules" (
    echo [3/4] 正在安装项目依赖...
    pnpm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo [3/4] 项目依赖已安装
)
echo.

REM 启动开发服务器
echo [4/4] 正在启动服务器...
echo.
echo ========================================
echo   服务器启动成功！
echo   访问地址: http://localhost:3000
echo   按 Ctrl+C 停止服务器
echo ========================================
echo.

pnpm dev

pause
