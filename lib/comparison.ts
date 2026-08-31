import { CleanBidItem } from "./bidProcessing";

function itemKey(item: CleanBidItem) {
  return (item.item || item.description).toLowerCase().trim();
}

export function buildComparison(allItems: CleanBidItem[]) {
  const grouped = new Map<string, CleanBidItem[]>();

  allItems.forEach((item) => {
    const key = itemKey(item);

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key)?.push(item);
  });

  const comparisonRows = Array.from(grouped.values()).map((items) => {
    const first = items[0];

    const lowest = items.reduce((best, current) =>
      current.netTotal < best.netTotal ? current : best
    );

    const highest = items.reduce((max, current) =>
      current.netTotal > max.netTotal ? current : max
    );

    const row: Record<string, string | number> = {
      item: first.item,
      description: first.description,
      quantity: first.quantity,
      lowestVendor: lowest.vendorName,
      lowestNetTotal: lowest.netTotal,
      priceDifference: Math.round((highest.netTotal - lowest.netTotal) * 100) / 100,
    };

    items.forEach((item) => {
      row[`${item.vendorName} Original Total`] = item.originalTotal;
      row[`${item.vendorName} Prorated Discount`] = item.proratedDiscount;
      row[`${item.vendorName} Net Total`] = item.netTotal;
      row[`${item.vendorName} Net Unit Price`] = item.netUnitPrice;
    });

    return row;
  });

  return comparisonRows;
}