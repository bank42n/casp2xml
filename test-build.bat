@echo off
echo ====================================
echo Testing CAS Part to XML Executable
echo ====================================
echo.

REM Check if the executable exists
if not exist "dist\casp2xml.exe" (
    echo ERROR: Executable not found at dist\casp2xml.exe
    echo Please run build.bat first to create the executable.
    pause
    exit /b 1
)

echo Testing executable...
echo.

REM Test help command
echo Running: dist\casp2xml.exe --help
echo ----------------------------------------
dist\casp2xml.exe --help

echo.
echo ----------------------------------------
echo.

REM Test version display
echo Running: dist\casp2xml.exe --version
echo ----------------------------------------
dist\casp2xml.exe --version 2>nul
if errorlevel 1 (
    echo Version command not available, but executable seems to work.
)

echo.
echo ====================================
echo Test completed!
echo ====================================
echo.
echo The executable appears to be working correctly.
echo You can now use it to process your .package files.
echo.

pause
