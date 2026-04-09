function Show-Menu {
    Write-Host "`n=== GIT WORKFLOW MENU ==="
    Write-Host "1. Create Branch"
    Write-Host "2. Commit"
    Write-Host "3. Push"
    Write-Host "4. Cleanup"
    Write-Host "0. Exit"
}

function Get-Current-Branch {
    git branch --show-current
}

function Update-Base {
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
    $type = Read-Host "Type (feature/bugfix/hotfix)"
    $name = Read-Host "Branch name"

    if (-not $type -or -not $name) {
        Write-Host "Invalid input"
        return
    }

    $branch = "$type/$name"
    Update-Base

    git checkout -b $branch
    Write-Host "Created $branch"
}

function Commit-Changes {
    $branch = Get-Current-Branch
    $msg = Read-Host "Commit message (feat:, fix:...)"

    if (-not $msg) {
        Write-Host "Message required"
        return
    }

    if ($msg -notmatch "^(feat|fix|refactor|docs|style|test|chore):") {
        Write-Host "Invalid format! Use feat:, fix:, ..."
        return
    }

    git add .
    git commit -m $msg
}

function Push-Branch {
    $branch = Get-Current-Branch
    git push origin $branch
    Write-Host "Pushed $branch"
}

function Cleanup-Branch {
    $branch = Read-Host "Branch to delete"
    if (-not $branch) { return }

    Update-Base
    git branch -d $branch
    git push origin --delete $branch
}

while ($true) {
    Show-Menu
    $c = Read-Host "Choose"

    if ($c -eq "0") { break }

    switch ($c) {
        "1" { Create-Branch }
        "2" { Commit-Changes }
        "3" { Push-Branch }
        "4" { Cleanup-Branch }
        default { Write-Host "Invalid" }
    }
}