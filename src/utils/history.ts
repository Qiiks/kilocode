/**
 * Provides history-related services for tasks.
 */
export class HistoryService {
	/**
	 * Constructs a new HistoryService.
	 */
	constructor() {}

	/**
	 * Reads the task history.
	 * @returns {Promise<any[]>} An empty array by default.
	 */
	async readTaskHistory(): Promise<any[]> {
		return []
	}

	/**
	 * Writes the task history.
	 * @param {any[]} history - The history to write.
	 * @returns {Promise<void>}
	 */
	async writeTaskHistory(history: any[]): Promise<void> {
		// No-op
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
	// No-op
}
