import { MAX_DEPTH } from "./convert";
import type { Language, ShapeOptions } from "./types";

export const PRESETS: Record<Language, ShapeOptions> = {
  dotnet: { separator: "__", uppercase: false, strict: false, removeDashes: false, arrays: "index", quote: false },
  python: { separator: "__", uppercase: true, strict: true, removeDashes: false, arrays: "json", quote: false },
  java: { separator: "_", uppercase: true, strict: true, removeDashes: true, arrays: "index", quote: false },
  node: { separator: "_", uppercase: true, strict: true, removeDashes: false, arrays: "json", quote: false },
  php: { separator: "_", uppercase: true, strict: true, removeDashes: false, arrays: "json", quote: true },
};

export const LANG_NAMES: Record<Language, string> = {
  dotnet: ".NET",
  python: "Python",
  java: "Java (Spring Boot)",
  node: "Node.js",
  php: "PHP",
};

export const PRESET_HINTS: Record<Language, string> = {
  dotnet: "ASP.NET Core reads Section__Key as Section:Key.",
  python: 'pydantic-settings: set env_nested_delimiter="__". Lists and dicts are parsed from JSON strings.',
  java: "Spring Boot relaxed binding: dots become underscores, dashes are removed, names are uppercase. Lists use NAME_0.",
  node: "Plain dotenv style names, read with process.env.SECTION_KEY. Arrays are JSON strings, so parse them with JSON.parse.",
  php: "Laravel env() and Symfony dotenv style. Quoted values are valid dotenv. Arrays are JSON strings.",
};

export interface Detection {
  language: Language;
  note: string;
}

export function detectLanguage(data: object, fileName: string | null): Detection {
  const score: Record<Language, number> = { dotnet: 0, python: 0, java: 0, node: 0, php: 0 };
  const why: Record<Language, string[]> = { dotnet: [], python: [], java: [], node: [], php: [] };
  const add = (lang: Language, points: number, reason: string): void => {
    score[lang] += points;
    why[lang].push(reason);
  };

  const name = (fileName ?? "").toLowerCase();
  if (/^appsettings(\..+)?\.json$/.test(name)) add("dotnet", 10, `file name ${fileName}`);
  if (/^(application|bootstrap)(-.+)?\.json$/.test(name)) add("java", 8, `file name ${fileName}`);
  if (name === "package.json") add("node", 10, "file name package.json");
  if (name === "composer.json") add("php", 10, "file name composer.json");
  if (/^(pyproject|pipfile|settings)\.json$/.test(name)) add("python", 3, `file name ${fileName}`);

  const keys = new Set<string>();
  const collect = (v: unknown, depth: number): void => {
    if (depth > MAX_DEPTH || v === null || typeof v !== "object") return;
    for (const [k, x] of Object.entries(v)) {
      keys.add(k.toLowerCase());
      collect(x, depth + 1);
    }
  };
  collect(data, 0);

  const top = new Set<string>(Array.isArray(data) ? [] : Object.keys(data).map((k) => k.toLowerCase()));
  const has = (...ks: string[]): string[] => ks.filter((k) => keys.has(k));
  const topHas = (...ks: string[]): string[] => ks.filter((k) => top.has(k));

  let m = has("connectionstrings", "allowedhosts", "kestrel", "loglevel", "serilog", "applicationinsights", "jwtsettings");
  if (m.length) add("dotnet", 4 * m.length, `keys ${m.join(", ")}`);
  if (top.has("logging") && keys.has("loglevel")) add("dotnet", 3, "Logging/LogLevel");

  m = topHas("spring", "management", "eureka", "server");
  if (m.length && (top.has("spring") || keys.has("port") || keys.has("datasource"))) {
    add("java", 4 * m.length, `keys ${m.join(", ")}`);
  }
  m = has("datasource", "hibernate", "jpa", "actuator", "profiles", "bootstrap");
  if (m.length) add("java", 3 * m.length, `keys ${m.join(", ")}`);

  m = topHas("scripts", "dependencies", "devdependencies", "main", "engines", "nodemon", "mongouri", "node_env");
  if (m.length) add("node", 4 * m.length, `keys ${m.join(", ")}`);
  if (keys.has("node_env") || keys.has("jwt_secret") || keys.has("mongodb_uri")) add("node", 3, "node style env keys");

  m = topHas("require", "autoload", "require-dev", "laravel");
  if (m.length) add("php", 4 * m.length, `keys ${m.join(", ")}`);
  m = has("app_url", "app_key", "db_connection", "laravel", "symfony", "doctrine");
  if (m.length) add("php", 4 * m.length, `keys ${m.join(", ")}`);

  m = has("databases", "installed_apps", "secret_key", "django", "sqlalchemy", "pydantic", "celery", "allowed_hosts", "debug");
  if (m.length) add("python", 3 * m.length, `keys ${m.join(", ")}`);
  if (keys.has("allowed_hosts") && !keys.has("allowedhosts")) add("python", 2, "ALLOWED_HOSTS style");

  const ranked = (Object.entries(score) as [Language, number][]).sort((a, b) => b[1] - a[1]);
  const [best, bestScore] = ranked[0];
  if (bestScore < 3 || ranked[1][1] === bestScore) {
    return { language: "dotnet", note: "no clear signal, defaulted to .NET" };
  }
  return { language: best, note: why[best].join("; ") };
}