import { test } from "bun:test";
import Rev from "../src";

// this test is just a basic sanity check
test("can start rev.js webserver", async () => {
	const server = new Rev().listen(8080);

	// this is just objectively poor code
	setTimeout(() => server.close(), 500);
});
