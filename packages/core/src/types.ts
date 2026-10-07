export type RetailTerms = { sku: "coffee-pass"; commitment: string };
export type OrderInput = {
  solanaWallet: string;
  cardanoWallet: string;
  scenario: "success" | "tampered" | "expiry";
  retail?: RetailTerms;
};
export type Mode = "rehearsal" | "live";
export type Status =
  | "created"
  | "funded"
  | "reserved"
  | "purchasing"
  | "paid"
  | "verifying"
  | "settled"
  | "rejected"
  | "expired"
  | "refunded"
  | "blocked";
export type SourceFact = {
  network: "solana:mainnet" | "cardano:mainnet";
  wallet: string;
  tx: string;
  slot: string;
  fee: string;
  confirmed: boolean;
};
export type Report = {
  inputHash: string;
  solanaWallet: string;
  cardanoWallet: string;
  facts: SourceFact[];
  retail?: RetailTerms;
};
export type Quote = {
  orderId: string;
  network: "cardano:preprod";
  asset: "lovelace";
  amount: string;
  recipient: string;
  expiresAt: number;
  resource: string;
};
export type ReceiptBody = {
  orderId: string;
  quoteHash: string;
  paymentHash: string;
  recipient: string;
  network: "cardano:preprod";
  asset: "lovelace";
  amount: string;
  resultHash: string;
};
export type Receipt = ReceiptBody & { signature: string };
export type Payment = {
  tx: string;
  recipient: string;
  amount: string;
  network: string;
  asset: string;
  confirmed: boolean;
  fee: string;
};
export type Check = { name: string; passed: boolean; detail: string };
export type Verification = {
  accepted: boolean;
  reason: string;
  checks: Check[];
  mode: "rehearsal" | "cre-simulation";
  resultHash: string;
  timestamp: number;
  transcript?: string;
};
export type Order = {
  id: string;
  mode: Mode;
  status: Status;
  createdAt: number;
  deadline: number;
  input: OrderInput;
  inputHash: string;
  reward: string;
  ceiling: string;
  feeCeiling: string;
  buyer: string;
  worker: string;
  seller: string;
  sellerKey: string;
  quote?: Quote;
  quoteHash?: string;
  report?: Report;
  receipt?: Receipt;
  payment?: Payment;
  verification?: Verification;
  solana?: {
    pda: string;
    fundingTx?: string;
    reserveTx?: string;
    settleTx?: string;
    refundTx?: string;
  };
  error?: string;
};
