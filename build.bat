@echo off
echo ====================================
echo CAS Part to XML Builder Script
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

echo Node.js version:
node --version
echo.

REM Check if npm is available
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not available
    pause
    exit /b 1
)

echo npm version:
npm --version
echo.

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
) else (
    echo Dependencies already installed.
    echo.
)

REM Create dist directory if it doesn't exist
if not exist "dist" (
    echo Creating dist directory...
    mkdir dist
)

REM Build the executable
echo Building executable...
npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo ====================================
echo Build completed successfully!
echo ====================================
echo.
echo Executable created at: dist\casp2xml.exe
echo Zip archive created at: dist\casp2xml.zip
echo.

REM Check if the executable was created
if exist "dist\casp2xml.exe" (
    echo File size:
    dir dist\casp2xml.exe | find "casp2xml.exe"
    echo.
    echo You can now run the executable with: dist\casp2xml.exe
) else (
    echo WARNING: Executable file was not found at dist\casp2xml.exe
)

pause
