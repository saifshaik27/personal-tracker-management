@echo off
echo ====================================================================
echo Uploading Saif's Personal Expense Tracker to GitHub
echo Repository: github.com/saifshaik27/personal-expense-tracker
echo ====================================================================

REM Check if git is installed
where git >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Git is not installed or not in your system PATH.
    echo Please install Git from https://git-scm.com/download/win and try again.
    pause
    exit /b
)

echo [1/5] Initializing Git repository...
git init

echo [2/5] Adding all project files...
git add .

echo [3/5] Committing initial release...
git commit -m "feat: complete implementation of Saif's Personal Expense Tracker Management System"

echo [4/5] Setting main branch and remote origin...
git branch -M main
git remote remove origin >nul 2>&1
git remote add origin https://github.com/saifshaik27/personal-expense-tracker.git

echo [5/5] Pushing to GitHub...
git push -u origin main

if %ERRORLEVEL% equ 0 (
    echo ====================================================================
    echo [SUCCESS] Project uploaded successfully to:
    echo https://github.com/saifshaik27/personal-expense-tracker
    echo ====================================================================
) else (
    echo [NOTE] Push failed. Make sure you created the repo 'personal-expense-tracker'
    echo on https://github.com/new and are signed in to git.
)
pause
