// actually just a basic rev.js app

import Rev from "../../src";

new Rev({
	port: 8080,
	showDebug: true,
	rootDir: __dirname,
});
