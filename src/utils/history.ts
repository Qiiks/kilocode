import * as vscode from "vscode"
import * as fs from "fs/promises"
import * as path from "path"
import { HistoryItem } from "../../packages/types/src/history"
import { getStorageDirectoryPath } from "./storage"
import { safeWriteJson } from "./safeWriteJson"
import { fileExistsAtPath } from "./fs"

/**
 * Provides history-related services for tasks.
 */
export class HistoryService {
	private static instance: HistoryService | null = null
	private context: vscode.ExtensionContext

	/**
	 * Constructs a new HistoryService.
	 */
	private constructor(context: vscode.ExtensionContext) {
		// kilocode_change
		this.context = context
	}

	/**
	 * Gets or creates the singleton instance of HistoryService.
	 */
	public static getInstance(context: vscode.ExtensionContext): HistoryService {
		// kilocode_change
		if (!HistoryService.instance) {
			HistoryService.instance = new HistoryService(context)
		}
		return HistoryService.instance
	}

	/**
	 * Gets the path to the history file.
	 */
	private async getHistoryFilePath(): Promise<string> {
		// kilocode_change
		const historyDir = await getStorageDirectoryPath(this.context, "history")
		return path.join(historyDir, "task_history.json")
	}

	/**
	 * Reads the task history from file storage.
	 * @param {number} limit - Optional limit on the number of items to return (defaults to all)
	 * @returns {Promise<HistoryItem[]>} The task history array.
	 */
	async getHistory(limit?: number): Promise<HistoryItem[]> {
		// kilocode_change
		try {
			const historyFilePath = await this.getHistoryFilePath()
			const exists = await fileExistsAtPath(historyFilePath)

			if (!exists) {
				return []
			}

			const fileContent = await fs.readFile(historyFilePath, "utf8")
			const history = JSON.parse(fileContent)

			// Ensure we return an array
			const historyArray = Array.isArray(history) ? history : []

			// Apply limit if specified (return most recent items)
			if (limit && limit > 0) {
				return historyArray.sort((a: HistoryItem, b: HistoryItem) => (b.ts || 0) - (a.ts || 0)).slice(0, limit)
			}

			return historyArray
		} catch (error) {
			console.error("Error reading task history:", error)
			return []
		}
	}

	/**
	 * Gets recent task history items (limited to prevent memory issues).
	 * @param {number} limit - Maximum number of recent items to return (default: 100)
	 * @returns {Promise<HistoryItem[]>} The recent task history array.
	 */
	async getRecentHistory(limit: number = 100): Promise<HistoryItem[]> {
		// kilocode_change
		return this.getHistory(limit)
	}

	/**
	 * Reads the task history.
	 * @returns {Promise<any[]>} An empty array by default.
	 */
	async readTaskHistory(): Promise<any[]> {
		return this.getHistory()
	}

	/**
	 * Writes the task history to file storage.
	 * @param {HistoryItem[]} history - The history to write.
	 * @returns {Promise<void>}
	 */
	async saveHistory(history: HistoryItem[]): Promise<void> {
		// kilocode_change
		try {
			const historyFilePath = await this.getHistoryFilePath()
			await safeWriteJson(historyFilePath, history)
		} catch (error) {
			console.error("Error saving task history:", error)
			throw error
		}
	}

	/**
	 * Sets the task history (alias for saveHistory).
	 * @param {HistoryItem[]} history - The history to set.
	 * @returns {Promise<void>}
	 */
	async setHistory(history: HistoryItem[]): Promise<void> {
		// kilocode_change
		await this.saveHistory(history)
	}

	/**
	 * Updates (adds or modifies) a single task history item.
	 * @param {HistoryItem} item - The history item to update.
	 * @returns {Promise<void>}
	 */
	async updateTaskHistory(item: HistoryItem): Promise<void> {
		// kilocode_change
		try {
			const history = await this.getHistory()
			const existingIndex = history.findIndex((h) => h.id === item.id)

			if (existingIndex >= 0) {
				// Update existing item
				history[existingIndex] = item
			} else {
				// Add new item
				history.push(item)
			}

			await this.saveHistory(history)
		} catch (error) {
			console.error("Error updating task history:", error)
			throw error
		}
	}

	/**
	 * Writes the task history.
	 * @param {any[]} history - The history to write.
	 * @returns {Promise<void>}
	 */
	async writeTaskHistory(history: any[]): Promise<void> {
		await this.saveHistory(history)
	}
}

/**
 * Reads the task history.
 * @returns {Promise<any[]>} An empty array by default.
 */
export async function readTaskHistory(): Promise<any[]> {
	return []
}

/**
 * Writes the task history.
 * @param {any[]} history - The history to write.
 * @returns {Promise<void>}
 */
export async function writeTaskHistory(history: any[]): Promise<void> {
	// kilocode_change - updated signature
	// No-op - this function is deprecated, use HistoryService instead
}
