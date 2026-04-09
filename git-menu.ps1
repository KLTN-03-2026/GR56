function Show-Menu {
    Write-Host "`n=== GIT WORKFLOW MENU ===" -ForegroundColor Cyan
    Write-Host "1. Create Feature"
    Write-Host "2. Create Bugfix"
    Write-Host "3. Create Hotfix"
    Write-Host "4. Cleanup Branch"
    Write-Host "0. Exit"
}

function Update-Develop {
    Write-Host "🔄 Updating develop..." -ForegroundColor Yellow
    git checkout develop
    git pull origin develop
}

function Create-Branch($type) {
    $name = Read-Host "Enter branch name (e.g., login-api)"
    $msg  = Read-Host "Enter commit message"

    if (-not $name -or -not $msg) {
        Write-Host "❌ Branch name and commit message are required" -ForegroundColor Red
        return
    }

    $branch = "$type/$name"

    Update-Develop

    Write-Host "🌱 Creating branch $branch" -ForegroundColor Green
    git checkout -b $branch

    Write-Host "💾 Committing code..." -ForegroundColor Yellow
    git add .
    git commit -m $msg

    Write-Host "🚀 Pushing branch..." -ForegroundColor Green
    git push origin $branch

    Write-Host "✅ Done! Create PR: $branch -> develop" -ForegroundColor Cyan
}

function Cleanup-Branch {
    $branch = Read-Host "Enter branch to delete (e.g., feature/login-api)"
    if (-not $branch) {
        Write-Host "❌ Branch is required" -ForegroundColor Red
        return
    }

    Update-Develop

    Write-Host "🧹 Deleting local branch..." -ForegroundColor Yellow
    git branch -d $branch

    Write-Host "☁️ Deleting remote branch..." -ForegroundColor Yellow
    git push origin --delete $branch

    Write-Host "✅ Cleanup complete" -ForegroundColor Green
}

# ===== MAIN LOOP =====
while ($true) {
    Show-Menu
    $choice = Read-Host "Select option"

    if ($choice -eq '0') {
        Write-Host "👋 Exiting..." -ForegroundColor Cyan
        break
    }

    switch ($choice) {
        '1' { Create-Branch "feature" }
        '2' { Create-Branch "bugfix" }
        '3' { Create-Branch "hotfix" }
        '4' { Cleanup-Branch }
        default { Write-Host "❌ Invalid option" -ForegroundColor Red }
    }
}