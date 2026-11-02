"use client";

import { useState } from "react";

interface Props {
  text: string;
  stats: string;
  warnings: string[];
  fileName: string;
}

export default function OutputPanel({ text, stats, warnings, fileName }: Props) {
  const [copyLabel, setCopyLabel] = useState("Copy");

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setCopyLabel("Copied");
    } catch {
      setCopyLabel("Copy failed");
    }
    setTimeout(() => setCopyLabel("Copy"), 1500);
  }

  function download(): void {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section className="card" aria-label="Output">
      <div className="bar">
        <span className="grow">{stats}</span>
        <button type="button" onClick={copy} disabled={!text}>
          {copyLabel}
        </button>
        <button type="button" className="primary" onClick={download} disabled={!text}>
          Download
        </button>
      </div>
      {warnings.map((w) => (
        <p key={w} className="warn" role="status">
          {w}
        </p>
      ))}
      <pre aria-live="polite">{text}</pre>
    </section>
  );
}