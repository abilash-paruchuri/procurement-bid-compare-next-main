import FileDropzone from "@/components/FileDropzone";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900">
          Procurement Bid Comparison Tool
        </h1>

        <p className="mt-3 max-w-3xl text-gray-600">
          Upload vendor bid files, clean spreadsheet data, apply prorated
          discounts, and compare net item pricing across vendors.
        </p>

        <FileDropzone />
      </div>
    </main>
  );
}