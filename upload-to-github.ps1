Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "Uploading Saif's Personal Expense Tracker to GitHub" -ForegroundColor Green
Write-Host "Target: https://github.com/saifshaik27/personal-expense-tracker" -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Cyan

# Check if git is available
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[!] Git command was not found on your PATH." -ForegroundColor Red
    Write-Host "Download and install Git from: https://git-scm.com/download/win" -ForegroundColor White
    Write-Host "After installing Git, re-run this script." -ForegroundColor White
    pause
    exit
}

Write-Host "--> Initializing Git repository..." -ForegroundColor Gray
git init

Write-Host "--> Adding project files..." -ForegroundColor Gray
git add .

Write-Host "--> Committing changes..." -ForegroundColor Gray
git commit -m "feat: complete implementation of Saif's Personal Expense Tracker Management System"

Write-Host "--> Configuring branch 'main'..." -ForegroundColor Gray
git branch -M main

Write-Host "--> Configuring remote origin..." -ForegroundColor Gray
git remote remove origin 2>$null
git remote add origin https://github.com/saifshaik27/personal-expense-tracker.git

Write-Host "--> Pushing to GitHub (https://github.com/saifshaik27/personal-expense-tracker)..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "====================================================================" -ForegroundColor Green
    Write-Host "[SUCCESS] Pushed to github.com/saifshaik27/personal-expense-tracker!" -ForegroundColor Green
    Write-Host "====================================================================" -ForegroundColor Green
} else {
    Write-Host "[!] Push unsuccessful. Verify that the repository is created on github.com/new and authentication is configured." -ForegroundColor Yellow
}
