import type { PaymentAccount, PaymentMethod } from "@/types/payment";

export type { PaymentAccount, PaymentMethod } from "@/types/payment";

export const paymentAccounts = [
  {
    id: "tpbank",
    bankCode: "TPB",
    bankName: "TPBank",
    accountNumber: "13923102003",
    accountName: "HO HUYEN THI",
  },
  {
    id: "mb",
    bankCode: "MB",
    bankName: "MB Bank",
    accountNumber: "0000929076434",
    accountName: "HUYNH TAN QUANG NHAT",
  },
] satisfies PaymentAccount[];

export const paymentMethods: PaymentMethod[] = [
  ...paymentAccounts.map((account) => ({
    id: account.id,
    type: "bank" as const,
    label: account.bankName,
    account,
  })),
  { id: "cash", type: "cash", label: "Tiền mặt" },
];

export const paymentConfig = paymentAccounts[0];

export const isPaymentConfigured = paymentAccounts.every(
  (account) => account.bankCode && account.accountNumber && account.accountName
);

export const createVietQrUrl = (
  amount: number,
  reference = "HUONG ANH MARKET",
  account: PaymentAccount = paymentConfig
) => {
  const query = new URLSearchParams({
    amount: String(amount),
    addInfo: reference,
    accountName: account.accountName,
  });

  return `https://img.vietqr.io/image/${account.bankCode}-${account.accountNumber}-compact2.png?${query.toString()}`;
};
