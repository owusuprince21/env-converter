export type Language = "dotnet" | "python" | "java" | "node" | "php";
export type PresetId = "auto" | "custom" | Language;
export type ArrayMode = "index" | "json";
export type OutputFormat = "env" | "configmap" | "secret";
export type Separator = "__" | "_" | "." | ":";

export interface ShapeOptions {
  separator: Separator;
  uppercase: boolean;
  strict: boolean;
  removeDashes: boolean;
  arrays: ArrayMode;
  quote: boolean;
}

export interface OutputOptions {
  format: OutputFormat;
  prefix: string;
  skipNull: boolean;
  sort: boolean;
  resourceName: string;
  namespace: string;
}

export type FlatPair = readonly [key: string, value: string];