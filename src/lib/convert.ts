import { stripJsonc } from "./jsonc";
import type { FlatPair, OutputOptions, ShapeOptions } from "./types";

export const MAX_DEPTH = 64;

export type ParseResult = { ok: true; data: object } | { ok: false; error: string };

export function parseConfig(text: string): ParseResult {
  try {
    const data: unknown = JSON.parse(stripJsonc(text));
    if (data === null || typeof data !== "object") {
      return { ok: false, error: "Top level JSON must be an object or array." };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${e instanceof Error ? e.message : "unknown error"}` };
  }
}

export function flatten(root: object, separator: string, skipNull: boolean, jsonArrays: boolean): FlatPair[] {
  const result: FlatPair[] = [];

  const walk = (value: unknown, path: string, depth: number): void => {
    if (depth > MAX_DEPTH) {
      throw new Error(`Nesting deeper than ${MAX_DEPTH} levels is not supported.`);
    }
    if (jsonArrays && Array.isArray(value) && path) {
      result.push([path, JSON.stringify(value)]);
      return;
    }
    if (value !== null && typeof value === "object") {
      const entries: [string, unknown][] = Array.isArray(value)
        ? value.map((x: unknown, i): [string, unknown] => [String(i), x])
        : Object.entries(value);
      if (entries.length === 0 && path) result.push([path, ""]);
      for (const [k, x] of entries) walk(x, path ? path + separator + k : k, depth + 1);
      return;
    }
    if (value === null) {
      if (!skipNull) result.push([path, ""]);
      return;
    }
    result.push([path, String(value)]);
  };

  walk(root, "", 0);
  return result;
}

const sanitizeKey = (k: string): string => k.replace(/[^A-Za-z0-9_.:-]/g, "_");
const strictKey = (k: string): string => k.replace(/[^A-Za-z0-9_]/g, "_");

const envQuote = (v: string): string =>
  '"' + v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r\n|\r|\n/g, "\\n") + '"';

const yamlString = (v: string): string => JSON.stringify(v); // double quoted JSON strings are valid YAML

function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const K8S_KEY = /^[-._a-zA-Z0-9]+$/;
const DNS_SUBDOMAIN = /^[a-z0-9]([-a-z0-9.]*[a-z0-9])?$/;
const DNS_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

export type BuildResult =
  | { ok: true; text: string; count: number; merged: boolean; warnings: string[] }
  | { ok: false; error: string };

export function buildOutput(data: object, shape: ShapeOptions, opts: OutputOptions): BuildResult {
  try {
    const flat = flatten(data, shape.separator, opts.skipNull, shape.arrays === "json");

    let pairs = flat.map(([k, v]): FlatPair => {
      const base = shape.removeDashes ? k.replace(/-/g, "") : k;
      const raw = opts.prefix + base;
      let key = shape.strict ? strictKey(raw) : sanitizeKey(raw);
      if (shape.uppercase) key = key.toUpperCase();
      return [key, v];
    });

    if (opts.sort) pairs = [...pairs].sort((a, b) => a[0].localeCompare(b[0]));
    // Later duplicates win; first insertion position is kept.
    pairs = [...new Map<string, string>(pairs)];

    const warnings: string[] = [];
    let text: string;

    if (opts.format === "env") {
      text =
        pairs
          .map(([k, v]) => `${k}=${shape.quote ? envQuote(v) : v.replace(/\r\n|\r|\n/g, "\\n")}`)
          .join("\n") + "\n";
    } else {
      const kind = opts.format === "secret" ? "Secret" : "ConfigMap";
      const name = opts.resourceName.trim() || "app-config";
      const ns = opts.namespace.trim();

      if (name.length > 253 || !DNS_SUBDOMAIN.test(name)) {
        warnings.push("Resource name must be lowercase letters, digits, dashes or dots (max 253 characters).");
      }
      if (ns && (ns.length > 63 || !DNS_LABEL.test(ns))) {
        warnings.push("Namespace must be lowercase letters, digits or dashes (max 63 characters).");
      }
      const badKeys = pairs.map(([k]) => k).filter((k) => !K8S_KEY.test(k) || k.length > 253);
      if (badKeys.length) {
        warnings.push(
          `Kubernetes rejects ${badKeys.length} key(s), for example "${badKeys[0]}". Use a separator other than ":" and enable strict names.`,
        );
      }

      const header = `apiVersion: v1\nkind: ${kind}\nmetadata:\n  name: ${yamlString(name)}\n`;
      const nsLine = ns ? `  namespace: ${yamlString(ns)}\n` : "";
      const body = pairs.length
        ? pairs
            .map(([k, v]) => `  ${yamlString(k)}: ${yamlString(opts.format === "secret" ? toBase64(v) : v)}`)
            .join("\n")
        : "  {}";
      text = `${header}${nsLine}data:\n${body}\n`;
    }

    return { ok: true, text, count: pairs.length, merged: pairs.length < flat.length, warnings };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Conversion failed." };
  }
}