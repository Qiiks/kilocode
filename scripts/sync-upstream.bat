@echo off
REM Sync with Upstream Kilocode Repository
REM This script helps merge upstream changes while preserving local Copilot provider additions
REM
REM Usage: scripts\sync-upstream.bat [upstream-remote] [upstream-branch]
REM   upstream-remote: Name of the upstream remote (default: Kilo-Org)
REM   upstream-branch: Branch to merge from (default: main)

setlocal EnableDelayedExpansion

set "UPSTREAM_REMOTE=%~1"
set "UPSTREAM_BRANCH=%~2"

if "%UPSTREAM_REMOTE%"=="" set "UPSTREAM_REMOTE=Kilo-Org"
if "%UPSTREAM_BRANCH%"=="" set "UPSTREAM_BRANCH=main"

for /f "tokens=*" %%a in ('git branch --show-current') do set "CURRENT_BRANCH=%%a"

echo ==========================================
echo Kilocode Upstream Sync Script
echo ==========================================
echo Current branch: %CURRENT_BRANCH%
echo Upstream: %UPSTREAM_REMOTE%/%UPSTREAM_BRANCH%
echo.

REM Check for uncommitted changes
git diff-index --quiet HEAD -- >nul 2>&1
if errorlevel 1 (
    echo ERROR: You have uncommitted changes. Please commit or stash them first.
    exit /b 1
)

echo [1/5] Fetching latest changes from %UPSTREAM_REMOTE%...
git fetch "%UPSTREAM_REMOTE%"
if errorlevel 1 (
    echo ERROR: Failed to fetch from %UPSTREAM_REMOTE%
    exit /b 1
)

REM Count commits behind
for /f %%a in ('git rev-list --count HEAD.."%UPSTREAM_REMOTE%/%UPSTREAM_BRANCH%" 2^>nul') do set "COMMITS_BEHIND=%%a"
if "%COMMITS_BEHIND%"=="" set "COMMITS_BEHIND=0"
echo        Commits behind upstream: %COMMITS_BEHIND%

if "%COMMITS_BEHIND%"=="0" (
    echo.
    echo Already up to date with %UPSTREAM_REMOTE%/%UPSTREAM_BRANCH%
    exit /b 0
)

echo.
echo [2/5] Creating backup tag...
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "BACKUP_TAG=backup/pre-sync-%dt:~0,8%-%dt:~8,6%"
git tag "%BACKUP_TAG%"
echo        Backup created: %BACKUP_TAG%

echo.
echo [3/5] Merging %UPSTREAM_REMOTE%/%UPSTREAM_BRANCH%...
echo.

git merge "%UPSTREAM_REMOTE%/%UPSTREAM_BRANCH%" --no-edit
if errorlevel 1 (
    echo.
    echo [4/5] Merge has conflicts that need resolution.
    echo.
    echo ==========================================
    echo CONFLICT RESOLUTION GUIDE
    echo ==========================================
    echo.
    echo Files with conflicts:
    git diff --name-only --diff-filter=U
    echo.
    echo COPILOT PROVIDER FILES TO PRESERVE:
    echo   - src/api/providers/copilot.ts
    echo   - src/api/providers/fetchers/copilot.ts
    echo   - src/api/providers/fetchers/__tests__/copilot.test.ts
    echo   - webview-ui/src/components/settings/providers/Copilot.tsx
    echo   - scripts/test-copilot-*.ts
    echo.
    echo For conflicts in shared files (provider-settings.ts, index.ts, etc.):
    echo   1. Keep BOTH the upstream changes AND your Copilot additions
    echo   2. Make sure 'copilot' entries are preserved in arrays/switches
    echo.
    echo After resolving conflicts, run:
    echo   git add .
    echo   git commit
    echo.
    echo To abort the merge and restore previous state:
    echo   git merge --abort
    echo   git tag -d %BACKUP_TAG%
    echo.
    exit /b 1
)

echo.
echo [4/5] Merge completed successfully!

echo.
echo [5/5] Running tests to verify merge...
echo.

where pnpm >nul 2>&1
if not errorlevel 1 (
    echo Running Copilot provider tests...
    pushd src
    call pnpm vitest run api/providers/fetchers/__tests__/copilot.test.ts --reporter=verbose 2>nul
    popd
)

echo.
echo ==========================================
echo SYNC COMPLETE
echo ==========================================
echo Merged %COMMITS_BEHIND% commits from %UPSTREAM_REMOTE%/%UPSTREAM_BRANCH%
echo Backup tag: %BACKUP_TAG%
echo.
echo To push changes:
echo   git push origin %CURRENT_BRANCH%
echo.
echo To undo this merge:
echo   git reset --hard %BACKUP_TAG%
echo   git tag -d %BACKUP_TAG%
echo.

endlocal