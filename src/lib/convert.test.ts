import { describe, expect, it } from "vitest";
import { buildOutput, parseConfig } from "./convert";
import { PRESETS } from "./presets";
import type { OutputOptions } from "./types";

const output: OutputOptions = {
  format: "env",
  prefix: "",
  skipNull: true,
  sort: false,
  resourceName: "app-config",
  namespace: "",
};

function run(json: string, format: OutputOptions["format"] = "env") {
  const parsed = parseConfig(json);
  if (!parsed.ok) throw new Error(parsed.error);
  const result = buildOutput(parsed.data, PRESETS.dotnet, { ...output, format });
  if (!result.ok) throw new Error(result.error);
  return result;
}

describe("convert", () => {
  it("flattens nested objects and indexed arrays", () => {
    const r = run('{"A":{"B":"1","C":["x","y"]}}');
    expect(r.text).toBe("A__B=1\nA__C__0=x\nA__C__1=y\n");
  });

  it("accepts comments and trailing commas", () => {
    expect(run('{ // note\n "A": 1, }').text).toBe("A=1\n");
  });

  it("base64 encodes secrets", () => {
    expect(run('{"A":"hi"}', "secret").text).toContain('"A": "aGk="');
  });

  it("warns about colon keys in Kubernetes output", () => {
    const parsed = parseConfig('{"A":{"B":"1"}}');
    if (!parsed.ok) throw new Error(parsed.error);
    const r = buildOutput(parsed.data, { ...PRESETS.dotnet, separator: ":" }, { ...output, format: "configmap" });
    expect(r.ok && r.warnings.length).toBe(1);
  });
});