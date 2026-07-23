import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseServiceAccount } from "@/lib/firebaseAdmin";

const CREDENTIALS = {
  project_id: "fixigo-8dc40",
  client_email: "admin@fixigo-8dc40.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
};

function writeTempCredentials(contents: string): string {
  const path = join(mkdtempSync(join(tmpdir(), "fixigo-sa-")), "service-account.json");
  writeFileSync(path, contents);
  return path;
}

describe("parseServiceAccount", () => {
  it("accepts inline JSON", () => {
    expect(parseServiceAccount(JSON.stringify(CREDENTIALS))).toEqual(CREDENTIALS);
  });

  it("accepts a path to a JSON file", () => {
    const path = writeTempCredentials(JSON.stringify(CREDENTIALS));
    expect(parseServiceAccount(path)).toEqual(CREDENTIALS);
  });

  it("restores escaped newlines in the private key", () => {
    const escaped = { ...CREDENTIALS, private_key: "-----BEGIN-----\\nabc\\n-----END-----" };
    expect(parseServiceAccount(JSON.stringify(escaped)).private_key).toBe(
      "-----BEGIN-----\nabc\n-----END-----"
    );
  });

  it("names the missing file rather than reporting bad JSON", () => {
    expect(() => parseServiceAccount("./nope.json")).toThrow(/could not be read/);
  });

  it("rejects a file whose contents are not JSON", () => {
    const path = writeTempCredentials("not json");
    expect(() => parseServiceAccount(path)).toThrow(/not valid JSON/);
  });

  it("rejects credentials missing required fields", () => {
    const { private_key: _omitted, ...partial } = CREDENTIALS;
    expect(() => parseServiceAccount(JSON.stringify(partial))).toThrow(/private_key/);
  });
});
