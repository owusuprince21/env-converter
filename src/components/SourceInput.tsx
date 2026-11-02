"use client";

import { useRef, useState } from "react";

interface Props {
  value: string;
  maxLength: number;
  error: string | null;
  onChange: (value: string) => void;
  onFile: (file: File | undefined) => void;
}

export default function SourceInput({ value, maxLength, error, onChange, onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <section className="card" aria-label="Input">
      <div
        className={over ? "drop over" : "drop"}
        tabIndex={0}
        role="button"
        aria-label="Choose or drop a JSON file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          onFile(e.dataTransfer.files[0]);
        }}
      >
        <strong>Drop a JSON file here</strong> or tap to browse
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <label className="sr-only" htmlFor="src">
        JSON source
      </label>
      <textarea
        id="src"
        value={value}
        maxLength={maxLength}
        spellCheck={false}
        placeholder='Or paste JSON here, for example {"ConnectionStrings":{"Default":"Server=db"}}'
        onChange={(e) => onChange(e.target.value)}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}