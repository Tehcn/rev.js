// actually just a basic rev.js app

import Rev from "../..";

new Rev({
	port: 8080,
	showDebug: true,
	rootDir: __dirname,
});
