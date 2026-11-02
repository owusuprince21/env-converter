import Converter from "@/components/Converter";

export default function Page() {
  return (
    <main className="page">
      <h1>Config to .env Converter</h1>
      <p className="sub">
        Upload an <code>appsettings.json</code> or paste JSON to get a flattened <code>.env</code> file or Kubernetes
        ConfigMap and Secret YAML. Everything runs in your browser and nothing is uploaded.
      </p>
      <Converter />
    </main>
  );
}