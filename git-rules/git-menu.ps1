chcp 65001 > $null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

function Show-Menu {
    Clear-Host
    Write-Host "====================================" -ForegroundColor DarkCyan
    Write-Host "       GIT WORKFLOW MENU            " -ForegroundColor Cyan
    Write-Host "====================================" -ForegroundColor DarkCyan

    Write-Host "[1]" -NoNewline -ForegroundColor Yellow
    Write-Host " Create Branch"

    Write-Host "[2]" -NoNewline -ForegroundColor Yellow
    Write-Host " Commit"

    Write-Host "[3]" -NoNewline -ForegroundColor Yellow
    Write-Host " Push"

    Write-Host "[4]" -NoNewline -ForegroundColor Yellow
    Write-Host " Pull"

    Write-Host "[5]" -NoNewline -ForegroundColor Yellow
    Write-Host " Cleanup Branch"

    Write-Host "[6]" -NoNewline -ForegroundColor Yellow
    Write-Host " Checkout Branch"

    Write-Host "[0]" -NoNewline -ForegroundColor Red
    Write-Host " Exit"

    Write-Host "------------------------------------" -ForegroundColor DarkGray
}

# ===== INPUT HELPER =====
function Read-Choice($msg) {
    Write-Host "$msg" -ForegroundColor Cyan
    Write-Host "[0] Cancel" -ForegroundColor Red

    $input = Read-Host "Your choice"

    if ($input -eq "0") {
        Write-Host "Cancelled" -ForegroundColor DarkYellow
        return $null
    }
    return $input
}

# ===== GET REMOTE BRANCHES =====
function Get-Remote-Branches {
    return git ls-remote --heads origin | ForEach-Object {
        ($_ -split "refs/heads/")[1]
    } | Sort-Object
}

# ===== SELECT BRANCH =====
function Select-Remote-Branch {
    $branches = Get-Remote-Branches

    if (-not $branches) {
        Write-Host "No remote branches found"
        return $null
    }

    Write-Host "`nSelect branch:" -ForegroundColor Cyan

    for ($i = 0; $i -lt $branches.Count; $i++) {
        Write-Host "[$($i+1)] $($branches[$i])"
    }

    $choice = Read-Choice "Choose branch number"
    if (-not $choice -or $choice -lt 1 -or $choice -gt $branches.Count) {
        Write-Host "Invalid selection"
        return $null
    }

    return $branches[$choice - 1]
}

function Get-Current-Branch {
    return git branch --show-current
}

# ===== CREATE BRANCH =====
function Create-Branch {
    Write-Host "`nSelect branch type:" -ForegroundColor Cyan
    Write-Host "1. feature  (new functionality)"
    Write-Host "2. bugfix   (fixing a bug)"
    Write-Host "3. hotfix   (urgent fix)"

    $typeChoice = Read-Choice "Choose type"
    if (-not $typeChoice) { return }

    switch ($typeChoice) {
        "1" { $type = "feature"; $desc = "new functionality" }
        "2" { $type = "bugfix";  $desc = "bug fix" }
        "3" { $type = "hotfix";  $desc = "urgent fix" }
        default {
            Write-Host "Invalid selection"
            return
        }
    }

    Write-Host "→ Selected: $type ($desc)" -ForegroundColor Green

    $name = Read-Choice "Enter branch name"
    if (-not $name) { return }

    $base = Select-Remote-Branch
    if (-not $base) { return }

    git fetch origin
    git checkout -b "$type/$name" "origin/$base"

    Write-Host "Created: $type/$name based on $base" -ForegroundColor Green
}

# ===== COMMIT =====
# ===== COMMIT (CONVENTIONAL COMMITS VERSION) =====
function Commit-Changes {
    $branch = Get-Current-Branch
    if (-not $branch) { Write-Host "No active branch found" -ForegroundColor Red; return }

    # 1. Chọn Commit Type
    Write-Host "`nSelect commit type:" -ForegroundColor Cyan
    Write-Host "1) feat     - New feature"
    Write-Host "2) fix      - Bug fix"
    Write-Host "3) docs     - Documentation"
    Write-Host "4) style    - Code style (formatting)"
    Write-Host "5) refactor - Code refactoring"
    Write-Host "6) perf     - Performance improvement"
    Write-Host "7) test     - Add/update tests"
    Write-Host "8) build    - Build system changes"
    Write-Host "9) ci       - CI/CD changes"
    Write-Host "10) chore   - Maintenance tasks"

    $typeChoice = Read-Choice "Choose type [1-10]"
    if (-not $typeChoice) { return }

    $type = switch ($typeChoice) {
        "1" { "feat" }
        "2" { "fix" }
        "3" { "docs" }
        "4" { "style" }
        "5" { "refactor" }
        "6" { "perf" }
        "7" { "test" }
        "8" { "build" }
        "9" { "ci" }
        "10" { "chore" }
        default { Write-Host "Invalid selection"; return }
    }

    # 2. Nhập Scope (Optional)
    Write-Host ""
    $scope = Read-Host "Scope (optional, e.g., auth, api, ui)"
    
    # 3. Nhập Header (Description)
    Write-Host ""
    Write-Host "[*] Commit header (short description):" -ForegroundColor Cyan
    $message = Read-Host ">"
    if ([string]::IsNullOrWhiteSpace($message)) {
        Write-Host "Error: Message cannot be empty!" -ForegroundColor Red
        return
    }

    # 4. Nhập Body (Multi-line)
    Write-Host ""
    Write-Host "[*] Commit body (optional, multi-line. Press Enter twice to finish):" -ForegroundColor Cyan
    $body = ""
    $emptyCount = 0
    while ($true) {
        $line = Read-Host
        if ([string]::IsNullOrWhiteSpace($line)) {
            $emptyCount++
            if ($emptyCount -ge 2) { break }
            $body += "`n"
        } else {
            $emptyCount = 0
            $body += "$line`n"
        }
    }

    # 5. Check Breaking Change
    Write-Host ""
    $isBreaking = Read-Host "Is this a BREAKING CHANGE? [y/N]"
    $breakingChange = ""
    $commitHeader = ""

    if ($isBreaking -match "^[Yy]$") {
        Write-Host "[!] Describe the breaking change (Press Enter twice to finish):" -ForegroundColor Yellow
        $breakingDesc = ""
        $emptyCount = 0
        while ($true) {
            $line = Read-Host
            if ([string]::IsNullOrWhiteSpace($line)) {
                $emptyCount++
                if ($emptyCount -ge 2) { break }
                if ($breakingDesc -ne "") { $breakingDesc += "`n" }
            } else {
                $emptyCount = 0
                if ($breakingDesc -eq "") { $breakingDesc = $line } else { $breakingDesc += "`n$line" }
            }
        }
        
        if (-not [string]::IsNullOrWhiteSpace($breakingDesc)) {
            $breakingChange = "`n`nBREAKING CHANGE: $breakingDesc"
            if ([string]::IsNullOrWhiteSpace($scope)) { $commitHeader = "${type}!: $message" } 
            else { $commitHeader = "${type}(${scope})!: $message" }
        }
    } else {
        if ([string]::IsNullOrWhiteSpace($scope)) { $commitHeader = "${type}: $message" } 
        else { $commitHeader = "${type}(${scope}): $message" }
    }

    # Build full message
    $fullCommitMsg = $commitHeader
    if (-not [string]::IsNullOrWhiteSpace($body)) { $fullCommitMsg += "`n`n$body" }
    if (-not [string]::IsNullOrWhiteSpace($breakingChange)) { $fullCommitMsg += $breakingChange }

    # Preview & Confirm
    Write-Host "`n--- Preview ---" -ForegroundColor Yellow
    Write-Host $fullCommitMsg -ForegroundColor Green
    Write-Host "---------------" -ForegroundColor Yellow
    
    $confirm = Read-Host "Commit these changes? [Y/n]"
    if ($confirm -match "^[Nn]$") { Write-Host "Commit cancelled." -ForegroundColor DarkYellow; return }

    # Execute Git
    git add .
    $tempFile = [System.IO.Path]::GetTempFileName()
    $fullCommitMsg | Out-File -FilePath $tempFile -Encoding UTF8
    git commit -F $tempFile
    Remove-Item $tempFile

    Write-Host "Successfully committed!" -ForegroundColor Green
}

# ===== PUSH =====
function Push-Branch {
    $branch = Get-Current-Branch
    if (-not $branch) { return }

    git push -u origin $branch
    Write-Host "Pushed: $branch" -ForegroundColor Green
}

# ===== PULL =====
function Pull-Branch {
    $branch = Select-Remote-Branch
    if (-not $branch) { return }

    $confirm = Read-Choice "⚠️ Warning: Reset local changes? (y/n)"
    if ($confirm -ne "y") { return }

    git fetch origin
    git checkout $branch 2>$null
    if ($LASTEXITCODE -ne 0) {
        git checkout -b $branch origin/$branch
    }

    git reset --hard
    git clean -df
    git pull origin $branch

    Write-Host "Updated and synced: $branch" -ForegroundColor Green
}

# ===== CLEANUP =====
function Cleanup-Branch {
    $branch = Select-Remote-Branch
    if (-not $branch) { return }

    $confirm = Read-Choice "Are you sure you want to delete remote branch $branch? (y/n)"
    if ($confirm -ne "y") { return }

    git push origin --delete $branch

    Write-Host "Deleted remote branch: $branch" -ForegroundColor Green
}

# ===== CHECKOUT =====
function Checkout-Branch {
    $branch = Select-Remote-Branch
    if (-not $branch) { return }

    git fetch origin
    git checkout $branch 2>$null
    if ($LASTEXITCODE -ne 0) {
        git checkout -b $branch origin/$branch
    }

    Write-Host "Switched to: $branch" -ForegroundColor Green
}

# ===== MAIN =====
while ($true) {
    Show-Menu
    $choice = Read-Host "Select an option"

    if ($choice -eq "0") { break }

    switch ($choice) {
        "1" { Create-Branch }
        "2" { Commit-Changes }
        "3" { Push-Branch }
        "4" { Pull-Branch }
        "5" { Cleanup-Branch }
        "6" { Checkout-Branch }
        default { Write-Host "Invalid option" -ForegroundColor Red }
    }

    Write-Host "`nPress any key to continue..."
    $null = [Console]::ReadKey($true)
}