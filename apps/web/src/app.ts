declare const __API_URL__: string;
import { hash } from "../../../packages/core/src/canonical.ts";
import { verifyWithSignature } from "../../../packages/core/src/verification.ts";
import { verifyReceiptSignature } from "../../../packages/core/src/receipt-signature.ts";
type Order = import("../../../packages/core/src/domain.ts").Order;
type Event = import("../../api/src/store.ts").Event;
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const api = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? ""
  : __API_URL__;
let current: Order | undefined,
  health: any,
  wallet: any,
  poll: number | undefined;
const sampleSol = "Vote111111111111111111111111111111111111111";
const sampleAda = "addr1q" + "a".repeat(97);
const short = (s: string) =>
  s.length > 20 ? `${s.slice(0, 10)}…${s.slice(-6)}` : s;
const text = (tag: string, value: string, className = "") => {
  const e = document.createElement(tag);
  e.textContent = value;
  if (className) e.className = className;
  return e;
};
async function request(path: string, body?: unknown) {
  const response = await fetch(`${api}${path}`, {
    ...(body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
    signal: AbortSignal.timeout(25000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
  return data;
}
function tab(name: string) {
  for (const n of ["orders", "evidence", "integrations"]) {
    $(`${n}-view`).hidden = n !== name;
    document
      .querySelector(`[data-tab="${n}"]`)
      ?.classList.toggle("active", n === name);
  }
  $("page-name").textContent = name[0].toUpperCase() + name.slice(1);
}
document
  .querySelectorAll<HTMLButtonElement>("[data-tab]")
  .forEach((b) => (b.onclick = () => tab(b.dataset.tab!)));
$("sample").onclick = () => {
  ($("solana") as HTMLInputElement).value = sampleSol;
  ($("cardano") as HTMLInputElement).value = sampleAda;
};
$("wallet").onclick = async () => {
  try {
    const provider = (window as any).solana;
    if (!provider)
      throw new Error(
        "Install a Solana wallet to use live Devnet mode. Rehearsal needs no wallet.",
      );
    const connected = await provider.connect();
    wallet = provider;
    $("wallet").textContent = short(connected.publicKey.toString());
  } catch (e) {
    $("form-error").textContent = (e as Error).message;
  }
};
function renderEvents(events: Event[]) {
  const list = $("timeline");
  list.replaceChildren();
  for (const event of events.filter((e) => e.step !== "created")) {
    const li = text("li", "", event.step);
    li.append(
      text(
        "strong",
        (
          {
            funded: "Task funded",
            reserved: "Quote reserved",
            purchasing: "Agent purchases service",
            paid: "Seller receipt received",
            verifying: "Verification running",
            settled: "Task reward released",
            rejected: "Report rejected",
            expired: "Task expired",
            refunded: "Task reward refunded",
            blocked: "Execution paused",
          } as Record<string, string>
        )[event.step] ?? event.step,
      ),
    );
    li.append(text("p", event.detail));
    list.append(li);
  }
}
function renderProofFlow(order: Order) {
  const flow = $("proof-flow");
  flow.replaceChildren();
  if (order.mode !== "live") return;
  const rows = [
    [
      "Solana",
      order.solana?.settleTx ? "Reward released" : "Task escrow",
      order.solana?.fundingTx
        ? `https://explorer.solana.com/tx/${order.solana.settleTx ?? order.solana.fundingTx}?cluster=devnet`
        : "",
    ],
    [
      "Cardano",
      order.payment
        ? `${Number(order.payment.amount) / 1e6} tADA paid`
        : "Bounded purchase",
      order.payment
        ? `https://preprod.cardanoscan.io/transaction/${order.payment.tx}`
        : "",
    ],
    [
      "NOWNodes",
      `${order.report?.facts.length ?? 0} confirmed facts`,
      "#facts",
    ],
    [
      "Chainlink CRE",
      order.verification
        ? `${order.verification.checks.filter((c) => c.passed).length}/${order.verification.checks.length} checks passed`
        : "Independent verification",
      "#checks",
    ],
  ];
  for (const [name, detail, href] of rows) {
    const card = text(href ? "a" : "div", "", "proof-card");
    if (href) {
      card.setAttribute("href", href);
      if (href.startsWith("https:")) {
        card.setAttribute("target", "_blank");
        card.setAttribute("rel", "noopener noreferrer");
      }
    }
    card.append(text("small", name), text("strong", detail));
    flow.append(card);
  }
}
let challengeOrderId = "",
  altered = false;
function renderChallenge(order: Order) {
  const panel = $("challenge");
  panel.hidden = !(
    order.report?.facts.length &&
    order.receipt &&
    order.payment &&
    order.verification
  );
  if (panel.hidden) return;
  if (challengeOrderId !== order.id) {
    challengeOrderId = order.id;
    altered = false;
  }
  const copy = structuredClone(order);
  const fact = copy.report!.facts[0];
  if (altered) fact.fee = (BigInt(fact.fee) + 1n).toString();
  const replay = verifyWithSignature(
    copy,
    order.payment!,
    order.report!.facts,
    verifyReceiptSignature,
    order.verification!.timestamp,
  );
  const status = $("challenge-status");
  status.textContent = replay.accepted ? "VERIFIED COPY" : "REJECTED COPY";
  status.className = `pill ${replay.accepted ? "green" : "red"}`;
  panel.classList.toggle("tampered", altered);
  $("challenge-fee").textContent =
    `Transaction fee: ${order.report!.facts[0].fee} → ${fact.fee} ${fact.network === "solana:mainnet" ? "lamports" : "lovelace"}`;
  $("signed-hash").textContent = order.receipt!.resultHash;
  $("preview-hash").textContent = hash(copy.report);
  const checks = $("challenge-checks");
  checks.replaceChildren();
  for (const c of replay.checks.filter((c) =>
    ["Seller signature", "Result integrity", "Source provenance"].includes(
      c.name,
    ),
  )) {
    const row = text("div", "", `check${c.passed ? "" : " fail"}`);
    row.append(
      text("span", c.passed ? "✓" : "✕"),
      text("strong", c.name),
      text(
        "small",
        c.passed ? "Matches saved evidence" : "Altered fee detected",
      ),
    );
    checks.append(row);
  }
  const toggle = $("challenge-toggle");
  toggle.textContent = altered
    ? "Restore original report ↺"
    : "Alter one fee +1 →";
  toggle.onclick = () => {
    altered = !altered;
    renderChallenge(order);
  };
}
function renderEvidence(order: Order) {
  renderProofFlow(order);
  renderChallenge(order);
  $("evidence-mode").textContent =
    order.mode === "rehearsal" ? "REHEARSAL EVIDENCE" : "CRE SIMULATION";
  $("receipt-json").textContent = JSON.stringify(
    {
      inputHash: order.inputHash,
      quote: order.quote,
      quoteHash: order.quoteHash,
      receipt: order.receipt,
      solana: order.solana,
    },
    null,
    2,
  );
  const checks = $("checks");
  checks.replaceChildren();
  for (const c of order.verification?.checks ?? []) {
    const d = text("div", "", `check${c.passed ? "" : " fail"}`);
    d.append(
      text("span", c.passed ? "✓" : "✕"),
      text("strong", c.name),
      text("small", c.detail),
    );
    checks.append(d);
  }
  const facts = $("facts");
  facts.replaceChildren();
  if (order.report) {
    const wrap = text("div", "", "table-wrap"),
      table = document.createElement("table");
    const head = document.createElement("thead"),
      tr = document.createElement("tr");
    ["Network", "Transaction", "Slot", "Fee (smallest unit)"].forEach((h) =>
      tr.append(text("th", h)),
    );
    head.append(tr);
    table.append(head);
    const body = document.createElement("tbody");
    for (const f of order.report.facts) {
      const row = document.createElement("tr");
      row.append(text("td", f.network));
      const td = document.createElement("td");
      if (order.mode === "live") {
        const a = text("a", short(f.tx));
        a.setAttribute(
          "href",
          f.network === "solana:mainnet"
            ? `https://explorer.solana.com/tx/${encodeURIComponent(f.tx)}`
            : `https://cardanoscan.io/transaction/${encodeURIComponent(f.tx)}`,
        );
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
        td.append(a);
      } else td.append(text("span", `${short(f.tx)} · sample`));
      row.append(td, text("td", f.slot), text("td", f.fee));
      body.append(row);
    }
    table.append(body);
    wrap.append(table);
    facts.append(wrap);
  }
}
function renderOrder(order: Order) {
  current = order;
  localStorage.setItem("orca-current-order", order.id);
  $("execution-empty").hidden = true;
  $("execution-content").hidden = false;
  $("order-id").textContent = `#${order.id.slice(0, 8)} · ${order.mode}`;
  const status = $("status");
  status.textContent = order.status.toUpperCase();
  status.className = `pill ${["settled", "refunded"].includes(order.status) ? "green" : ["rejected", "blocked"].includes(order.status) ? "red" : order.status === "expired" ? "amber" : "blue"}`;
  $("refund").hidden = order.status !== "expired";
  const summary = $("result-summary");
  summary.replaceChildren();
  if (
    ["settled", "rejected", "blocked", "expired", "refunded"].includes(
      order.status,
    )
  ) {
    const d = text(
      "div",
      "",
      `summary ${["rejected", "blocked"].includes(order.status) ? "rejection" : ""}`,
    );
    d.append(
      text(
        "strong",
        order.status === "settled"
          ? `Report ready · ${order.report?.facts.length ?? 0} transaction facts`
          : order.status === "refunded"
            ? "Task reward returned"
            : order.status === "rejected"
              ? "Integrity check failed. Escrow stays protected."
              : order.status === "expired"
                ? "Deadline reached. Your task reward is refundable."
                : `Execution paused: ${order.error}`,
      ),
    );
    if (order.report) {
      const button = text(
        "button",
        "Inspect receipt and verification ↗",
        "text-button",
      );
      button.onclick = () => tab("evidence");
      d.append(button);
    }
    summary.append(d);
  }
  renderEvidence(order);
}
async function selectOrder(id: string) {
  if (poll) clearInterval(poll);
  const refresh = async () => {
    try {
      const [order, events] = await Promise.all([
        request(`/api/orders/${id}`),
        request(`/api/orders/${id}/events`),
      ]);
      renderOrder(order);
      renderEvents(events);
      if (
        ["settled", "rejected", "expired", "refunded", "blocked"].includes(
          order.status,
        )
      ) {
        clearInterval(poll);
        await loadRecent();
      }
    } catch (e) {
      $("form-error").textContent = (e as Error).message;
    }
  };
  await refresh();
  if (
    !current ||
    !["settled", "rejected", "expired", "refunded", "blocked"].includes(
      current.status,
    )
  )
    poll = window.setInterval(refresh, 1200);
}
async function loadRecent() {
  const orders: Order[] = await request("/api/orders");
  $("order-count").textContent = String(orders.length);
  const body = $("recent-orders");
  if (!orders.length) return;
  body.replaceChildren();
  for (const order of orders.slice(0, 8)) {
    const tr = document.createElement("tr"),
      td = document.createElement("td"),
      button = text("button", `#${order.id.slice(0, 8)}`, "order-link");
    button.onclick = () => {
      tab("orders");
      void selectOrder(order.id);
    };
    td.append(button);
    const nets = document.createElement("td");
    nets.append(text("span", "SOL", "net-tag"), text("span", "ADA", "net-tag"));
    const status = document.createElement("td");
    status.append(
      text(
        "span",
        order.status.toUpperCase(),
        `pill ${order.status === "settled" ? "green" : order.status === "rejected" ? "red" : "neutral"}`,
      ),
    );
    tr.append(
      td,
      nets,
      text("td", "0.01 tSOL / 2 tADA"),
      status,
      text(
        "td",
        new Date(order.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      ),
    );
    body.append(tr);
  }
}
async function run() {
  const button = $<HTMLButtonElement>("create-order");
  button.disabled = true;
  $("form-error").textContent = "";
  try {
    const input = {
      solanaWallet: $<HTMLInputElement>("solana").value.trim(),
      cardanoWallet: $<HTMLInputElement>("cardano").value.trim(),
      scenario: $<HTMLSelectElement>("scenario").value,
    };
    const payload: any = { input };
    if (health?.mode === "live") {
      if (!wallet) throw new Error("Connect a Devnet wallet first.");
      payload.buyer = wallet.publicKey.toString();
    }
    const data = await request("/api/orders", payload);
    let start: any = {};
    if (data.funding) {
      const { Transaction } = await import("@solana/web3.js");
      const bytes = Uint8Array.from(atob(data.funding.transaction), (c) =>
        c.charCodeAt(0),
      );
      const transaction = Transaction.from(bytes);
      const signed = await wallet.signAndSendTransaction(transaction);
      const { Connection } = await import("@solana/web3.js");
      const confirmation = await new Connection(
        "https://api.devnet.solana.com",
        "confirmed",
      ).confirmTransaction(
        {
          signature: signed.signature,
          blockhash: transaction.recentBlockhash!,
          lastValidBlockHeight: data.funding.lastValidBlockHeight,
        },
        "confirmed",
      );
      if (confirmation.value.err)
        throw new Error("Funding transaction failed.");
      const signature = await wallet.signMessage(
        new TextEncoder().encode(`Start Orca order ${data.order.id}`),
        "utf8",
      );
      start = {
        fundingTx: signed.signature,
        signature: btoa(String.fromCharCode(...signature.signature)),
      };
    }
    await request(`/api/orders/${data.order.id}/start`, start);
    tab("orders");
    await selectOrder(data.order.id);
    await loadRecent();
    return { orderId: data.order.id, mode: data.order.mode };
  } catch (e) {
    $("form-error").textContent = (e as Error).message;
    throw e;
  } finally {
    button.disabled = false;
  }
}
$("order-form").onsubmit = (e) => {
  e.preventDefault();
  void run().catch(() => {});
};
$("refund").onclick = async () => {
  if (!current) return;
  try {
    if (current.mode === "live") {
      const data = await request(
        `/api/orders/${current.id}/refund-transaction`,
      );
      const { Transaction, Connection } = await import("@solana/web3.js");
      const transaction = Transaction.from(
        Uint8Array.from(atob(data.transaction), (c) => c.charCodeAt(0)),
      );
      const signed = await wallet.signAndSendTransaction(transaction);
      const confirmation = await new Connection(
        "https://api.devnet.solana.com",
        "confirmed",
      ).confirmTransaction(
        {
          signature: signed.signature,
          blockhash: transaction.recentBlockhash!,
          lastValidBlockHeight: data.lastValidBlockHeight,
        },
        "confirmed",
      );
      if (confirmation.value.err) throw new Error("Refund transaction failed.");
    }
    await request(`/api/orders/${current.id}/refund`, {});
    await selectOrder(current.id);
  } catch (e) {
    $("form-error").textContent = (e as Error).message;
  }
};
$("export").onclick = async () => {
  if (!current) return;
  const evidence = await request(`/api/orders/${current.id}/evidence`);
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(evidence, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `orca-order-${current.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
async function init() {
  try {
    health = await request("/health");
    if (health.mode === "live") {
      $("mode-notice").replaceChildren(
        text("span", "LIVE TESTNET", "pill green"),
        text(
          "span",
          "Solana Devnet escrow · Cardano preprod payments · mainnet report data",
        ),
      );
      $("create-order").textContent = "Fund & run task →";
      $("scenario").hidden = true;
      document
        .querySelector('label[for="scenario"]')
        ?.setAttribute("hidden", "");
      $("sample").hidden = true;
    }
    const roles: Record<string, string> = {
      "Solana escrow":
        "Funding, spending ceiling, settlement and expiry refund.",
      "Cardano x402":
        "The agent buys the reporting resource using preprod ADA.",
      NOWNodes: "Confirmed Solana and Cardano mainnet transaction facts.",
      "Chainlink CRE":
        "Independent verification through a real local workflow simulation.",
    };
    for (const i of health.integrations) {
      const card = text("article", "", "integration");
      card.append(
        text("h3", i.name),
        text(
          "span",
          i.ready ? "CONFIGURED" : "SETUP REQUIRED",
          `pill ${i.ready ? "blue" : "amber"}`,
        ),
        text("p", roles[i.name]),
        text("p", i.detail),
      );
      $("integrations").append(card);
    }
    await loadRecent();
    const id = localStorage.getItem("orca-current-order");
    if (id) await selectOrder(id);
  } catch {
    $("form-error").textContent =
      "Order service is unavailable. Start the API or reconnect the hosted service.";
  }
}
void init();
// Tools share the visible actions; unsupported browsers leave the UI unaffected.
const context = (document as any).modelContext;
if (context?.registerTool) {
  const lifecycle = new AbortController();
  window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
  for (const tool of [
    {
      name: "read_selected_order",
      description: "Read the currently selected order and its execution mode.",
      inputSchema: { type: "object", additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: () =>
        current
          ? { id: current.id, status: current.status, mode: current.mode }
          : null,
    },
    {
      name: "run_rehearsal_order",
      description:
        "Create and run a sample order in rehearsal mode. No chain transaction or asset movement.",
      inputSchema: {
        type: "object",
        properties: {
          scenario: { type: "string", enum: ["success", "tampered", "expiry"] },
        },
        required: ["scenario"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: async (input: any) => {
        if (
          health?.mode !== "rehearsal" ||
          !["success", "tampered", "expiry"].includes(input?.scenario) ||
          Object.keys(input).length !== 1
        )
          throw new Error("Invalid rehearsal input");
        ($("solana") as HTMLInputElement).value = sampleSol;
        ($("cardano") as HTMLInputElement).value = sampleAda;
        ($("scenario") as HTMLSelectElement).value = input.scenario;
        return run();
      },
    },
  ]) {
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {}
  }
}
