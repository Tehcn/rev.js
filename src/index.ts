//#region logging utils
import { Logger, Style } from "@tehcn/log4js";
import { appendFile } from "node:fs/promises";
const DEFAULT_LOGGER = new Logger("main");

const append_to_file = async (path: string, data: string | Uint8Array) => {
	await appendFile(path, data);
};
const format = (...args: any[]) => args.map((arg) => `${arg}`).join(" ");
const color_str = (str: string, style: Style) => `${style.valueOf()}${str}`;
const datestr = () =>
	`${new Date()}`
		.split(" ")
		.filter((_, i) => i < 5)
		.join(" ");
const datestrc = () =>
	`${Style.FOREGROUND_DARK_AQUA}${datestr()}${Style.RESET}`;
const _logf = (path: string, ...args: any[]) => {
	append_to_file(path, format("[main/INFO]", datestr(), ...[...args, "\n"]));
	DEFAULT_LOGGER.log(format(datestrc(), ...args));
};
const _debugf = (path: string, ...args: any[]) => {
	append_to_file(path, format("[main/DEBUG]", datestr(), ...[...args, "\n"]));
	DEFAULT_LOGGER.debug(format(datestrc(), ...args));
};
const _warnf = (path: string, ...args: any[]) => {
	append_to_file(path, format("[main/WARN]", datestr(), ...[...args, "\n"]));
	DEFAULT_LOGGER.warn(format(datestrc(), ...args));
};
const _errorf = (path: string, ...args: any[]) => {
	append_to_file(path, format("[main/ERROR]", datestr(), ...[...args, "\n"]));
	DEFAULT_LOGGER.error(format(datestrc(), ...args));
};
export const log = (...args: any[]) => _logf("revjs.log", ...args);
export const debug = (...args: any[]) => _debugf("revjs.log", ...args);
export const warn = (...args: any[]) => _warnf("revjs.log", ...args);
export const error = (...args: any[]) => _errorf("revjs.log", ...args);

//#endregion

//#region custom ssr

import prettier from "prettier";
import path from "node:path";

const FILENAMES = {
	LAYOUT: "/_layout.html",
	PAGE: "/_page.html",
	SLUG: "/.slug",
	NOT_FOUND: "/404.html",
};

let PAGES_DIR = "/pages";
let COMPONENTS_DIR = "/components/";

const localFetch = async (path: string): Promise<string> =>
	await Bun.file(path).text();

const localExists = async (path: string): Promise<boolean> =>
	await Bun.file(path).exists();

const urlToBasePath = (url: URL): string => {
	if (url.pathname == "/") return PAGES_DIR;
	switch (url.searchParams.get("type")) {
		default:
			return PAGES_DIR + url.pathname;
	}
};

const getComponent = async (name: string): Promise<string> => {
	const component = await localFetch(COMPONENTS_DIR + name + ".html");
	return component;
};

const removeFirst = function (str: string): string {
	return str.slice(1);
};

const removeLast = function (str: string): string {
	return str.slice(0, -1);
};

const removeFirstN = function (str: string, n: number): string {
	return str.slice(n);
};

const removeLastN = function (str: string, n: number): string {
	return str.slice(0, -n);
};

const removeFirstNIf = function (
	str: string,
	n: number,
	predicate: () => boolean,
): string {
	if (predicate()) return str.slice(n);
	else return str.toString();
};

const removeLastNIf = function (
	str: string,
	n: number,
	predicate: () => boolean,
): string {
	if (predicate()) return str.slice(0, -n);
	return str.toString();
};

enum EvalstMode {
	LAYOUT,
	PAGE,
	SCRIPT,
}

interface EvalstElement {
	match: string;
	mode: EvalstMode;
	content: string;
}

interface EvalsElement {
	selector: string;
	evaluation: string;
	content: string;
	isJs: boolean;
}

const evaluate = async (
	str: string,
	initialState?: Record<string, any>,
	outletContent?: string,
): Promise<string> => {
	let processedPageContent = str;
	const evalst: EvalstElement[] = [];
	const regex = /{{ ?(.*?)? ?}}/gims;
	let m;
	let __EVAL_STATE__ = initialState || {};

	while ((m = regex.exec(str)) !== null) {
		if (m.index === regex.lastIndex) {
			regex.lastIndex++;
		}

		const match = m[1];
		let toEval = match.trim();
		if (toEval.startsWith("%") && toEval.endsWith("%")) {
			toEval = removeLast(removeFirst(toEval.trim())).trim();
			if (toEval == "Outlet" && outletContent) {
				evalst.push({
					match: m[0],
					mode: EvalstMode.LAYOUT,
					content: outletContent,
				});
			} else if (toEval == "Outlet" && !outletContent) {
				// str is an error!
				// we place some default 404 content here
				error(`Missing outlet content for ${toEval}`);
				evalst.push({
					match: m[0],
					mode: EvalstMode.LAYOUT,
					content: "404 Not Found (Missing Outlet Content)",
				});
			} else {
				try {
					evalst.push({
						match: m[0],
						mode: EvalstMode.LAYOUT,
						content: await evaluate(await getComponent(toEval)),
					});
				} catch (e) {
					error(`Failed to load component ${toEval}`);
					evalst.push({
						match: m[0],
						mode: EvalstMode.LAYOUT,
						content:
							'<i style="color: red !important">404 Not Found (Missing Component)</i>',
					});
				}
			}
		} else if (toEval.startsWith("<") && toEval.endsWith(">")) {
			toEval = removeLast(removeFirst(toEval.trim()))
				.trim()
				.replaceAll("~", "__EVAL_STATE__");
			evalst.push({
				match: m[0],
				mode: EvalstMode.PAGE,
				content: toEval,
			});
		} else if (toEval.startsWith("/") && toEval.endsWith("/")) {
			// script mode!
			toEval = removeLast(removeFirst(toEval)).replaceAll(
				"~",
				"__EVAL_STATE__",
			);

			const code = `let __EVAL_STATE__=${JSON.stringify(
				__EVAL_STATE__,
			)};${toEval}`;
			const data = await Bun.$`bun -e '${code}'`.json();
			// copy result into __EVAL_STATE__
			Object.assign(__EVAL_STATE__, data);
			evalst.push({
				match: m[0],
				mode: EvalstMode.SCRIPT,
				content: "",
			});
		} else {
			evalst.push({
				match: m[0],
				mode: EvalstMode.PAGE,
				content: toEval,
			});
		}
	}

	const evals: EvalsElement[] = [];

	evalst.forEach(async (element) => {
		if (element.mode == EvalstMode.PAGE) {
			evals.push({
				selector: element.match,
				evaluation: eval(element.content),
				content: element.content,
				isJs: true,
			});
		} else {
			evals.push({
				selector: element.match,
				evaluation: element.content,
				content: element.content,
				isJs: false,
			});
		}
	});

	evals.forEach((element) => {
		processedPageContent = processedPageContent.replace(
			element.selector,
			element.evaluation,
		);
	});

	return processedPageContent;
};

// edited from https://github.com/Tehcn/tehcn.github.io/blob/main/script.js
const loadLayout = async (basePath: string): Promise<string> => {
	const layout = (await localExists(basePath + FILENAMES.LAYOUT))
		? await localFetch(basePath + FILENAMES.LAYOUT)
		: await localFetch(PAGES_DIR + FILENAMES.LAYOUT);

	let pageContent: string;
	let initialState: Record<string, any> = {};

	if (await localExists(basePath + FILENAMES.PAGE)) {
		pageContent = await localFetch(basePath + FILENAMES.PAGE);
	} else if (await localExists(path.join(basePath, "../") + FILENAMES.SLUG)) {
		const slug = await localFetch(
			path.join(basePath, "../", FILENAMES.SLUG),
		);
		let slugName = removeLast(removeFirst(slug));
		initialState[slugName] = path.basename(basePath);
		pageContent = await localFetch(
			path.join(basePath, "../", slug, FILENAMES.PAGE),
		);
	} else {
		pageContent = await localFetch(PAGES_DIR + FILENAMES.NOT_FOUND);
	}

	const processedPageContent = await evaluate(pageContent, initialState);
	const processedLayout = await evaluate(
		layout,
		initialState,
		processedPageContent,
	);

	return processedLayout;
};

const loadPage = async (request: Request): Promise<string> => {
	const url = new URL(request.url);
	log(`Loading ${url.pathname}`);

	const basePath = urlToBasePath(url);
	let page = await loadLayout(basePath);

	// prettify for devtools
	page = await prettier.format(page, { parser: "html" });

	return page;
};

//#endregion

//#region server

import Elysia from "elysia";

interface RevConfig {
	port?: number;
	showDebug?: boolean;
	rootDir: string;
}

class Rev {
	constructor(
		config: RevConfig = {
			port: 3000,
			showDebug: true,
			rootDir: "./",
		},
	) {
		PAGES_DIR = config.rootDir + PAGES_DIR;
		COMPONENTS_DIR = config.rootDir + COMPONENTS_DIR;

		log(`Starting web app at http://localhost:${config.port}`);
		if (config.showDebug)
			debug(
				`PAGES_DIR = ${PAGES_DIR}\nCOMPONENTS_DIR = ${COMPONENTS_DIR}`,
			);
		new Elysia()
			.get("*", async ({ request }) => {
				try {
					// custom ssr anyone?
					return new Response(await loadPage(request), {
						status: 200,
						headers: {
							"Content-Type": "text/html",
						},
					});
				} catch (err) {
					error(
						`Error on GET ${new URL(request.url).pathname}: ${err}`,
					);
					if (config.showDebug) debug();
					return "Internal Server Error";
				}
			})
			.get("/public/*", async ({ request }) =>
				Bun.file(config.rootDir + new URL(request.url).pathname),
			)
			.get("/favicon.ico", async () => {
				try {
					return Bun.file(config.rootDir + "/public/favicon.ico");
				} catch (err) {
					if (config.showDebug)
						debug(
							"You might want a favicon.ico (/public/favicon.ico_",
						);
					return "not found";
				}
			})
			.get("/robots.txt", async () => {
				try {
					return Bun.file(config.rootDir + "/public/robots.txt");
				} catch (err) {
					if (config.showDebug)
						debug(
							"You might want a robots.txt (/public/robots.txt)",
						);
					return "not found";
				}
			})
			.listen(config.port || 3000);
	}
}

export default Rev;

//#endregion
