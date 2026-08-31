import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { cleanBidRows, CleanBidItem } from "@/lib/bidProcessing";
import { buildComparison } from "@/lib/comparison";

const allowedExtensions = [
  "xlsx",
  "xls",
  "csv",
  "pdf",
  "doc",
  "docx",
  "txt",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "bmp",
  "tiff",
  "webp",
];

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

async function readSpreadsheetFile(file: File) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
  });
}

async function readTextFile(file: File) {
  const text = await file.text();

  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line, index) => ({
      lineNumber: index + 1,
      text: line,
    }));
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files");

    const discountsText = formData.get("discounts");
    const discounts = discountsText ? JSON.parse(String(discountsText)) : {};

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
    }

    const processedFiles = [];
    const allCleanItems: CleanBidItem[] = [];

    for (const uploadedFile of files) {
      if (!(uploadedFile instanceof File)) {
        throw new Error("Invalid file upload.");
      }

      const extension = getExtension(uploadedFile.name);

      if (!allowedExtensions.includes(extension)) {
        throw new Error(`${uploadedFile.name} is not a supported file type.`);
      }

      let rows: Record<string, unknown>[] = [];
      let cleanRows: CleanBidItem[] = [];
      let status = "File uploaded successfully.";

      if (["xlsx", "xls", "csv"].includes(extension)) {
        rows = await readSpreadsheetFile(uploadedFile);

        const vendorName = uploadedFile.name.replace(/\.[^/.]+$/, "");
        const lumpSumDiscount = Number(discounts[uploadedFile.name] || 0);

        cleanRows = cleanBidRows(vendorName, rows, lumpSumDiscount);
        allCleanItems.push(...cleanRows);

        status = "Spreadsheet parsed, cleaned, and discount applied.";
      } else if (extension === "txt") {
        rows = await readTextFile(uploadedFile);
        status =
          "Text file parsed. For bid comparison, convert this file to Excel/CSV format.";
      } else if (extension === "pdf") {
        status =
          "PDF uploaded. iLovePDF credentials are configured server-side, but the official iLoveAPI tool list does not expose direct PDF-to-XLSX conversion. Use Excel/CSV now or add a PDF-to-Excel provider next.";
      } else {
        status =
          "File uploaded. Word/image OCR conversion will be added in a later phase.";
      }

      processedFiles.push({
        fileName: uploadedFile.name,
        extension,
        size: uploadedFile.size,
        status,
        rows,
        cleanRows,
      });
    }

    const comparison = buildComparison(allCleanItems);

    return NextResponse.json({
      message: "Files processed successfully.",
      files: processedFiles,
      comparison,
      ilovePdfConfigured: Boolean(
        process.env.ILOVEPDF_PUBLIC_KEY && process.env.ILOVEPDF_SECRET_KEY
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Something went wrong.",
      },
      { status: 500 }
    );
  }
}