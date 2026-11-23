import { describe, expect, it } from "vitest";

import { safeNextPath } from "./next-path";

describe("the next parameter after signing in", () => {
	it.each([
		[null, "/admin"],
		[undefined, "/admin"],
		["", "/admin"],
		["/admin/productos", "/admin/productos"],
		["/admin/productos?estado=nuevo", "/admin/productos?estado=nuevo"],
		["/admin?x=1#y", "/admin?x=1#y"],
		["//evil.example/admin", "/admin"],
		["/\\evil.example/admin", "/admin"],
		["https://evil.example/admin", "/admin"],
		["admin", "/admin"],
		["javascript:alert(1)", "/admin"],
	])("%s resolves to %s", (value, expected) => {
		expect(safeNextPath(value)).toBe(expected);
	});
});
