import test from "node:test";
import assert from "node:assert/strict";
import { checkTester, testersCsv } from "../server/testers.mjs";

test("a complete request is accepted and tidied", () => {
  const result = checkTester({ firstName: "  Ana ", lastName: "Rivera", email: "Ana.Rivera@Example.com " });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { firstName: "Ana", lastName: "Rivera", email: "ana.rivera@example.com" });
});

test("missing or malformed fields are refused with a reason", () => {
  assert.equal(checkTester({ firstName: "", lastName: "Rivera", email: "a@b.co" }).error, "first name");
  assert.equal(checkTester({ firstName: "Ana", lastName: "", email: "a@b.co" }).error, "last name");
  assert.equal(checkTester({ firstName: "Ana", lastName: "Rivera", email: "not-an-email" }).error, "email");
  assert.equal(checkTester({ firstName: "x".repeat(61), lastName: "Rivera", email: "a@b.co" }).error, "first name");
});

test("the hidden field catches bots without telling them", () => {
  const result = checkTester({ firstName: "Ana", lastName: "Rivera", email: "a@b.co", website: "http://spam" });
  assert.equal(result.ok, false);
  assert.equal(result.bot, true);
});

test("the export is a CSV that a spreadsheet will not run as a formula", () => {
  const csv = testersCsv([
    { at: "2026-10-07T12:00:00Z", firstName: "Ana", lastName: "Rivera", email: "a@b.co" },
    { at: "2026-10-07T12:01:00Z", firstName: "=HYPERLINK(\"x\")", lastName: "O\"Neil", email: "c@d.co" },
  ]);
  const lines = csv.trim().split("\n");
  assert.equal(lines[0], "requested_at,first_name,last_name,email");
  assert.equal(lines[1], "2026-10-07T12:00:00Z,Ana,Rivera,a@b.co");
  assert.equal(lines[2], "2026-10-07T12:01:00Z,\"'=HYPERLINK(\"\"x\"\")\",\"O\"\"Neil\",c@d.co");
});
