// kilocode_change - new file
// TypeScript shims for webview-ui package

declare module "qrcode" {
	export interface QRCodeGenerateOptions {
		errorCorrectionLevel?: "L" | "M" | "Q" | "H"
		type?: "image/png" | "image/jpeg" | "image/webp"
		quality?: number
		margin?: number
		color?: {
			dark?: string
			light?: string
		}
		width?: number
	}

	export function toDataURL(text: string, options?: QRCodeGenerateOptions): Promise<string>
	export function toString(text: string, options?: any): Promise<string>
	export function toCanvas(
		canvas: HTMLCanvasElement,
		text: string,
		options?: QRCodeGenerateOptions,
		callback?: (error: Error | null | undefined) => void,
	): Promise<void>
}

declare module "@roo/cloud" {
	// Add minimal exports for cloud module
	export interface OrganizationAllowList {
		allowAll: boolean
		providers: Record<
			string,
			{
				allowAll: boolean
				models?: string[]
			}
		>
	}

	export const api: any
	export default any
}
