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

# ===== INPUT HELPER =====
function Read-Choice($message) {
    Write-Host "$message" -ForegroundColor Cyan
    Write-Host "[0] Cancel" -ForegroundColor Red

    $input = Read-Host "Your choice"

    if ($input -eq "0") {
        Write-Host "Cancelled." -ForegroundColor DarkYellow
        return $null
    }

    return $input
}

function Get-Current-Branch {
    return (git branch --show-current)
}

# ===== CREATE BRANCH =====
function Create-Branch {
    $typeChoice = Read-Choice "Type (1=feature, 2=bugfix, 3=hotfix)"
    if (-not $typeChoice) { return }

    switch ($typeChoice) {
        "1" { $type = "feature" }
        "2" { $type = "bugfix" }
        "3" { $type = "hotfix" }
        default {
            Write-Host "Invalid type"
            return
        }
    }

    $name = Read-Choice "Branch name"
    if (-not $name) { return }

    $branch = "$type/$name"

    git checkout develop 2>$null
    git pull origin develop

    git checkout -b $branch
    Write-Host "Created branch: $branch" -ForegroundColor Green
}

# ===== COMMIT =====
function Commit-Changes {
    $branch = Get-Current-Branch
    if (-not $branch) {
        Write-Host "No branch detected"
        return
    }

    Write-Host "`nSelect commit type:"
    Write-Host "1. feat"
    Write-Host "2. fix"
    Write-Host "3. refactor"
    Write-Host "4. docs"
    Write-Host "5. style"
    Write-Host "6. test"
    Write-Host "7. chore"

    $choice = Read-Choice "Choose type"
    if (-not $choice) { return }

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

    $msg = Read-Choice "Enter message"
    if (-not $msg) { return }

    $finalMsg = "${type}: $msg"

    git add .
    git commit -m $finalMsg

    Write-Host "Committed: $finalMsg" -ForegroundColor Green
}

# ===== PUSH =====
function Push-Branch {
    $branch = Get-Current-Branch
    if (-not $branch) {
        Write-Host "No branch detected"
        return
    }

    git push origin $branch
    Write-Host "Pushed: $branch" -ForegroundColor Green
}

# ===== PULL =====
function Pull-Branch {
    Write-Host "`nFetching branches..." -ForegroundColor Cyan
    git fetch --all

    $branches = git ls-remote --heads origin | ForEach-Object {
        ($_ -split "refs/heads/")[1]
    }

    if (-not $branches) {
        Write-Host "No branches found"
        return
    }

    Write-Host "`nSelect branch to pull:" -ForegroundColor Cyan
    for ($i = 0; $i -lt $branches.Count; $i++) {
        Write-Host "[$($i + 1)] $($branches[$i])"
    }

    $choice = Read-Choice "Choose branch"
    if (-not $choice -or $choice -lt 1 -or $choice -gt $branches.Count) {
        Write-Host "Invalid selection"
        return
    }

    $selectedBranch = $branches[$choice - 1]

    Write-Host "`nSelected: $selectedBranch" -ForegroundColor Yellow

    $confirm = Read-Choice " Reset local changes? (y/n)"
    if (-not $confirm -or $confirm -ne "y") {
        Write-Host "Cancelled"
        return
    }

    git checkout $selectedBranch 2>$null
    if ($LASTEXITCODE -ne 0) {
        git checkout -b $selectedBranch origin/$selectedBranch
    }

    git reset --hard
    git clean -df
    git pull origin $selectedBranch

    Write-Host "Updated: $selectedBranch" -ForegroundColor Green
}

# ===== CLEANUP =====
function Cleanup-Branch {
    $branch = Read-Choice "Branch to delete"
    if (-not $branch) { return }

    git checkout develop 2>$null
    git pull origin develop

    git branch -d $branch
    git push origin --delete $branch

    Write-Host "Deleted: $branch" -ForegroundColor Green
}

# ===== CHECKOUT =====
function Checkout-Branch {
    Write-Host "`nAvailable branches:" -ForegroundColor Cyan

    $branches = git branch --format="%(refname:short)"

    if (-not $branches) {
        Write-Host "No branches found"
        return
    }

    for ($i = 0; $i -lt $branches.Count; $i++) {
        Write-Host "[$($i + 1)] $($branches[$i])"
    }

    $choice = Read-Choice "Select branch number"
    if (-not $choice -or $choice -lt 1 -or $choice -gt $branches.Count) {
        Write-Host "Invalid selection"
        return
    }

    $selectedBranch = $branches[$choice - 1]

    git checkout $selectedBranch

    Write-Host "Switched to $selectedBranch" -ForegroundColor Green
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
        "4" { Pull-Branch }
        "5" { Cleanup-Branch }
        "6" { Checkout-Branch }
        default { Write-Host "Invalid option" }
    }

    Pause
}