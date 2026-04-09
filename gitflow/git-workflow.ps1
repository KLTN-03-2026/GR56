function Show-Menu {
    git checkout $defaultBranch
    git pull origin $defaultBranch

    return $defaultBranch
}

function Create-Branch($type) {
    $name = Read-Host "Enter branch name (e.g., login-api)"
    $msg  = Read-Host "Enter commit message"

    if (-not $name -or -not $msg) {
        Write-Host "[ERROR] Branch name and commit message are required" -ForegroundColor Red
        return
    }

    $branch = "$type/$name"

    $base = Update-Develop

    Write-Host "Creating branch $branch" -ForegroundColor Green
    git checkout -b $branch

    Write-Host "Committing code..." -ForegroundColor Yellow
    git add .
    git commit -m $msg

    Write-Host "Pushing branch..." -ForegroundColor Green
    git push origin $branch

    Write-Host "[DONE] Create PR: $branch -> $base" -ForegroundColor Cyan
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