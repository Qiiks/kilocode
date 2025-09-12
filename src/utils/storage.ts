import * as fs from "fs/promises"
import * as path from "path"
import * as vscode from "vscode"
import os from "os"

export async function getStorageDirectoryPath(context: vscode.ExtensionContext, subfolder: string): Promise<string> {
	const storagePath = path.join(context.globalStorageUri.fsPath, subfolder)
	await fs.mkdir(storagePath, { recursive: true })
	return storagePath
}

// Returns a correct cache file path using globalStorageUri
export function getModelProviderCachePath(
	context: vscode.ExtensionContext,
	filename: string = "openrouter_endpoints.json",
): string {
	const cacheDir = context.globalStorageUri.fsPath
	return path.join(cacheDir, filename)
}

export async function getTaskDirectoryPath(context: vscode.ExtensionContext, taskId: string): Promise<string>
export async function getTaskDirectoryPath(globalStoragePath: string, taskId: string): Promise<string>
export async function getTaskDirectoryPath(
	contextOrPath: vscode.ExtensionContext | string,
	taskId: string,
): Promise<string> {
	let storagePath: string
	if (typeof contextOrPath === "string") {
		// Called with globalStoragePath string
		storagePath = contextOrPath
	} else {
		// Called with ExtensionContext
		storagePath = contextOrPath.globalStorageUri.fsPath
	}
	const taskDirPath = path.join(storagePath, "tasks", taskId)
	await fs.mkdir(taskDirPath, { recursive: true })
	return taskDirPath
} // kilocode_change

/**
 * Returns a sensible cache directory path for the given name.
 * Default is ".cache/kilocode" in the user's home directory.
 */
export function getCacheDirectoryPath(name: string = "kilocode"): string {
	return path.join(os.homedir(), ".cache", name)
}
