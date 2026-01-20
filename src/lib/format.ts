import { format, parseISO } from "date-fns";

export function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatPercent(value: number, digits = 0) {
  return `${value.toFixed(digits)}%`;
}

export function formatMonthLabel(isoMonth: string) {
  const date = parseISO(`${isoMonth}-01`);
  return format(date, "MMM yyyy");
}

export function formatDateTime(iso: string) {
  return format(parseISO(iso), "MMM d, yyyy h:mm a");
}
