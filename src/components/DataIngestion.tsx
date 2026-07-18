import React, { useState, useRef } from "react";
import { TelemetryPoint } from "../types/telemetry";

interface DataIngestionProps {
  onDataParsed: (data: TelemetryPoint[], cctvUrl: string) => void;
}

export const DataIngestion: React.FC<DataIngestionProps> = ({ onDataParsed }) => {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<TelemetryPoint[] | null>(null);
  const [cctvUrl, setCctvUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (csvText: string): TelemetryPoint[] => {
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== "");
    if (lines.length < 2) {
      throw new Error("CSV Ingestion Error: File must contain a header row and at least one telemetry record row.");
    }

    // Parse headers case-insensitively
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const zoneIdx = headers.indexOf("zone");
    const capacityIdx = headers.indexOf("capacity");
    const concessionsIdx = headers.indexOf("concessions");
    const incidentsIdx = headers.indexOf("incidents");
    const throughputIdx = headers.indexOf("throughput");

    if (zoneIdx === -1 || capacityIdx === -1 || concessionsIdx === -1 || incidentsIdx === -1) {
      throw new Error("CSV Schema Rejection: Missing required columns. Required: Zone, Capacity, Concessions, Incidents.");
    }

    const telemetryPoints: TelemetryPoint[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(",").map((val) => val.trim());
      if (row.length < 4) continue; // Skip empty or incomplete trailing rows

      const zoneId = row[zoneIdx];
      const gateCapacityPercentage = parseFloat(row[capacityIdx]);
      const concessionWaitTimeMins = parseFloat(row[concessionsIdx]);
      const activeIncidentsCount = parseFloat(row[incidentsIdx]);
      // Fallback throughput to 50 if missing in CSV
      const securityThroughputPerMin = throughputIdx !== -1 ? parseFloat(row[throughputIdx]) : 50;

      if (!zoneId || zoneId === "") {
        throw new Error(`Row ${i + 1} Rejection: Zone ID must be a non-empty string.`);
      }
      if (isNaN(gateCapacityPercentage) || gateCapacityPercentage < 0 || gateCapacityPercentage > 100) {
        throw new Error(`Row ${i + 1} Rejection (Zone "${zoneId}"): Capacity must be a number between 0 and 100.`);
      }
      if (isNaN(concessionWaitTimeMins) || concessionWaitTimeMins < 0) {
        throw new Error(`Row ${i + 1} Rejection (Zone "${zoneId}"): Concessions wait time must be a non-negative number.`);
      }
      if (isNaN(activeIncidentsCount) || activeIncidentsCount < 0) {
        throw new Error(`Row ${i + 1} Rejection (Zone "${zoneId}"): Active incidents must be a non-negative number.`);
      }

      telemetryPoints.push({
        zoneId,
        gateCapacityPercentage,
        securityThroughputPerMin,
        concessionWaitTimeMins,
        activeIncidentsCount,
        timestamp: Date.now(),
      });
    }

    if (telemetryPoints.length === 0) {
      throw new Error("CSV Ingestion Error: No valid operational rows parsed.");
    }

    return telemetryPoints;
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    setParsedData(null);
    setSuccessMessage(null);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Security Filter: Only CSV files (.csv) are permitted for telemetry ingestion.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") {
        try {
          const telemetry = parseCSV(result);
          setParsedData(telemetry);
          setError(null);
          setSuccessMessage(`CSV Loaded: Parsed ${telemetry.length} stadium zones.`);
        } catch (err: any) {
          console.error(err);
          setError(err.message || "Failed to process CSV file.");
        }
      } else {
        setError("File Reading Error: Failed to retrieve file content stream.");
      }
    };
    reader.onloadend = () => {
      // Clear file inputs so same file can be uploaded back-to-back if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.onerror = () => {
      setError("File Reading Error: FileReader encountered an unexpected stream interrupt.");
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const downloadCSVTemplate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const csvContent =
      "zoneId,gateCapacityPercentage,securityThroughputPerMin,concessionWaitTimeMins,activeIncidentsCount\n" +
      "Zone A (North Gate),85,45,15,1\n" +
      "Zone B (East Concourse),45,80,5,0\n" +
      "Zone C (South Portal),92,20,25,2\n" +
      "Zone D (VIP Gate),30,110,2,0";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "stadium_telemetry_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedData) {
      setError("Operations Control: A valid CSV telemetry dataset must be loaded before submitting.");
      return;
    }
    onDataParsed(parsedData, cctvUrl);
    setSuccessMessage("Operational data and CCTV URL dispatched to AI Reasoning Console.");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 shadow-2xl transition duration-300 hover:border-slate-700 max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <svg width="20" height="20" className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Telemetry Ingestion Pipeline
      </h3>
      <p className="text-xs text-slate-200 mb-4">
        Upload a structured `.csv` telemetry file (Zone, Capacity, Concessions, Incidents) and configure live CCTV streams to verify stadium integrity.
      </p>

      {/* Semantic Label/Drop Container instead of interactive nested Div role layout */}
      <label
        htmlFor="telemetry-csv-upload"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer block transition-all duration-200 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-slate-900 ${isDragActive
          ? "border-indigo-400 bg-indigo-950/20"
          : "border-slate-700 bg-slate-950/40 hover:bg-slate-950/70 hover:border-slate-600"
          }`}
      >
        <input
          id="telemetry-csv-upload"
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          className="sr-only"
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <svg width="40" height="40" className="w-10 h-10 text-slate-300 transition duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-xs font-medium text-slate-100">
            {fileName ? `Selected: ${fileName}` : "Drag and drop your CSV here"}
          </p>
          <p className="text-[10px] text-slate-300">or click to browse local files</p>
        </div>
      </label>

      {/* Download Sample CSV Button */}
      <div className="mt-2.5">
        <button
          type="button"
          onClick={downloadCSVTemplate}
          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer bg-slate-950/40 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg w-full justify-center"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
          </svg>
          Download Sample CSV Template
        </button>
      </div>

      {/* CCTV URL Field */}
      <div className="mt-4">
        <label htmlFor="cctv-input" className="text-xs font-semibold uppercase tracking-wider text-slate-200 block mb-1">
          CCTV Stream URL (YouTube)
        </label>
        <input
          id="cctv-input"
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={cctvUrl}
          onChange={(e) => setCctvUrl(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg p-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!parsedData}
        className={`w-full mt-4 py-2 px-3 transition rounded-lg text-xs font-medium text-white shadow-lg ${parsedData
          ? "bg-indigo-650 hover:bg-indigo-600 active:scale-[0.98] cursor-pointer"
          : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
      >
        Submit Dataset & Streams
      </button>

      {/* Accessible Feedback Logs */}
      <div aria-live="polite" className="mt-3 space-y-2">
        {error && (
          <div role="alert" className="flex items-start gap-2 bg-red-950/40 border border-red-900/50 text-red-200 p-2.5 rounded-lg text-[11px] leading-relaxed">
            <svg width="16" height="16" className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2 bg-emerald-950/40 border border-emerald-900/50 text-emerald-200 p-2.5 rounded-lg text-[11px] leading-relaxed">
            <svg width="16" height="16" className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}
      </div>
    </form>
  );
};