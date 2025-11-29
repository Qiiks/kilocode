import { z } from "zod"

import {
	type RooCodeSettings,
	type ProviderSettings,
	type PromptComponent,
	type ModeConfig,
	type InstallMarketplaceItemOptions,
	type MarketplaceItem,
	type ShareVisibility,
	type QueuedMessage,
	marketplaceItemSchema,
} from "@roo-code/types"

import { Mode } from "./modes"

export type ClineAskResponse =
	| "yesButtonClicked"
	| "noButtonClicked"
	| "messageResponse"
	| "objectResponse"
	| "retry_clicked" // kilocode_change

export type PromptMode = Mode | "enhance"

export type AudioType = "notification" | "celebration" | "progress_loop"

export interface UpdateTodoListPayload {
	todos: any[]
}

export type EditQueuedMessagePayload = Pick<QueuedMessage, "id" | "text" | "images">

// kilocode_change start: add kilocode-specific payload types
export interface TaskHistoryRequestPayload {
	requestId?: string
	page?: number
	pageSize?: number
	pageIndex?: number
	searchQuery?: string
	workspace?: string
	favoritesOnly?: boolean
	search?: string
	sort?: string
}

export interface TaskHistoryResponsePayload {
	requestId?: string
	tasks?: any[]
	historyItems?: any[]
	totalCount?: number
	page?: number
	pageSize?: number
	pageIndex?: number
	pageCount?: number
}

export interface TasksByIdRequestPayload {
	requestId: string
	taskIds: string[]
}

export interface TasksByIdResponsePayload {
	requestId?: string
	tasks: any[]
}

export interface ProfileDataResponsePayload {
	success?: boolean
	data?: ProfileData
	profile?: ProfileData | null
	organizations?: UserOrganizationWithApiKey[]
	error?: string
}

export interface ProfileData {
	id: string
	email: string
	name?: string
	avatar?: string
	user?: any
	organizations?: UserOrganizationWithApiKey[]
	kilocodeToken?: string
}

export interface UserOrganizationWithApiKey {
	id: string
	name: string
	apiKey?: string
	role?: string
}

export interface BalanceDataResponsePayload {
	success?: boolean
	data?: number
	balance?: number
	currency?: string
	error?: string
}

export type GlobalStateValue = string | number | boolean | object | null | undefined

// MaybeTypedWebviewMessage is used in webviewMessageHandler for kilocode extensions
// It allows for additional message types that aren't strictly typed in WebviewMessage
export type MaybeTypedWebviewMessage = WebviewMessage
// kilocode_change end

export interface WebviewMessage {
	type:
		| "updateTodoList"
		| "deleteMultipleTasksWithIds"
		| "currentApiConfigName"
		| "saveApiConfiguration"
		| "upsertApiConfiguration"
		| "deleteApiConfiguration"
		| "loadApiConfiguration"
		| "loadApiConfigurationById"
		| "renameApiConfiguration"
		| "getListApiConfiguration"
		| "customInstructions"
		| "webviewDidLaunch"
		| "newTask"
		| "askResponse"
		| "terminalOperation"
		| "clearTask"
		| "didShowAnnouncement"
		| "selectImages"
		| "exportCurrentTask"
		| "shareCurrentTask"
		| "showTaskWithId"
		| "deleteTaskWithId"
		| "exportTaskWithId"
		| "importSettings"
		| "exportSettings"
		| "resetState"
		| "flushRouterModels"
		| "requestRouterModels"
		| "requestOpenAiModels"
		| "requestOllamaModels"
		| "requestLmStudioModels"
		| "requestRooModels"
		| "requestRooCreditBalance"
		| "requestVsCodeLmModels"
		| "requestHuggingFaceModels"
		| "openImage"
		| "saveImage"
		| "openFile"
		| "openMention"
		| "cancelTask"
		| "updateVSCodeSetting"
		| "getVSCodeSetting"
		| "vsCodeSetting"
		| "updateCondensingPrompt"
		| "playSound"
		| "playTts"
		| "stopTts"
		| "ttsEnabled"
		| "ttsSpeed"
		| "openKeyboardShortcuts"
		| "openMcpSettings"
		| "openProjectMcpSettings"
		| "restartMcpServer"
		| "refreshAllMcpServers"
		| "toggleToolAlwaysAllow"
		| "toggleToolEnabledForPrompt"
		| "toggleMcpServer"
		| "updateMcpTimeout"
		| "enhancePrompt"
		| "enhancedPrompt"
		| "draggedImages"
		| "deleteMessage"
		| "deleteMessageConfirm"
		| "submitEditedMessage"
		| "editMessageConfirm"
		| "enableMcpServerCreation"
		| "remoteControlEnabled"
		| "taskSyncEnabled"
		| "searchCommits"
		| "setApiConfigPassword"
		| "mode"
		| "updatePrompt"
		| "getSystemPrompt"
		| "copySystemPrompt"
		| "systemPrompt"
		| "enhancementApiConfigId"
		| "autoApprovalEnabled"
		| "updateCustomMode"
		| "deleteCustomMode"
		| "setopenAiCustomModelInfo"
		| "openCustomModesSettings"
		| "checkpointDiff"
		| "checkpointRestore"
		| "deleteMcpServer"
		| "humanRelayResponse"
		| "humanRelayCancel"
		| "codebaseIndexEnabled"
		| "telemetrySetting"
		| "testBrowserConnection"
		| "browserConnectionResult"
		| "searchFiles"
		| "toggleApiConfigPin"
		| "hasOpenedModeSelector"
		| "cloudButtonClicked"
		| "rooCloudSignIn"
		| "cloudLandingPageSignIn"
		| "rooCloudSignOut"
		| "rooCloudManualUrl"
		| "switchOrganization"
		| "condenseTaskContextRequest"
		| "requestIndexingStatus"
		| "startIndexing"
		| "clearIndexData"
		| "indexingStatusUpdate"
		| "indexCleared"
		| "focusPanelRequest"
		| "openExternal"
		| "filterMarketplaceItems"
		| "marketplaceButtonClicked"
		| "installMarketplaceItem"
		| "installMarketplaceItemWithParameters"
		| "cancelMarketplaceInstall"
		| "removeInstalledMarketplaceItem"
		| "marketplaceInstallResult"
		| "fetchMarketplaceData"
		| "switchTab"
		| "shareTaskSuccess"
		| "exportMode"
		| "exportModeResult"
		| "importMode"
		| "importModeResult"
		| "checkRulesDirectory"
		| "checkRulesDirectoryResult"
		| "saveCodeIndexSettingsAtomic"
		| "requestCodeIndexSecretStatus"
		| "requestCommands"
		| "openCommandFile"
		| "deleteCommand"
		| "createCommand"
		| "insertTextIntoTextarea"
		| "showMdmAuthRequiredNotification"
		| "imageGenerationSettings"
		| "queueMessage"
		| "removeQueuedMessage"
		| "editQueuedMessage"
		| "dismissUpsell"
		| "getDismissedUpsells"
		| "updateSettings"
		| "allowedCommands"
		| "deniedCommands"
		| "killBrowserSession"
		| "openBrowserSessionPanel"
		| "showBrowserSessionPanelAtStep"
		| "refreshBrowserSessionPanel"
		| "browserPanelDidLaunch"
		| "openDebugApiHistory"
		| "openDebugUiHistory"
		// kilocode_change start: add kilocode-specific message types
		| "condense"
		| "requestSapAiCoreModels"
		| "requestSapAiCoreDeployments"
		| "seeNewChanges"
		| "tasksByIdRequest"
		| "taskHistoryRequest"
		| "requestCheckpointRestoreApproval"
		| "openGlobalKeybindings"
		| "showSystemNotification"
		| "systemNotificationsEnabled"
		| "openInBrowser"
		| "morphApiKey"
		| "fastApplyModel"
		| "fastApplyApiProvider"
		| "kiloCodeImageApiKey"
		| "showAutoApproveMenu"
		| "showTaskTimeline"
		| "sendMessageOnEnter"
		| "showTimestamps"
		| "hideCostBelowThreshold"
		| "allowVeryLargeReads"
		| "setReasoningBlockCollapsed"
		| "setHistoryPreviewCollapsed"
		| "commitMessageApiConfigId"
		| "terminalCommandApiConfigId"
		| "ghostServiceSettings"
		| "yoloGatekeeperApiConfigId"
		| "yoloMode"
		| "showFeedbackOptions"
		| "getProfileConfigurationForEditing"
		| "fetchProfileDataRequest"
		| "fetchBalanceDataRequest"
		| "shopBuyCredits"
		| "fetchMcpMarketplace"
		| "downloadMcp"
		| "silentlyRefreshMcpMarketplace"
		| "toggleWorkflow"
		| "refreshRules"
		| "toggleRule"
		| "requestCopilotModels"
		| "copilotLogin"
		| "copilotLogout"
		| "copilotLoginWithDeviceCode"
		| "authenticateCopilot"
		| "clearCopilotAuth"
		| "checkCopilotAuth"
		| "autoPurgeEnabled"
		| "autoPurgeDefaultRetentionDays"
		| "autoPurgeFavoritedTaskRetentionDays"
		| "autoPurgeCompletedTaskRetentionDays"
		| "autoPurgeIncompleteTaskRetentionDays"
		| "markNotificationDismissed"
		| "generateCommitMessage"
		| "insertCommitMessage"
		| "requestUsageData"
		| "openRulesFile"
		| "openWorkflowFile"
		| "requestMermaidFix"
		| "insertMermaidFix"
		| "requestSingleCompletion"
		| "createRuleFile"
		| "deleteRuleFile"
		| "reportBug"
		| "cancelIndexing"
		| "clearUsageData"
		| "getUsageData"
		| "toggleTaskFavorite"
		| "fixMermaidSyntax"
		| "editMessage"
		| "fetchKilocodeNotifications"
		| "dismissNotificationId"
		| "updateGlobalState"
		| "insertTextToChatArea"
		| "getKeybindings"
		| "manualPurge"
		| "addTaskToHistory"
		| "singleCompletion"
		| "requestManagedIndexerState"
		| "openExtensionSettings"
	// kilocode_change end
	text?: string
	editedMessageContent?: string
	tab?: "settings" | "history" | "mcp" | "modes" | "chat" | "marketplace" | "cloud"
	disabled?: boolean
	context?: string
	dataUri?: string
	askResponse?: ClineAskResponse
	apiConfiguration?: ProviderSettings
	images?: string[]
	bool?: boolean
	value?: number
	stepIndex?: number
	isLaunchAction?: boolean
	forceShow?: boolean
	commands?: string[]
	audioType?: AudioType
	serverName?: string
	toolName?: string
	alwaysAllow?: boolean
	isEnabled?: boolean
	mode?: Mode
	promptMode?: PromptMode
	customPrompt?: PromptComponent
	dataUrls?: string[]
	values?: Record<string, any>
	query?: string
	setting?: string
	slug?: string
	modeConfig?: ModeConfig
	timeout?: number
	payload?: WebViewMessagePayload
	source?: "global" | "project"
	requestId?: string
	ids?: string[]
	hasSystemPromptOverride?: boolean
	terminalOperation?: "continue" | "abort"
	messageTs?: number
	restoreCheckpoint?: boolean
	historyPreviewCollapsed?: boolean
	filters?: { type?: string; search?: string; tags?: string[] }
	settings?: any
	url?: string // For openExternal
	mpItem?: MarketplaceItem
	mpInstallOptions?: InstallMarketplaceItemOptions
	config?: Record<string, any> // Add config to the payload
	visibility?: ShareVisibility // For share visibility
	hasContent?: boolean // For checkRulesDirectoryResult
	checkOnly?: boolean // For deleteCustomMode check
	upsellId?: string // For dismissUpsell
	list?: string[] // For dismissedUpsells response
	organizationId?: string | null // For organization switching
	useProviderSignup?: boolean // For rooCloudSignIn to use provider signup flow
	// kilocode_change start: add kilocode-specific message properties
	notificationOptions?: any // For showSystemNotification
	mcpId?: string // For downloadMcp
	workflowPath?: string // For toggleWorkflow
	enabled?: boolean // For toggleWorkflow, toggleRule
	isGlobal?: boolean // For toggleWorkflow, toggleRule
	rulePath?: string // For toggleRule
	commandIds?: string[] // For getKeybindings
	notificationId?: string // For dismissNotificationId
	stateKey?: string // For updateGlobalState
	stateValue?: GlobalStateValue // For updateGlobalState
	filename?: string // For createRuleFile
	commitRange?: any // For seeNewChanges
	ruleType?: string // For createRuleFile
	completionRequestId?: string // For singleCompletion
	historyItem?: any // For addTaskToHistory
	// kilocode_change end
	codeIndexSettings?: {
		// Global state settings
		codebaseIndexEnabled: boolean
		codebaseIndexQdrantUrl: string
		codebaseIndexEmbedderProvider:
			| "openai"
			| "ollama"
			| "openai-compatible"
			| "gemini"
			| "mistral"
			| "vercel-ai-gateway"
			| "bedrock"
			| "openrouter"
		codebaseIndexEmbedderBaseUrl?: string
		codebaseIndexEmbedderModelId: string
		codebaseIndexEmbedderModelDimension?: number // Generic dimension for all providers
		codebaseIndexOpenAiCompatibleBaseUrl?: string
		codebaseIndexBedrockRegion?: string
		codebaseIndexBedrockProfile?: string
		codebaseIndexSearchMaxResults?: number
		codebaseIndexSearchMinScore?: number

		// Secret settings
		codeIndexOpenAiKey?: string
		codeIndexQdrantApiKey?: string
		codebaseIndexOpenAiCompatibleApiKey?: string
		codebaseIndexGeminiApiKey?: string
		codebaseIndexMistralApiKey?: string
		codebaseIndexVercelAiGatewayApiKey?: string
		codebaseIndexOpenRouterApiKey?: string
	}
	updatedSettings?: RooCodeSettings
}

export const checkoutDiffPayloadSchema = z.object({
	ts: z.number().optional(),
	previousCommitHash: z.string().optional(),
	commitHash: z.string(),
	mode: z.enum(["full", "checkpoint", "from-init", "to-current"]),
})

export type CheckpointDiffPayload = z.infer<typeof checkoutDiffPayloadSchema>

export const checkoutRestorePayloadSchema = z.object({
	ts: z.number(),
	commitHash: z.string(),
	mode: z.enum(["preview", "restore"]),
})

export type CheckpointRestorePayload = z.infer<typeof checkoutRestorePayloadSchema>

export const requestCheckpointRestoreApprovalPayloadSchema = z.object({
	commitHash: z.string(),
	checkpointTs: z.number(),
	messagesToRemove: z.number(),
	confirmationText: z.string().optional(),
})

export type RequestCheckpointRestoreApprovalPayload = z.infer<typeof requestCheckpointRestoreApprovalPayloadSchema>

export interface IndexingStatusPayload {
	state: "Standby" | "Indexing" | "Indexed" | "Error"
	message: string
}

export interface IndexClearedPayload {
	success: boolean
	error?: string
}

export const installMarketplaceItemWithParametersPayloadSchema = z.object({
	item: marketplaceItemSchema,
	parameters: z.record(z.string(), z.any()),
})

export type InstallMarketplaceItemWithParametersPayload = z.infer<
	typeof installMarketplaceItemWithParametersPayloadSchema
>

// kilocode_change start: add SeeNewChangesPayload
export interface SeeNewChangesPayload {
	commitRange?: any
}
// kilocode_change end

export type WebViewMessagePayload =
	| CheckpointDiffPayload
	| CheckpointRestorePayload
	| IndexingStatusPayload
	| IndexClearedPayload
	| InstallMarketplaceItemWithParametersPayload
	| UpdateTodoListPayload
	| EditQueuedMessagePayload
	// kilocode_change start: add kilocode-specific payload types
	| TaskHistoryRequestPayload
	| TasksByIdRequestPayload
	| SeeNewChangesPayload
	| RequestCheckpointRestoreApprovalPayload
// kilocode_change end
