@echo off
echo ====================================
echo PowerWorld Language Support Builder
echo ====================================
echo.

echo [1/4] Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)
echo Dependencies installed successfully!
echo.

echo [2/4] Compiling TypeScript...
call npm run compile
if %ERRORLEVEL% neq 0 (
    echo ERROR: TypeScript compilation failed!
    pause
    exit /b 1
)
echo TypeScript compiled successfully!
echo.

echo [3/4] Packaging extension...
call vsce package
if %ERRORLEVEL% neq 0 (
    echo ERROR: VSCE packaging failed!
    pause
    exit /b 1
)
echo Extension packaged successfully!
echo.

echo [4/4] Build complete!
echo.
echo Available VSIX files:
dir *.vsix /b
echo.
echo Build completed successfully!
pause
