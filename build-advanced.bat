@echo off
setlocal enabledelayedexpansion

echo ====================================
echo CAS Part to XML Advanced Builder
echo ====================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Available build options:
echo 1. Build Windows x64 executable (default)
echo 2. Build Windows x86 executable
echo 3. Build for multiple platforms
echo 4. Clean build (remove dist folder first)
echo 5. Install/Update dependencies only
echo.

set /p choice="Enter your choice (1-5) or press Enter for default: "

if "%choice%"=="" set choice=1
if "%choice%"=="5" goto :install_deps

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

REM Clean build option
if "%choice%"=="4" (
    if exist "dist" (
        echo Cleaning dist directory...
        rmdir /s /q dist
    )
    set choice=1
)

REM Create dist directory
if not exist "dist" mkdir dist

echo Building...

if "%choice%"=="1" (
    echo Building for Windows x64...
    npx pkg casp2xml.js --targets node18-win-x64 -o dist/casp2xml.exe
) else if "%choice%"=="2" (
    echo Building for Windows x86...
    npx pkg casp2xml.js --targets node18-win-x86 -o dist/casp2xml-x86.exe
) else if "%choice%"=="3" (
    echo Building for multiple platforms...
    npx pkg casp2xml.js --targets node18-win-x64 -o dist/casp2xml-win-x64.exe
    npx pkg casp2xml.js --targets node18-win-x86 -o dist/casp2xml-win-x86.exe
    npx pkg casp2xml.js --targets node18-linux-x64 -o dist/casp2xml-linux-x64
    npx pkg casp2xml.js --targets node18-macos-x64 -o dist/casp2xml-macos-x64
) else (
    echo Invalid choice. Building default Windows x64...
    npx pkg casp2xml.js --targets node18-win-x64 -o dist/casp2xml.exe
)

if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

REM Create zip archive if bestzip is available
npx bestzip --version >nul 2>&1
if not errorlevel 1 (
    echo Creating zip archive...
    if "%choice%"=="3" (
        npx bestzip dist/casp2xml-all-platforms.zip dist/casp2xml-*
    ) else (
        npx bestzip dist/casp2xml.zip dist/casp2xml*.exe
    )
)

goto :success

:install_deps
echo Installing/Updating dependencies...
npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo Dependencies installed successfully!
goto :end

:success
echo.
echo ====================================
echo Build completed successfully!
echo ====================================
echo.
echo Built files:
dir dist\casp2xml* 2>nul
echo.

:end
echo Press any key to exit...
pause >nul
