export type PaymentAccount = {
  id: "tpbank" | "mb";
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
};

export type PaymentMethod =
  | { id: PaymentAccount["id"]; type: "bank"; label: string; account: PaymentAccount }
  | { id: "cash"; type: "cash"; label: "Tiền mặt" };