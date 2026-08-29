@echo off
setlocal EnableExtensions
chcp 65001 >nul
title 万敌角色专题站 - 本地开发服务器

set "SCRIPT_DIR=%~dp0"
set "VITE_DIR=%SCRIPT_DIR%Mydei"
set "PACKAGE_DIR=%SCRIPT_DIR%"
set "SITE_URL=http://127.0.0.1:5173/"

if not exist "%VITE_DIR%\" goto :missing_vite_dir
pushd "%VITE_DIR%" >nul 2>&1
if errorlevel 1 goto :enter_dir_failed

where node >nul 2>&1
if errorlevel 1 goto :missing_node

where npm >nul 2>&1
if errorlevel 1 goto :missing_npm

if not exist "%PACKAGE_DIR%package.json" goto :missing_package

if not exist "%PACKAGE_DIR%node_modules\" (
  echo [准备] 首次运行，正在安装项目依赖，请稍候……
  call npm --prefix "%PACKAGE_DIR%" install --no-package-lock
  if errorlevel 1 goto :install_failed
  echo [完成] 项目依赖安装成功。
  echo.
)

echo [启动] 正在启动万敌角色专题站……
echo [地址] %SITE_URL%
echo [提示] 保持此窗口开启；按 Ctrl+C 可以停止网站。
echo.

start "" /b powershell.exe -NoProfile -WindowStyle Hidden -Command ^
  "$url='%SITE_URL%'; for($i=0; $i -lt 60; $i++){ try { $response=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2; if($response.StatusCode -ge 200 -and $response.StatusCode -lt 500){ Start-Process $url; exit 0 } } catch {}; Start-Sleep -Seconds 1 }; exit 1"

call npm --prefix "%PACKAGE_DIR%" run dev -- --host 127.0.0.1 --port 5173 --strictPort
if errorlevel 1 goto :dev_failed

popd >nul 2>&1
endlocal
exit /b 0

:missing_vite_dir
echo [错误] 找不到 Vite 站点目录："%VITE_DIR%"
echo 请确认 start.bat 位于项目根目录，并且 Mydei 文件夹没有被移动或删除。
goto :failed

:enter_dir_failed
echo [错误] 无法进入 Vite 站点目录："%VITE_DIR%"
echo 请检查目录是否存在，以及当前用户是否有访问权限。
goto :failed

:missing_node
echo [错误] 未检测到 Node.js。
echo 请安装 Node.js 20.19 或更高版本，重新打开此脚本后再试。
goto :failed_in_project

:missing_npm
echo [错误] 已检测到 Node.js，但未找到 npm。
echo 请重新安装包含 npm 的 Node.js 20.19 或更高版本后再试。
goto :failed_in_project

:missing_package
echo [错误] 找不到项目配置文件："%PACKAGE_DIR%package.json"
echo 请确认项目文件完整，并且 start.bat 位于项目根目录。
goto :failed_in_project

:install_failed
echo.
echo [错误] npm install 执行失败，依赖未能正确安装。
echo 请检查网络连接和上方 npm 错误信息，然后重新双击 start.bat。
goto :failed_in_project

:dev_failed
echo.
echo [错误] npm run dev 执行失败，网站未能启动。
echo 请检查 5173 端口是否被占用，并查看上方错误信息。
goto :failed_in_project

:failed_in_project
popd >nul 2>&1

:failed
echo.
pause
endlocal
exit /b 1
