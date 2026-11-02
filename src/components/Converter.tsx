"use client";

import { useMemo, useState } from "react";
import { buildOutput, parseConfig } from "@/lib/convert";
import { detectLanguage, LANG_NAMES, PRESET_HINTS, PRESETS } from "@/lib/presets";
import type { Language, OutputOptions, PresetId, ShapeOptions } from "@/lib/types";
import OptionsPanel from "./OptionsPanel";
import OutputPanel from "./OutputPanel";
import SourceInput from "./SourceInput";

const MAX_INPUT_BYTES = 2 * 1024 * 1024;

const DEFAULT_SHAPE: ShapeOptions = PRESETS.dotnet;
const DEFAULT_OUTPUT: OutputOptions = {
  format: "env",
  prefix: "",
  skipNull: true,
  sort: false,
  resourceName: "app-config",
  namespace: "",
};

export default function Converter() {
  const [source, setSource] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preset, setPreset] = useState<PresetId>("auto");
  const [customShape, setCustomShape] = useState<ShapeOptions>(DEFAULT_SHAPE);
  const [output, setOutput] = useState<OutputOptions>(DEFAULT_OUTPUT);

  const parsed = useMemo(() => (source.trim() ? parseConfig(source) : null), [source]);
  const data = parsed?.ok ? parsed.data : null;

  const detection = useMemo(
    () => (preset === "auto" && data ? detectLanguage(data, fileName) : null),
    [preset, data, fileName],
  );

  const language: Language | null =
    preset === "auto" ? (detection?.language ?? "dotnet") : preset === "custom" ? null : preset;
  const shape = language ? PRESETS[language] : customShape;

  const result = useMemo(() => (data ? buildOutput(data, shape, output) : null), [data, shape, output]);

  const hint =
    preset === "auto"
      ? detection
        ? `Detected ${LANG_NAMES[detection.language]} (${detection.note}). ${PRESET_HINTS[detection.language]}`
        : "Language is detected from the file name and its keys."
      : preset === "custom"
        ? "Custom options are active."
        : PRESET_HINTS[preset];

  const error = fileError ?? (parsed && !parsed.ok ? parsed.error : null) ?? (result && !result.ok ? result.error : null);
  const ok = result?.ok ? result : null;

  const baseName = (fileName ?? "appsettings").replace(/\.json$/i, "");
  const outName = output.format === "env" ? `${baseName}.env` : `${baseName}.${output.format}.yaml`;
  const stats = ok
    ? `${ok.count} variable${ok.count === 1 ? "" : "s"}${ok.merged ? " (duplicate keys merged)" : ""}`
    : "No output yet";

  async function handleFile(file: File | undefined): Promise<void> {
    if (!file) return;
    if (file.size > MAX_INPUT_BYTES) {
      setFileError("File is larger than 2 MB.");
      return;
    }
    try {
      setSource(await file.text());
      setFileName(file.name);
      setFileError(null);
    } catch {
      setFileError("Could not read the file.");
    }
  }

  function changeShape(patch: Partial<ShapeOptions>): void {
    setCustomShape({ ...shape, ...patch });
    setPreset("custom");
  }

  return (
    <>
      <SourceInput
        value={source}
        maxLength={MAX_INPUT_BYTES}
        error={error}
        onChange={(value) => {
          setSource(value);
          setFileError(null);
        }}
        onFile={handleFile}
      />
      <OptionsPanel
        preset={preset}
        shape={shape}
        output={output}
        hint={hint}
        onPreset={setPreset}
        onShape={changeShape}
        onOutput={(patch) => setOutput((o) => ({ ...o, ...patch }))}
      />
      <OutputPanel text={ok?.text ?? ""} stats={stats} warnings={ok?.warnings ?? []} fileName={outName} />
    </>
  );
}