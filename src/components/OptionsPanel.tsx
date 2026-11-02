"use client";

import type { ArrayMode, OutputFormat, OutputOptions, PresetId, Separator, ShapeOptions } from "@/lib/types";

interface Props {
  preset: PresetId;
  shape: ShapeOptions;
  output: OutputOptions;
  hint: string;
  onPreset: (preset: PresetId) => void;
  onShape: (patch: Partial<ShapeOptions>) => void;
  onOutput: (patch: Partial<OutputOptions>) => void;
}

interface CheckProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Check({ label, checked, onChange }: CheckProps) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export default function OptionsPanel({ preset, shape, output, hint, onPreset, onShape, onOutput }: Props) {
  const yaml = output.format !== "env";

  return (
    <section className="card" aria-label="Options">
      <div className="opts">
        <label className="field">
          Target language or framework
          <select value={preset} onChange={(e) => onPreset(e.target.value as PresetId)}>
            <option value="auto">Auto detect</option>
            <option value="dotnet">.NET (ASP.NET Core)</option>
            <option value="python">Python (pydantic-settings or Django)</option>
            <option value="java">Java (Spring Boot)</option>
            <option value="node">Node.js (dotenv)</option>
            <option value="php">PHP (Laravel or Symfony)</option>
            <option value="custom">Custom</option>
          </select>
        </label>

        <label className="field">
          Arrays
          <select value={shape.arrays} onChange={(e) => onShape({ arrays: e.target.value as ArrayMode })}>
            <option value="index">Indexed keys (Key__0, Key__1)</option>
            <option value="json">JSON string (Key=["a","b"])</option>
          </select>
        </label>

        <label className="field">
          Output format
          <select value={output.format} onChange={(e) => onOutput({ format: e.target.value as OutputFormat })}>
            <option value="env">.env (KEY=value)</option>
            <option value="configmap">Kubernetes ConfigMap YAML</option>
            <option value="secret">Kubernetes Secret YAML (base64)</option>
          </select>
        </label>

        <label className="field">
          Nested key separator
          <select value={shape.separator} onChange={(e) => onShape({ separator: e.target.value as Separator })}>
            <option value="__">Double underscore (ASP.NET Core)</option>
            <option value="_">Single underscore</option>
            <option value=".">Dot</option>
            <option value=":">Colon</option>
          </select>
        </label>

        <label className="field">
          Key prefix (optional)
          <input type="text" value={output.prefix} placeholder="MYAPP_" onChange={(e) => onOutput({ prefix: e.target.value })} />
        </label>

        {yaml && (
          <>
            <label className="field">
              Resource name
              <input type="text" value={output.resourceName} onChange={(e) => onOutput({ resourceName: e.target.value })} />
            </label>
            <label className="field">
              Namespace (optional)
              <input type="text" value={output.namespace} placeholder="default" onChange={(e) => onOutput({ namespace: e.target.value })} />
            </label>
          </>
        )}
      </div>

      <div className="checks">
        <Check label="Uppercase keys" checked={shape.uppercase} onChange={(uppercase) => onShape({ uppercase })} />
        <Check label="Strict names (A-Z, 0-9, _ only)" checked={shape.strict} onChange={(strict) => onShape({ strict })} />
        <Check label="Remove dashes from keys (Spring)" checked={shape.removeDashes} onChange={(removeDashes) => onShape({ removeDashes })} />
        {!yaml && <Check label="Quote values (docker and dotenv style)" checked={shape.quote} onChange={(quote) => onShape({ quote })} />}
        <Check label="Skip null values" checked={output.skipNull} onChange={(skipNull) => onOutput({ skipNull })} />
        <Check label="Sort keys" checked={output.sort} onChange={(sort) => onOutput({ sort })} />
      </div>

      <p className="hint">
        {hint} Selecting a language sets the options above and you can still change them. kubectl{" "}
        <code>--from-env-file</code> keeps quotes literally, so leave quoting off for ConfigMaps.
      </p>
    </section>
  );
}