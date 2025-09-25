// kilocode_change - provide minimal shims for third-party modules
declare module "shiki" {
	export function getSingletonHighlighter(opts?: any): Promise<any>
	export type Highlighter = any
	export type ThemedToken = any
	export type BundledLanguage = string | "typescript" | "javascript" | string
}

declare module "json5" {
	const JSON5: {
		parse(text: string): any
		stringify(value: any): string
	}
	export default JSON5
}

declare module "nock" {
	export function back(path?: string): Promise<{ nockDone: () => void }>
	export namespace back {
		let fixtures: string
		function setMode(mode: string): void
	}

	const nock: any
	export = nock
}
