# Syncing with Upstream Kilocode

This document explains how to keep your fork synchronized with the upstream Kilocode repository while preserving your Copilot provider additions.

## Quick Sync (Recommended)

### On Windows:

```batch
scripts\sync-upstream.bat
```

### On Linux/Mac:

```bash
chmod +x scripts/sync-upstream.sh
./scripts/sync-upstream.sh
```

## Manual Sync Process

If you prefer to sync manually or need more control:

### 1. Ensure Clean Working Directory

```bash
git status
# Commit or stash any uncommitted changes
git add . && git commit -m "WIP: save current work"
```

### 2. Fetch Upstream Changes

```bash
git fetch Kilo-Org
```

### 3. Merge Upstream

```bash
git merge Kilo-Org/main --no-edit
```

### 4. Resolve Conflicts (if any)

If conflicts occur, they'll likely be in shared configuration files:

#### Common Conflict Files:

- `packages/types/src/provider-settings.ts` - Provider type definitions
- `src/api/providers/index.ts` - Provider exports
- `webview-ui/src/components/settings/providers/index.ts` - UI component exports
- `src/shared/api.ts` - API type definitions
- Localization files (`webview-ui/src/i18n/locales/*/settings.json`)

#### Resolution Strategy:

For each conflict, keep **BOTH** the upstream changes AND your Copilot additions:

```typescript
// Example: provider-settings.ts
export type ApiProvider = "anthropic" | "openai" | "copilot" // ← Keep your addition
// ... other providers from upstream
```

### 5. Complete the Merge

```bash
git add .
git commit
```

### 6. Run Tests

```bash
cd src && pnpm vitest run api/providers/fetchers/__tests__/copilot.test.ts
```

## Files Specific to Copilot Provider

These files are **exclusively yours** and should never conflict:

| File                                                       | Description                   |
| ---------------------------------------------------------- | ----------------------------- |
| `src/api/providers/copilot.ts`                             | Main Copilot provider handler |
| `src/api/providers/fetchers/copilot.ts`                    | Model fetcher for Copilot     |
| `src/api/providers/fetchers/__tests__/copilot.test.ts`     | Tests for model fetcher       |
| `webview-ui/src/components/settings/providers/Copilot.tsx` | Settings UI component         |
| `scripts/test-copilot-*.ts`                                | Copilot test scripts          |

## Files That May Need Merge Resolution

These files contain both upstream code AND your Copilot additions:

| File                                                    | Your Addition                     |
| ------------------------------------------------------- | --------------------------------- |
| `packages/types/src/provider-settings.ts`               | `"copilot"` in `ApiProvider` type |
| `src/api/providers/index.ts`                            | Export of Copilot provider        |
| `src/shared/api.ts`                                     | Copilot in model info mappings    |
| `webview-ui/src/components/settings/providers/index.ts` | Copilot component export          |
| Various `settings.json` files                           | Copilot-related translations      |

## Preventing Future Conflicts

### Strategy 1: Keep Additions at End of Lists

When adding Copilot entries to arrays or switch statements, add them at the **end**. This reduces conflicts since upstream changes typically happen earlier in the file.

### Strategy 2: Use the Sync Script

The sync script (`scripts/sync-upstream.bat` or `.sh`) automates the process and provides helpful guidance when conflicts occur.

### Strategy 3: Regular Syncs

Sync frequently (weekly or after major upstream releases) to avoid large, complex merges.

## Troubleshooting

### Merge Aborted / Need to Start Over

```bash
git merge --abort
```

### Accidentally Pushed Broken Code

```bash
# Find your backup tag (created by sync script)
git tag | grep backup

# Reset to backup
git reset --hard backup/pre-sync-XXXXXXXX-XXXXXX

# Force push (be careful!)
git push origin feature/add-copilot-support-at-f0e10b88 --force
```

### Tests Failing After Merge

1. Check if there are type changes in upstream that affect Copilot
2. Look for breaking API changes in the changelog
3. Update your Copilot implementation to match new patterns

## Upstream Remote Setup

If you don't have the upstream remote configured:

```bash
git remote add Kilo-Org https://github.com/Kilo-Org/kilocode.git
```

Verify remotes:

```bash
git remote -v
```
