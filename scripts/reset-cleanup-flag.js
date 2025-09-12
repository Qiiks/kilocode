#!/usr/bin/env node
// kilocode_change - new file

/**
 * Script to reset the legacy cleanup flag to force re-running migration.
 * This is useful for testing the enhanced cleanup logic.
 *
 * To use this script:
 * 1. Close VS Code completely
 * 2. Run: node scripts/reset-cleanup-flag.js
 * 3. Open VS Code and check the output console
 */

const fs = require("fs")
const path = require("path")
const os = require("os")

function findVSCodeUserData() {
	const platform = os.platform()
	let userDataPath

	switch (platform) {
		case "win32":
			userDataPath = path.join(os.homedir(), "AppData", "Roaming", "Code", "User")
			break
		case "darwin":
			userDataPath = path.join(os.homedir(), "Library", "Application Support", "Code", "User")
			break
		case "linux":
			userDataPath = path.join(os.homedir(), ".config", "Code", "User")
			break
		default:
			throw new Error(`Unsupported platform: ${platform}`)
	}

	return userDataPath
}

function findExtensionGlobalState() {
	const userDataPath = findVSCodeUserData()
	const globalStoragePath = path.join(userDataPath, "globalStorage")

	if (!fs.existsSync(globalStoragePath)) {
		throw new Error(`Global storage path not found: ${globalStoragePath}`)
	}

	const extensionStatePath = path.join(globalStoragePath, "kilocode.kilo-code")

	if (!fs.existsSync(extensionStatePath)) {
		console.log(`Extension state path not found: ${extensionStatePath}`)
		return null
	}

	return extensionStatePath
}

function resetCleanupFlag() {
	try {
		const extensionStatePath = findExtensionGlobalState()

		if (!extensionStatePath) {
			console.log("Extension state not found. Migration will run automatically on first use.")
			return
		}

		const stateJsonPath = path.join(extensionStatePath, "state.vscdb")

		if (!fs.existsSync(stateJsonPath)) {
			console.log("Extension state database not found. Migration will run automatically on first use.")
			return
		}

		console.log(`Found extension state at: ${stateJsonPath}`)
		console.log("WARNING: This script cannot safely modify VS Code's binary state database.")
		console.log("To reset the cleanup flag:")
		console.log("1. Open VS Code")
		console.log("2. Open the Command Palette (Ctrl+Shift+P)")
		console.log('3. Run "Developer: Reload Window"')
		console.log("4. Check the output console for migration logs")
	} catch (error) {
		console.error("Error:", error.message)
		process.exit(1)
	}
}

if (require.main === module) {
	resetCleanupFlag()
}

module.exports = { resetCleanupFlag }
