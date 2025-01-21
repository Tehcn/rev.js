declare const log: (...args: any[]) => void;
declare const debug: (...args: any[]) => void;
declare const warn: (...args: any[]) => void;
declare const error: (...args: any[]) => void;

declare interface RevConfig {
	port?: number;
	showDebug?: boolean;
	rootDir: string;
}

declare class Rev {
	constructor(config: RevConfig);
}
