export type CleanBidItem = {
    vendorName: string;
    item: string;
    description: string;
    quantity: number;
    unitPrice: number;
    originalTotal: number;
    proratedDiscount: number;
    netTotal: number;
    netUnitPrice: number;
  };
  
  function normalizeHeader(header: string) {
    return header.toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  
  function findValue(row: Record<string, unknown>, possibleNames: string[]) {
    const normalizedRow: Record<string, unknown> = {};
  
    Object.keys(row).forEach((key) => {
      normalizedRow[normalizeHeader(key)] = row[key];
    });
  
    for (const name of possibleNames) {
      const normalizedName = normalizeHeader(name);
  
      if (normalizedRow[normalizedName] !== undefined) {
        return normalizedRow[normalizedName];
      }
    }
  
    return "";
  }
  
  function toNumber(value: unknown) {
    if (typeof value === "number") return value;
  
    return (
      Number(
        String(value)
          .replace(/[$,%]/g, "")
          .replace(/,/g, "")
          .trim()
      ) || 0
    );
  }
  
  export function cleanBidRows(
    vendorName: string,
    rows: Record<string, unknown>[],
    lumpSumDiscount: number
  ): CleanBidItem[] {
    const cleanedWithoutDiscount = rows
      .map((row) => {
        const item = String(
          findValue(row, [
            "item",
            "item no",
            "item number",
            "sku",
            "product code",
            "code",
          ])
        ).trim();
  
        const description =
          String(
            findValue(row, [
              "description",
              "item description",
              "product",
              "product name",
              "name",
            ])
          ).trim() || item;
  
        const quantity = toNumber(
          findValue(row, ["qty", "quantity", "qnty", "order qty"])
        );
  
        const unitPrice = toNumber(
          findValue(row, ["unit price", "unitprice", "rate", "price"])
        );
  
        let originalTotal = toNumber(
          findValue(row, [
            "total",
            "amount",
            "extended price",
            "extendedprice",
            "line total",
            "linetotal",
          ])
        );
  
        if (originalTotal === 0 && quantity > 0 && unitPrice > 0) {
          originalTotal = quantity * unitPrice;
        }
  
        return {
          vendorName,
          item,
          description,
          quantity,
          unitPrice,
          originalTotal,
          proratedDiscount: 0,
          netTotal: originalTotal,
          netUnitPrice: quantity > 0 ? originalTotal / quantity : 0,
        };
      })
      .filter((row) => row.description && row.originalTotal > 0);
  
    const subtotal = cleanedWithoutDiscount.reduce(
      (sum, row) => sum + row.originalTotal,
      0
    );
  
    const discountRate = subtotal > 0 ? lumpSumDiscount / subtotal : 0;
  
    return cleanedWithoutDiscount.map((row) => {
      const proratedDiscount = row.originalTotal * discountRate;
      const netTotal = row.originalTotal - proratedDiscount;
  
      return {
        ...row,
        proratedDiscount: roundMoney(proratedDiscount),
        netTotal: roundMoney(netTotal),
        netUnitPrice: row.quantity > 0 ? roundMoney(netTotal / row.quantity) : 0,
      };
    });
  }
  
  function roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }