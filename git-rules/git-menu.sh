#!/bin/bash

# Tự động nhảy ra thư mục gốc của dự án để lệnh Git nhận diện được toàn bộ code
git_root="$(git rev-parse --show-toplevel 2>/dev/null)"
if [[ -n "$git_root" ]]; then
    cd "$git_root" || exit
fi

function show_menu() {
    echo -e "\n=== GIT WORKFLOW MENU ==="
    echo "1. Create Branch"
    echo "2. Commit (auto prefix)"
    echo "3. Push"
    echo "4. Cleanup"
    echo "0. Exit"
}

function get_current_branch() {
    git branch --show-current
}

function update_base() {
    echo "Updating base branch..."

    local base="develop"
    if ! git rev-parse --verify develop >/dev/null 2>&1; then
        base="main"
    fi

    git checkout "$base"
    git pull origin "$base"
    echo "$base"
}

function create_branch() {
    echo "Type (1=feature, 2=bugfix, 3=hotfix):"
    read -rp "Choose: " type_choice

    local type=""
    case "$type_choice" in
        1) type="feature" ;;
        2) type="bugfix" ;;
        3) type="hotfix" ;;
        *) echo "Invalid type"; return ;;
    esac

    read -rp "Branch name: " name
    if [[ -z "$name" ]]; then
        echo "Branch name required"
        return
    fi

    # Tự động thay thế dấu cách (khoảng trắng) bằng dấu gạch ngang
    name="${name// /-}"

    local branch="$type/$name"
    
    update_base >/dev/null
    git checkout -b "$branch"
    echo "Created branch: $branch"
}

function commit_changes() {
    local branch
    branch=$(get_current_branch)

    if [[ -z "$branch" ]]; then
        echo "No branch detected"
        return
    fi

    echo -e "\nSelect commit type:"
    echo "1. feat (new feature)"
    echo "2. fix (bug fix)"
    echo "3. refactor"
    echo "4. docs"
    echo "5. style"
    echo "6. test"
    echo "7. chore"

    read -rp "Choose type: " choice

    local type=""
    case "$choice" in
        1) type="feat" ;;
        2) type="fix" ;;
        3) type="refactor" ;;
        4) type="docs" ;;
        5) type="style" ;;
        6) type="test" ;;
        7) type="chore" ;;
        *) echo "Invalid type"; return ;;
    esac

    read -rp "Enter message (without prefix): " msg

    if [[ -z "$msg" ]]; then
        echo "Message required"
        return
    fi

    local final_msg="${type}: ${msg}"
    echo "Committing: $final_msg"

    git add --all
    git commit -m "$final_msg"
}

function push_branch() {
    local branch
    branch=$(get_current_branch)

    if [[ -z "$branch" ]]; then
        echo "No branch detected"
        return
    fi

    git push origin "$branch"
    echo "Pushed: $branch"
}

function cleanup_branch() {
    read -rp "Branch to delete: " branch

    if [[ -z "$branch" ]]; then
        echo "Branch required"
        return
    fi

    update_base >/dev/null
    git branch -d "$branch"
    git push origin --delete "$branch"
    echo "Deleted: $branch"
}

# ===== MAIN LOOP =====
while true; do
    show_menu
    read -rp "Select option: " choice

    if [[ "$choice" == "0" ]]; then
        echo "Exiting..."
        break
    fi

    case "$choice" in
        1) create_branch ;;
        2) commit_changes ;;
        3) push_branch ;;
        4) cleanup_branch ;;
        *) echo "Invalid option" ;;
    esac
done