import type { Invoice } from "@/types/invoice";

export type { Invoice } from "@/types/invoice";

export const INVOICES_STORAGE_KEY = "huong-anh-paid-invoices";
export const INVOICES_STORAGE_EVENT = "huong-anh-invoices-changed";

export const EMPTY_INVOICE: Invoice | null = null;
let invoicesRaw: string | null = null;
let invoices: Invoice[] = [];
let latestInvoice: Invoice | null = EMPTY_INVOICE;

export const subscribeToInvoices = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(INVOICES_STORAGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(INVOICES_STORAGE_EVENT, onChange);
  };
};

const readInvoices = () => {
  const raw = window.localStorage.getItem(INVOICES_STORAGE_KEY);
  if (raw !== invoicesRaw) {
    invoicesRaw = raw;
    try {
      invoices = raw ? (JSON.parse(raw) as Invoice[]) : [];
    } catch {
      invoices = [];
    }
    latestInvoice = invoices.at(-1) ?? EMPTY_INVOICE;
  }
  return invoices;
};

export const getLatestInvoiceSnapshot = () => {
  readInvoices();
  return latestInvoice;
};

export const savePaidInvoice = (invoice: Invoice) => {
  const current = readInvoices();
  const next = current.some((item) => item.id === invoice.id)
    ? current.map((item) => (item.id === invoice.id ? invoice : item))
    : [...current, invoice];
  invoicesRaw = JSON.stringify(next);
  invoices = next;
  latestInvoice = invoice;
  window.localStorage.setItem(INVOICES_STORAGE_KEY, invoicesRaw);
  window.dispatchEvent(new Event(INVOICES_STORAGE_EVENT));
};