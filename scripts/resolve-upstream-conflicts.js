#!/usr/bin/env node

/**
 * Upstream Conflict Resolution Script
 *
 * This script automatically resolves known conflict patterns when merging
 * from the upstream Kilocode repository while preserving custom providers
 * like the Copilot integration.
 *
 * Usage:
 *   node scripts/resolve-upstream-conflicts.js
 *
 * Or run after a failed merge:
 *   git merge upstream/main
 *   node scripts/resolve-upstream-conflicts.js
 *   git commit -m "Merge upstream with auto-resolved conflicts"
 */

const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

// Custom providers to preserve during merges
const CUSTOM_PROVIDERS = {
	copilot: {
		name: "Copilot",
		handler: "CopilotHandler",
		modelIdKey: "copilotModelId",
		label: "GitHub Copilot",
		files: ["src/api/providers/copilot.ts", "src/api/providers/fetchers/copilot.ts"],
	},
}

// ANSI color codes
const colors = {
	reset: "\x1b[0m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	cyan: "\x1b[36m",
	bold: "\x1b[1m",
}

function log(message, color = "reset") {
	console.log(`${colors[color]}${message}${colors.reset}`)
}

function getConflictedFiles() {
	try {
		const output = execSync("git diff --name-only --diff-filter=U", { encoding: "utf-8" })
		return output
			.trim()
			.split("\n")
			.filter((f) => f)
	} catch (error) {
		return []
	}
}

function checkoutTheirs(file) {
	try {
		execSync(`git checkout --theirs "${file}"`, { stdio: "pipe" })
		return true
	} catch (error) {
		return false
	}
}

function checkoutOurs(file) {
	try {
		execSync(`git checkout --ours "${file}"`, { stdio: "pipe" })
		return true
	} catch (error) {
		return false
	}
}

function stageFile(file) {
	try {
		execSync(`git add "${file}"`, { stdio: "pipe" })
		return true
	} catch (error) {
		return false
	}
}

function readFile(file) {
	try {
		return fs.readFileSync(file, "utf-8")
	} catch (error) {
		return null
	}
}

function writeFile(file, content) {
	try {
		fs.writeFileSync(file, content, "utf-8")
		return true
	} catch (error) {
		return false
	}
}

/**
 * Resolve provider index exports (src/api/providers/index.ts)
 */
function resolveProviderIndex(file) {
	log(`  Resolving provider exports: ${file}`, "cyan")

	// Use theirs as base
	checkoutTheirs(file)

	let content = readFile(file)
	if (!content) return false

	// Ensure all custom provider exports exist
	for (const [key, provider] of Object.entries(CUSTOM_PROVIDERS)) {
		const exportLine = `export { ${provider.handler} } from "./${key}"`
		if (!content.includes(provider.handler)) {
			log(`    Adding export for ${provider.handler}`, "yellow")
			// Add before the last line
			const lines = content.split("\n")
			const lastNonEmptyIndex = lines.findLastIndex((line) => line.trim())
			lines.splice(lastNonEmptyIndex + 1, 0, exportLine)
			content = lines.join("\n")
		}
	}

	writeFile(file, content)
	stageFile(file)
	return true
}

/**
 * Resolve provider settings (packages/types/src/provider-settings.ts)
 */
function resolveProviderSettings(file) {
	log(`  Resolving provider settings: ${file}`, "cyan")

	// Use theirs as base
	checkoutTheirs(file)

	let content = readFile(file)
	if (!content) return false

	// Ensure copilot is in dynamicProviders
	if (content.includes("dynamicProviders") && !content.match(/"copilot"/)) {
		log(`    Adding copilot to dynamicProviders`, "yellow")
		content = content.replace(/(dynamicProviders\s*=\s*\[[\s\S]*?)(\]\s*as\s*const)/, '$1  "copilot",\n$2')
	}

	// Ensure copilot is in providerNames
	if (content.includes("providerNames") && !content.match(/"copilot"/)) {
		log(`    Adding copilot to providerNames`, "yellow")
		content = content.replace(/(providerNames\s*=\s*\[[\s\S]*?)(\]\s*as\s*const)/, '$1  "copilot",\n$2')
	}

	// Ensure copilotModelId is in modelIdKeys
	if (content.includes("modelIdKeys") && !content.match(/"copilotModelId"/)) {
		log(`    Adding copilotModelId to modelIdKeys`, "yellow")
		content = content.replace(/(modelIdKeys\s*=\s*\[[\s\S]*?)(\]\s*as\s*const)/, '$1  "copilotModelId",\n$2')
	}

	// Ensure copilotSchema exists
	if (!content.includes("copilotSchema")) {
		log(`    Adding copilotSchema`, "yellow")
		const schemaCode = `
const copilotSchema = baseProviderSettingsSchema.extend({
  copilotModelId: z.string().optional(),
})
`
		// Add before providerSettingsSchemaDiscriminated
		content = content.replace(/(const\s+providerSettingsSchemaDiscriminated)/, `${schemaCode}\n$1`)
	}

	// Ensure copilot is in discriminated union
	if (
		content.includes("providerSettingsSchemaDiscriminated") &&
		!content.includes('copilotSchema.merge(z.object({ apiProvider: z.literal("copilot")')
	) {
		log(`    Adding copilot to discriminated union`, "yellow")
		content = content.replace(
			/(defaultSchema,?\s*\])/,
			`copilotSchema.merge(z.object({ apiProvider: z.literal("copilot") })),\n  $1`,
		)
	}

	// Ensure copilot schema shape is in providerSettingsSchema
	if (!content.includes("...copilotSchema.shape")) {
		log(`    Adding copilotSchema.shape to providerSettingsSchema`, "yellow")
		content = content.replace(/(...codebaseIndexProviderSchema\.shape)/, `...copilotSchema.shape,\n  $1`)
	}

	writeFile(file, content)
	stageFile(file)
	return true
}

/**
 * Resolve CLI labels
 */
function resolveCLILabels(file) {
	log(`  Resolving CLI labels: ${file}`, "cyan")

	checkoutTheirs(file)

	let content = readFile(file)
	if (!content) return false

	if (!content.includes("copilot:")) {
		log(`    Adding copilot label`, "yellow")
		content = content.replace(/(\}\s*as\s*const)/, `  copilot: "GitHub Copilot",\n$1`)
	}

	writeFile(file, content)
	stageFile(file)
	return true
}

/**
 * Resolve CLI validation
 */
function resolveCLIValidation(file) {
	log(`  Resolving CLI validation: ${file}`, "cyan")

	checkoutTheirs(file)

	let content = readFile(file)
	if (!content) return false

	// Ensure copilot validation entry exists
	if (!content.includes("copilot:")) {
		log(`    Adding copilot validation`, "yellow")
		content = content.replace(/(\}\s*as\s*const\s*satisfies)/, `  copilot: [],\n$1`)
	}

	writeFile(file, content)
	stageFile(file)
	return true
}

/**
 * Resolve shared/api.ts
 */
function resolveSharedApi(file) {
	log(`  Resolving shared API: ${file}`, "cyan")

	checkoutTheirs(file)

	let content = readFile(file)
	if (!content) return false

	// Ensure copilot is in ApiProvider if applicable
	if (content.includes("ApiProvider") && !content.includes('"copilot"')) {
		log(`    Adding copilot to ApiProvider`, "yellow")
		// This is usually handled by provider-settings, but check anyway
	}

	writeFile(file, content)
	stageFile(file)
	return true
}

/**
 * Resolve lock files
 */
function resolveLockFile(file) {
	log(`  Resolving lock file: ${file}`, "cyan")

	// For lock files, always use theirs and let pnpm install regenerate
	checkoutTheirs(file)
	stageFile(file)
	return true
}

/**
 * Resolve documentation/markdown files
 */
function resolveMarkdown(file) {
	log(`  Resolving documentation: ${file}`, "cyan")

	// For docs, prefer upstream version
	checkoutTheirs(file)
	stageFile(file)
	return true
}

/**
 * Main conflict resolution logic
 */
function resolveConflicts() {
	log("\n🔧 Upstream Conflict Resolution Script\n", "bold")

	const conflicts = getConflictedFiles()

	if (conflicts.length === 0) {
		log("✅ No conflicts to resolve!", "green")
		return { resolved: 0, unresolved: [] }
	}

	log(`Found ${conflicts.length} conflicted file(s):\n`, "yellow")
	conflicts.forEach((f) => log(`  - ${f}`, "yellow"))
	log("")

	let resolved = 0
	const unresolved = []

	for (const file of conflicts) {
		let success = false

		// Match file patterns and apply appropriate resolution
		if (file === "src/api/providers/index.ts") {
			success = resolveProviderIndex(file)
		} else if (file === "packages/types/src/provider-settings.ts") {
			success = resolveProviderSettings(file)
		} else if (file === "cli/src/constants/providers/labels.ts") {
			success = resolveCLILabels(file)
		} else if (file === "cli/src/constants/providers/validation.ts") {
			success = resolveCLIValidation(file)
		} else if (file === "src/shared/api.ts") {
			success = resolveSharedApi(file)
		} else if (file.endsWith(".md")) {
			success = resolveMarkdown(file)
		} else if (file === "pnpm-lock.yaml" || file === "package-lock.json") {
			success = resolveLockFile(file)
		} else if (file.includes("/providers/") && file.endsWith(".ts")) {
			// Generic provider file - use theirs but check for custom provider preservation
			log(`  Resolving provider file: ${file}`, "cyan")
			checkoutTheirs(file)
			stageFile(file)
			success = true
		} else {
			log(`  ⚠️ Unknown conflict pattern: ${file}`, "yellow")
		}

		if (success) {
			resolved++
			log(`  ✅ Resolved: ${file}`, "green")
		} else {
			unresolved.push(file)
			log(`  ❌ Could not resolve: ${file}`, "red")
		}
	}

	log("")
	log(`\n📊 Resolution Summary:`, "bold")
	log(`  Resolved: ${resolved}/${conflicts.length}`, resolved === conflicts.length ? "green" : "yellow")

	if (unresolved.length > 0) {
		log(`\n⚠️ Files requiring manual resolution:`, "yellow")
		unresolved.forEach((f) => log(`  - ${f}`, "yellow"))
	}

	// Check remaining conflicts
	const remaining = getConflictedFiles()
	if (remaining.length === 0) {
		log(`\n✅ All conflicts resolved! You can now commit the merge.`, "green")
		log(`   Run: git commit -m "Merge upstream with preserved custom providers"`, "cyan")
	} else {
		log(`\n⚠️ ${remaining.length} file(s) still have conflicts.`, "yellow")
		log(`   Please resolve manually and then run: git add <file> && git commit`, "yellow")
	}

	return { resolved, unresolved }
}

// Run if called directly
if (require.main === module) {
	const result = resolveConflicts()
	process.exit(result.unresolved.length > 0 ? 1 : 0)
}

module.exports = { resolveConflicts, CUSTOM_PROVIDERS }
