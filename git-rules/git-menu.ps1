function Show-Menu {
    Clear-Host
    Write-Host "====================================" -ForegroundColor DarkCyan
    Write-Host "      GIT WORKFLOW MENU        " -ForegroundColor Cyan
    Write-Host "====================================" -ForegroundColor DarkCyan

    Write-Host "[1]" -NoNewline -ForegroundColor Yellow
    Write-Host " Create Branch" -ForegroundColor White

    Write-Host "[2]" -NoNewline -ForegroundColor Yellow
    Write-Host " Commit (auto prefix)" -ForegroundColor White

    Write-Host "[3]" -NoNewline -ForegroundColor Yellow
    Write-Host " Push" -ForegroundColor White

    Write-Host "[4]" -NoNewline -ForegroundColor Yellow
    Write-Host " Pull" -ForegroundColor White

    Write-Host "[5]" -NoNewline -ForegroundColor Yellow
    Write-Host " Cleanup Branch" -ForegroundColor White

    Write-Host "[6]" -NoNewline -ForegroundColor Yellow
    Write-Host " Checkout Branch" -ForegroundColor White

    Write-Host "[0]" -NoNewline -ForegroundColor Red
    Write-Host " Exit" -ForegroundColor White

    Write-Host "------------------------------------" -ForegroundColor DarkGray
}
function Get-Current-Branch {
    return (git branch --show-current)
}

function Update-Base {
    Write-Host "Updating base branch..."

    $base = "develop"
    git rev-parse --verify develop 2>$null

    if ($LASTEXITCODE -ne 0) {
        $base = "main"
    }

    git checkout $base
    git pull origin $base

    return $base
}

function Create-Branch {
    Write-Host "Type (1=feature, 2=bugfix, 3=hotfix)"
    $typeChoice = Read-Host "Choose"

    switch ($typeChoice) {
        "1" { $type = "feature" }
        "2" { $type = "bugfix" }
        "3" { $type = "hotfix" }
        default {
            Write-Host "Invalid type"
            return
        }
    }

    $name = Read-Host "Branch name"
    if (-not $name) {
        Write-Host "Branch name required"
        return
    }

    $branch = "$type/$name"

    Update-Base

    git checkout -b $branch
    Write-Host "Created branch: $branch"
}

function Commit-Changes {
    $branch = Get-Current-Branch

    if (-not $branch) {
        Write-Host "No branch detected"
        return
    }

    Write-Host "`nSelect commit type:"
    Write-Host "1. feat (new feature)"
    Write-Host "2. fix (bug fix)"
    Write-Host "3. refactor"
    Write-Host "4. docs"
    Write-Host "5. style"
    Write-Host "6. test"
    Write-Host "7. chore"

    $choice = Read-Host "Choose type"

    switch ($choice) {
        "1" { $type = "feat" }
        "2" { $type = "fix" }
        "3" { $type = "refactor" }
        "4" { $type = "docs" }
        "5" { $type = "style" }
        "6" { $type = "test" }
        "7" { $type = "chore" }
        default {
            Write-Host "Invalid type"
            return
        }
    }

    $msg = Read-Host "Enter message (without prefix)"

    if (-not $msg) {
        Write-Host "Message required"
        return
    }

    # FIX lỗi PowerShell dấu :
    $finalMsg = "${type}: $msg"

    Write-Host "Committing: $finalMsg"

    git add .
    git commit -m $finalMsg
}

function Push-Branch {
    $branch = Get-Current-Branch

    if (-not $branch) {
        Write-Host "No branch detected"
        return
    }

    git push origin $branch
    Write-Host "Pushed: $branch"
}

function Cleanup-Branch {
    $branch = Read-Host "Branch to delete"

    if (-not $branch) {
        Write-Host "Branch required"
        return
    }

    Update-Base

    git branch -d $branch
    git push origin --delete $branch

    Write-Host "Deleted: $branch"
}
function Checkout-Branch {
    Write-Host "`n Available branches:" -ForegroundColor Cyan

    $branches = git branch --format="%(refname:short)"

    if (-not $branches) {
        Write-Host "No branches found"
        return
    }

    for ($i = 0; $i -lt $branches.Count; $i++) {
        Write-Host "[$($i + 1)] $($branches[$i])"
    }

    $choice = Read-Host "Select branch number"

    if (-not $choice -or $choice -lt 1 -or $choice -gt $branches.Count) {
        Write-Host "Invalid selection"
        return
    }

    $selectedBranch = $branches[$choice - 1]

    git checkout $selectedBranch

    Write-Host " Switched to $selectedBranch" -ForegroundColor Green
}

# ===== MAIN LOOP =====
while ($true) {
    Show-Menu
    $choice = Read-Host "Select option"

    if ($choice -eq "0") {
        Write-Host "Exiting..."
        break
    }

    switch ($choice) {
        "1" { Create-Branch }
        "2" { Commit-Changes }
        "3" { Push-Branch }
        "4" { Cleanup-Branch }
        "5" { Pull-Branch } 
        "6" { Checkout-Branch }
        default { Write-Host "Invalid option" }
    }
}