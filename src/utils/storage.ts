import * as fs from "fs/promises"
import * as path from "path"
import * as vscode from "vscode"

export async function getStorageDirectoryPath(context: vscode.ExtensionContext, subfolder: string): Promise<string> {
	const storagePath = path.join(context.globalStorageUri.fsPath, subfolder)
	await fs.mkdir(storagePath, { recursive: true })
	return storagePath
}

export async function getTaskDirectoryPath(context: vscode.ExtensionContext, taskId: string): Promise<string> {
	const taskDirPath = path.join(context.globalStorageUri.fsPath, "tasks", taskId)
	await fs.mkdir(taskDirPath, { recursive: true })
	return taskDirPath
}
