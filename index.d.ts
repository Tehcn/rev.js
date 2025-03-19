import Elysia from "elysia";

declare const log: (...args: any[]) => void;
declare const debug: (...args: any[]) => void;
declare const warn: (...args: any[]) => void;
declare const error: (...args: any[]) => void;

declare interface RevConfig {
	port?: number;
	showDebug?: boolean;
	rootDir: string;
	elysia?: (app: Elysia) => Elysia;
}

declare class Rev {
	constructor(config: RevConfig);
}
