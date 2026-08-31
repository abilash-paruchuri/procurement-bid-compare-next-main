"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

type ComparisonRow = Record<string, string | number>;

type ServerFile = {
  fileName: string;
  extension: string;
  status: string;
  rows: Record<string, unknown>[];
  cleanRows: Record<string, unknown>[];
};

const acceptedTypes = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "text/csv": [".csv"],
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "text/plain": [".txt"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/bmp": [".bmp"],
  "image/tiff": [".tiff"],
  "image/webp": [".webp"],
};

export default function FileDropzone() {
  const [files, setFiles] = useState<File[]>([]);
  const [discounts, setDiscounts] = useState<Record<string, string>>({});
  const [serverFiles, setServerFiles] = useState<ServerFile[]>([]);
  const [comparison, setComparison] = useState<ComparisonRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    setServerFiles([]);
    setComparison([]);
    setError("");
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      multiple: true,
      accept: acceptedTypes,
    });

  async function handleUpload() {
    if (files.length === 0) {
      setError("Please select at least one file.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();

      files.forEach((file) => {
        formData.append("files", file);
      });

      formData.append("discounts", JSON.stringify(discounts));

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Processing failed.");
      }

      setServerFiles(data.files || []);
      setComparison(data.comparison || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-8">
      <div
        {...getRootProps()}
        className="cursor-pointer rounded-lg border-2 border-dashed border-gray-400 bg-white p-10 text-center hover:border-blue-500"
      >
        <input {...getInputProps()} />

        {isDragActive ? (
          <p className="text-blue-600">Drop the files here...</p>
        ) : (
          <p className="text-gray-800">
            Drag vendor files into the box, or click to select files
          </p>
        )}

        <p className="mt-2 text-sm text-gray-500">
          Supported: Excel, CSV, PDF, Word, TXT, JPG, PNG, GIF, BMP, TIFF, WEBP.
        </p>
      </div>

      {fileRejections.length > 0 && (
        <div className="mt-4 rounded-md bg-red-100 p-4 text-red-700">
          Some files were rejected. Please upload supported file types only.
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-6 rounded-lg bg-white p-5 shadow">
          <h2 className="mb-3 text-xl font-semibold">Selected Files</h2>

          <ul className="space-y-3">
            {files.map((file) => (
              <li
                key={file.name}
                className="grid gap-3 rounded border p-3 md:grid-cols-[1fr_180px]"
              >
                <div>
                  <div className="font-medium">{file.name}</div>
                  <div className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>

                <input
                  type="number"
                  placeholder="Total discount"
                  value={discounts[file.name] || ""}
                  onChange={(event) =>
                    setDiscounts({
                      ...discounts,
                      [file.name]: event.target.value,
                    })
                  }
                  className="rounded border px-3 py-2"
                />
              </li>
            ))}
          </ul>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-5 rounded bg-blue-600 px-5 py-2 text-white disabled:bg-gray-400"
          >
            {uploading ? "Processing..." : "Upload and Process"}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-md bg-red-100 p-4 text-red-700">
          {error}
        </div>
      )}

      {comparison.length > 0 && (
        <DataTable title="Comparison Table" rows={comparison} highlightLowest />
      )}

      {serverFiles.map((file) => (
        <div key={file.fileName} className="mt-6 rounded-lg bg-white p-5 shadow">
          <h2 className="text-lg font-semibold">{file.fileName}</h2>
          <p className="mt-1 text-sm text-gray-600">{file.status}</p>

          {file.cleanRows.length > 0 && (
            <DataTable title="Clean Data Preview" rows={file.cleanRows} />
          )}

          {file.rows.length > 0 && (
            <DataTable title="Raw Data Preview" rows={file.rows.slice(0, 10)} />
          )}
        </div>
      ))}
    </div>
  );
}

function DataTable({
  title,
  rows,
  highlightLowest = false,
}: {
  title: string;
  rows: Record<string, unknown>[];
  highlightLowest?: boolean;
}) {
  if (rows.length === 0) return null;

  const columns = Object.keys(rows[0]);

  return (
    <div className="mt-6 overflow-x-auto">
      <h3 className="mb-2 font-semibold">{title}</h3>

      <table className="w-full border-collapse bg-white text-sm">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} className="border bg-gray-100 p-2 text-left">
                {column}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => {
                const isLowest =
                  highlightLowest &&
                  String(column).toLowerCase().includes("lowestvendor");

                return (
                  <td
                    key={column}
                    className={`border p-2 ${isLowest ? "bg-green-100 font-semibold" : ""}`}
                  >
                    {String(row[column] ?? "")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}