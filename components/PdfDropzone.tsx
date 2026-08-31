"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

type ServerFile = {
  fileName: string;
  extension: string;
  status: string;
  rows: Record<string, unknown>[];
};

const acceptedTypes = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "text/csv": [".csv"],
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/bmp": [".bmp"],
  "image/tiff": [".tiff"],
  "image/webp": [".webp"],
};

export default function PdfDropzone() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [serverFiles, setServerFiles] = useState<ServerFile[]>([]);
  const [error, setError] = useState("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    setServerFiles([]);
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

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed.");
      }

      setServerFiles(data.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-8 max-w-5xl">
      <div
        {...getRootProps()}
        className="cursor-pointer rounded-lg border-2 border-dashed border-gray-400 bg-white p-10 text-center hover:border-blue-500"
      >
        <input {...getInputProps()} />

        {isDragActive ? (
          <p className="text-blue-600">Drop the files here...</p>
        ) : (
          <p className="text-gray-800">
            Drag vendor bid files into the box, or click to select files
          </p>
        )}

        <p className="mt-2 text-sm text-gray-500">
          Supported: Excel, CSV, PDF, Word, TXT, and image files.
        </p>
      </div>

      {fileRejections.length > 0 && (
        <div className="mt-4 rounded-md bg-red-100 p-4 text-red-700">
          Some files were rejected. Please upload only supported file types.
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-6 rounded-lg bg-white p-5 shadow">
          <h2 className="mb-3 text-xl font-semibold">Selected Files</h2>

          <ul className="space-y-2">
            {files.map((file) => (
              <li
                key={file.name}
                className="flex justify-between rounded border p-3"
              >
                <span>{file.name}</span>
                <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
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

      {serverFiles.length > 0 && (
        <div className="mt-6 space-y-5">
          {serverFiles.map((file) => (
            <div key={file.fileName} className="rounded-lg bg-white p-5 shadow">
              <h2 className="text-lg font-semibold">{file.fileName}</h2>
              <p className="mt-1 text-sm text-gray-600">{file.status}</p>

              {file.rows.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        {Object.keys(file.rows[0]).map((key) => (
                          <th key={key} className="border bg-gray-100 p-2 text-left">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {file.rows.slice(0, 10).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {Object.keys(file.rows[0]).map((key) => (
                            <td key={key} className="border p-2">
                              {String(row[key] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}