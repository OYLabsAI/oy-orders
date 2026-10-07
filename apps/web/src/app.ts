declare const __API_URL__: string;
import solanaLogo from "./assets/solana.svg";
import cardanoLogo from "./assets/cardano.svg";
import { initShop } from "./shop.ts";
import {
  buttonActivity,
  canRetry,
  pollForResult,
  RequestError,
  startActivity,
} from "./activity.ts";
import { partnerLogos, technologyLogo } from "./brands.ts";
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
type SavedEvidence = {
  order: Order;
  events: Event[];
  creTranscript: string;
  refund: { rewardLamports: string; refundTx: string; scope: string };
  adversarial?: {
    order: Order;
    finalOrder?: Order;
    events: Event[];
    sourceFacts: import("../../../packages/core/src/types.ts").SourceFact[];
    creTranscript: string;
    protectedReward: { escrowState: number; settlementSubmitted: boolean };
    refund?: { refundTx: string; confirmed: boolean; rewardLamports: string };
  };
};
let savedEvidence: SavedEvidence | undefined,
  archived = false,
  serviceAvailable = false,
  selection = 0;
let archivedEvidence: unknown;
let storyStage: "success" | "lie" | "refund" = "success";
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
async function request(path: string, body?: unknown, timeout = 25000) {
  const response = await fetch(`${api}${path}`, {
    ...(body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
    signal: AbortSignal.timeout(timeout),
  });
  const data = await response.json().catch(() => {
    throw new RequestError(
      `HTTP ${response.status}`,
      response.ok ? 502 : response.status,
    );
  });
  if (!response.ok)
    throw new RequestError(
      data.error ?? `HTTP ${response.status}`,
      response.status,
    );
  return data;
}
function tab(name: string) {
  document.body.dataset.view = name;
  for (const n of [
    "shop",
    "orders",
    "evidence",
    "integrations",
    "live-challenge",
  ]) {
    $(`${n}-view`).hidden = n !== name;
    document
      .querySelector(`[data-tab="${n}"]`)
      ?.classList.toggle("active", n === name);
  }
  $("page-name").textContent = (
    {
      shop: "OY Shop",
      evidence: "See the demo",
      "live-challenge": "Try a fake answer",
      orders: "Wallet report",
      integrations: "How it works",
    } as Record<string, string>
  )[name];
  $("wallet").hidden = name !== "orders";
}
document
  .querySelectorAll<HTMLButtonElement>("[data-tab]")
  .forEach(
    (b) =>
      (b.onclick = () =>
        b.dataset.tab === "evidence" && savedEvidence
          ? showSavedEvidence()
          : tab(b.dataset.tab!)),
  );
$("sample").onclick = () => {
  ($("solana") as HTMLInputElement).value =
    health?.mode === "live" && savedEvidence
      ? savedEvidence.order.input.solanaWallet
      : sampleSol;
  ($("cardano") as HTMLInputElement).value =
    health?.mode === "live" && savedEvidence
      ? savedEvidence.order.input.cardanoWallet
      : sampleAda;
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
            funded: "Your reward is held safely",
            reserved: "Report price agreed",
            purchasing: "Worker buys the report",
            paid: "Report purchase confirmed",
            verifying: "Checker compares the answer with real records",
            settled: "Correct work: reward paid",
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
      order.solana?.refundTx
        ? "Reward returned"
        : order.solana?.settleTx
          ? "Reward released"
          : "Task reward held",
      order.solana?.fundingTx
        ? `https://explorer.solana.com/tx/${order.solana.refundTx ?? order.solana.settleTx ?? order.solana.fundingTx}?cluster=devnet`
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
    card.append(
      technologyLogo(name, 24),
      text("small", name),
      text("strong", detail),
    );
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
    archived && storyStage !== "success" && savedEvidence?.adversarial
      ? savedEvidence.adversarial.sourceFacts
      : order.report!.facts,
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
        c.passed
          ? "Matches signed evidence"
          : c.name === "Source provenance"
            ? "Claim disagrees with independent records"
            : "Changed report no longer matches receipt",
      ),
    );
    checks.append(row);
  }
  const toggle = $("challenge-toggle");
  toggle.textContent = altered ? "Restore supplier report" : "Alter one fee +1";
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
function showSavedEvidence(
  stage: "success" | "lie" | "refund" = "success",
  preserveView = false,
) {
  if (!savedEvidence) return;
  const attack = savedEvidence.adversarial;
  if (stage !== "success" && !attack) return;
  if (stage === "refund" && !attack?.refund?.confirmed) return;
  storyStage = stage;
  selection++;
  if (poll) clearInterval(poll);
  archived = true;
  const order =
    stage === "success"
      ? savedEvidence.order
      : stage === "refund"
        ? attack!.finalOrder!
        : attack!.order;
  archivedEvidence = stage === "success" ? savedEvidence : attack;
  renderOrder(order);
  renderEvents(stage === "success" ? savedEvidence.events : attack!.events);
  $("story-outcome").hidden = false;
  for (const [id, value] of [
    ["verified-demo", "success"],
    ["signed-lie", "lie"],
    ["refund-story", "refund"],
  ]) {
    $(id).classList.toggle("active", stage === value);
    $(id).setAttribute("aria-pressed", String(stage === value));
  }
  $("story-outcome").className = `story-outcome ${stage}`;
  $("story-kicker").textContent =
    stage === "success"
      ? "COMPLETED TASK · CORRECT ANSWER"
      : stage === "lie"
        ? "DELIBERATELY WRONG REPORT · CAUGHT"
        : "SAME FAILED TASK · REWARD RETURNED";
  $("story-title").textContent =
    stage === "success"
      ? "The answer checked out.\nThe worker got paid."
      : stage === "lie"
        ? "Wrong answer.\nReward stayed locked."
        : "Deadline passed.\nYour reward came back.";
  $("story-detail").textContent =
    stage === "success"
      ? "The worker bought a report about two crypto accounts. A separate checker compared its numbers with the real records. They matched, so the worker received the reward."
      : stage === "lie"
        ? "We tested a report with a made-up transaction fee: over 1,000 times the real cost. The checker caught the wrong number, so the worker could not collect the reward."
        : "The wrong report never earned the reward. After the task’s deadline, the buyer reclaimed that same reward. This is the confirmed refund from the failed task.";
  $("story-amount-label").textContent =
    stage === "success"
      ? "Reward paid to the worker"
      : stage === "lie"
        ? "Worker’s reward stays locked"
        : "Your reward was returned";
  $("story-money-note").textContent =
    "Test coins, not cash. The separate 2 tADA report purchase stays spent; only this reward can be refunded.";
  const rows =
    stage === "success"
      ? ([
          ["Report was bought", true],
          ["Numbers match the original records", true],
          ["Worker received the reward", true],
        ] as const)
      : stage === "lie"
        ? ([
            [
              "Report really came from the seller",
              !!order.verification?.checks.find(
                (c) => c.name === "Seller signature",
              )?.passed,
            ],
            ["Report’s number matches the real fee", false],
            [
              "Worker could not collect the reward",
              attack!.protectedReward.escrowState === 1 &&
                !attack!.protectedReward.settlementSubmitted,
            ],
          ] as const)
        : ([
            ["Wrong answer rejected", !order.verification?.accepted],
            ["Original deadline passed", true],
            ["Reward refund confirmed", !!attack!.refund?.confirmed],
          ] as const);
  $("story-checks").replaceChildren();
  for (const [label, passed] of rows) {
    const row = text("div", "", `story-check ${passed ? "pass" : "fail"}`);
    row.append(
      text("span", passed ? "✓" : "×", "check-icon"),
      text("span", label),
    );
    $("story-checks").append(row);
  }
  const signature =
    stage === "refund"
      ? attack!.refund?.refundTx
      : stage === "success"
        ? order.solana?.settleTx
        : order.solana?.fundingTx;
  $("story-proof-link").hidden = !signature;
  $("story-proof-link").setAttribute(
    "href",
    `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  );
  $("story-proof-link").textContent =
    stage === "refund"
      ? "View confirmed refund"
      : stage === "success"
        ? "View confirmed reward"
        : "See where the reward is held";
  $("archive-notice").hidden = false;
  $("archive-notice").textContent =
    `These three buttons show completed tasks with real test-coin payments. Clicking them does not start a new payment or check. ${stage === "success" ? "Want a fresh check? Open Try a fake answer." : "We deliberately created the wrong report to test the protection. The refund test used an eight-minute deadline; new tasks use fifteen minutes."}`;
  const refund = savedEvidence.refund;
  $("refund-proof").hidden = stage !== "success";
  $("refund-proof-detail").textContent =
    `${Number(refund.rewardLamports) / 1e9} tSOL returned after expiry in a separate 90-second program probe. No Cardano purchase in that probe.`;
  $("refund-proof-link").setAttribute(
    "href",
    `https://explorer.solana.com/tx/${refund.refundTx}?cluster=devnet`,
  );
  if (!preserveView) tab("evidence");
}
$("verified-demo").onclick = () => showSavedEvidence();
$("signed-lie").onclick = () => showSavedEvidence("lie");
$("refund-story").onclick = () => showSavedEvidence("refund");
function renderOrder(order: Order) {
  current = order;
  if (!archived) {
    $("story-outcome").hidden = true;
    $("archive-notice").hidden = true;
  }
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
              ? "Independent checks failed. The task reward stays protected."
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
  const selected = ++selection;
  archived = false;
  $("archive-notice").hidden = true;
  $("refund-proof").hidden = true;
  if (poll) clearInterval(poll);
  const refresh = async () => {
    try {
      const [order, events] = await Promise.all([
        request(`/api/orders/${id}`),
        request(`/api/orders/${id}/events`),
      ]);
      if (selected !== selection) return;
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
  renderRecent(orders);
}
function renderRecent(orders: Order[]) {
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
      text("td", order.mode === "live" ? "Live testnet" : "Rehearsal"),
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
function renderIntegrations(
  items: { name: string; ready: boolean; detail: string; recorded?: boolean }[],
) {
  const roles: Record<string, string> = {
    "Solana escrow":
      "Holds the reward, pays after approval, and allows a refund after the deadline.",
    "Cardano x402": "The report’s checkout: the worker pays to buy the data.",
    NOWNodes:
      "Provides the original transaction records to compare with the report.",
    "Chainlink CRE":
      "Runs the separate checker. This prototype uses official workflow simulation.",
  };
  $("integrations").replaceChildren();
  for (const i of items) {
    const card = text("article", "", "integration");
    const logoName = i.name.startsWith("Solana")
      ? "Solana"
      : i.name.startsWith("Cardano")
        ? "Cardano"
        : i.name;
    if (partnerLogos[logoName]) {
      card.append(technologyLogo(logoName, 32));
    }
    card.append(
      text("h3", i.name),
      text(
        "span",
        i.recorded
          ? "RECORDED PROOF"
          : i.ready
            ? "CONFIGURED"
            : "SETUP REQUIRED",
        `pill ${i.ready || i.recorded ? "blue" : "amber"}`,
      ),
      text("p", roles[i.name]),
      text("p", i.detail),
    );
    $("integrations").append(card);
  }
}
async function run() {
  const button = $<HTMLButtonElement>("create-order");
  button.disabled = true;
  $("form-error").textContent = "";
  try {
    if (!serviceAvailable)
      throw new Error(
        "Live service is offline. Explore the saved verified demo.",
      );
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
        new TextEncoder().encode(`Start OY order ${data.order.id}`),
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
$("audit-invite").onclick = () => tab("live-challenge");
$("audit-refund-story").onclick = () => showSavedEvidence("refund");
let latestAudit: any;
let auditBusy = false;
// Show fees in familiar coin units without rounding away a one-unit error.
function auditAmount(network: string, field: string, value: string) {
  if (field !== "fee" || !/^\d+$/.test(value)) return value;
  const decimals = network.startsWith("solana") ? 9 : 6;
  const digits = value.padStart(decimals + 1, "0");
  const fraction = digits.slice(-decimals).replace(/0+$/, "");
  return `${digits.slice(0, -decimals)}${fraction ? "." + fraction : ""} ${decimals === 9 ? "SOL" : "ADA"}`;
}
function checkingLogo(network: string) {
  const orbit = text("span", "", "arena-orbit");
  const image = document.createElement("img");
  image.src = network === "cardano" ? cardanoLogo : solanaLogo;
  image.alt = network === "cardano" ? "Cardano" : "Solana";
  image.className = "network-logo";
  orbit.append(image);
  return orbit;
}
function showAuditReady() {
  if (auditBusy) return;
  const panel = $("audit-result");
  panel.className = "arena-result ready";
  panel.replaceChildren(
    checkingLogo($<HTMLSelectElement>("audit-network").value),
    text("h3", "Does the report\nmatch the real record?"),
    text("p", "Pick an answer on the left. Then check it."),
  );
  $("audit-evidence").hidden = true;
  latestAudit = undefined;
}
$("audit-network").onchange = showAuditReady;
document
  .querySelectorAll<HTMLInputElement>('input[name="audit-change"]')
  .forEach((input) => {
    input.onchange = showAuditReady;
  });
showAuditReady();
$("audit-run").onclick = async () => {
  if (auditBusy) return;
  auditBusy = true;
  const button = $<HTMLButtonElement>("audit-run");
  button.disabled = true;
  buttonActivity(button, true, "Checking your answer…");
  const network = $<HTMLSelectElement>("audit-network");
  const selectedNetwork = network.value;
  network.disabled = true;
  $<HTMLFieldSetElement>("audit-options").disabled = true;
  $("audit-evidence").hidden = true;
  const panel = $("audit-result");
  panel.className = "arena-result checking";
  panel.replaceChildren(
    checkingLogo(selectedNetwork),
    text("h3", "Checking the real records…"),
    text(
      "p",
      "The checker is getting the original transaction records and comparing the fees. This usually takes 20–90 seconds.",
    ),
  );
  const progress = text("div", "");
  panel.append(progress);
  const activity = startActivity(progress, {
    title: "Getting the original records",
    detail:
      "First we fetch the real transaction, then the independent checker compares your answer. No money moves in this check.",
  });
  try {
    // A retry of an interrupted audit reads the existing job rather than
    // creating another job while the first one is still running.
    if (!latestAudit || !["queued", "running"].includes(latestAudit.status))
      latestAudit = await request("/api/challenges", {
        network: selectedNetwork,
        change: document.querySelector<HTMLInputElement>(
          'input[name="audit-change"]:checked',
        )!.value,
      });
    const auditId = latestAudit.id;
    latestAudit = await pollForResult<any>({
      read: () => request(`/api/challenges/${auditId}`),
      pending: (audit) => ["queued", "running"].includes(audit.status),
      interval: 2500,
      timeout: 210000,
      onValue: (audit) => {
        latestAudit = audit;
        activity.update(
          audit.status === "queued"
            ? "Waiting for the independent checker"
            : "Independent checker is running",
          "Your check is saved. Waiting for its actual result; you don’t need to click again.",
        );
      },
      onRetry: () =>
        activity.update(
          "Reconnecting to your check",
          "A connection was missed. Retrying the same check automatically; no extra check is being created.",
        ),
    });
    if (latestAudit.status !== "complete")
      throw Error(
        latestAudit.error ??
          "The checker could not finish this run. Try again or open the recorded proof.",
      );
    const result = latestAudit.result;
    panel.className = `arena-result ${result.accepted ? "honest" : "caught"}`;
    panel.replaceChildren(
      text("span", result.accepted ? "✓" : "!", "arena-orbit"),
      text(
        "small",
        "JUST VERIFIED · " + new Date(result.timestamp).toLocaleTimeString(),
      ),
      text(
        "h3",
        result.accepted ? "The numbers match." : "Wrong number.\nCaught.",
      ),
      text(
        "p",
        result.accepted
          ? "Both reported fees match the original records. In a paid task, passing every check lets the worker collect the reward."
          : "The report’s fee does not match the real transaction. In a paid task, this would keep the reward locked. This free check moves no money.",
      ),
    );
    for (const difference of result.differences) {
      const comparison = text("div", "", "truth-comparison");
      const value = (label: string, amount: string) => {
        const column = text("div", "");
        column.append(
          text("small", label),
          text(
            "strong",
            auditAmount(difference.network, difference.field, amount),
          ),
        );
        return column;
      };
      comparison.append(
        value("REPORT SAYS", difference.claimed),
        text("span", "≠"),
        value("REAL RECORD SAYS", difference.actual),
      );
      panel.append(
        comparison,
        text(
          "small",
          `${difference.network.startsWith("solana") ? "Solana" : "Cardano"} · transaction fee = the cost of sending crypto`,
        ),
      );
    }
    if (!result.accepted && result.differences.length) {
      const repair = text(
        "button",
        "Now try the correct fee →",
        "button secondary small",
      );
      repair.onclick = () => {
        const honest = document.querySelector<HTMLInputElement>(
          'input[name="audit-change"][value="honest"]',
        )!;
        honest.checked = true;
        $("audit-run").click();
      };
      panel.append(repair);
    }
    const checks = $("audit-checks");
    checks.replaceChildren();
    for (const check of result.checks) {
      const item = text("div", "", "check " + (check.passed ? "pass" : "fail"));
      item.append(
        text("strong", (check.passed ? "✓ " : "× ") + check.name),
        text("p", check.detail),
      );
      checks.append(item);
    }
    $("audit-transcript").textContent = latestAudit.transcript;
    $("audit-evidence").hidden = false;
  } catch (error) {
    panel.className = "arena-result unavailable";
    const stillRunning =
      latestAudit && ["queued", "running"].includes(latestAudit.status);
    panel.replaceChildren(
      text("span", "!", "arena-orbit"),
      text(
        "h3",
        stillRunning
          ? "Still waiting for your check."
          : "We couldn’t check it yet.",
      ),
      text(
        "p",
        (
          {
            CHALLENGE_BUSY:
              "The verifier is checking another claim. Try again in a moment.",
            CHALLENGE_DAILY_LIMIT:
              "Today’s demonstration limit is reached. Open the recorded proof.",
            LIVE_BACKEND_UNAVAILABLE:
              "The cloud service is waking up. Try again in a moment.",
            LIVE_SOURCE_UNAVAILABLE:
              "The node provider has no readable recent transaction. Try again in a moment; we never approve missing evidence.",
            CHECK_STILL_RUNNING:
              "The check is taking longer than expected. Reconnect to this same check, or watch the recorded demo while it finishes.",
          } as Record<string, string>
        )[(error as Error).message] ??
          (canRetry(error)
            ? "The connection was interrupted. No answer has been confirmed. Reconnect or watch a completed demo."
            : "The checker couldn’t finish this request. Try again or watch a completed demo."),
      ),
      text("p", "You can still watch completed tasks in See the demo."),
    );
    const recorded = text(
      "button",
      "Watch the completed demo →",
      "button secondary small",
    );
    recorded.onclick = () =>
      savedEvidence ? showSavedEvidence() : tab("evidence");
    panel.append(recorded);
  } finally {
    activity.stop();
    auditBusy = false;
    buttonActivity(button, false);
    button.disabled = false;
    const pending =
      latestAudit && ["queued", "running"].includes(latestAudit.status);
    network.disabled = !!pending;
    $<HTMLFieldSetElement>("audit-options").disabled = !!pending;
    button.textContent = pending
      ? "Reconnect to this check →"
      : latestAudit?.status === "complete"
        ? "Check another answer →"
        : "Try this check again →";
  }
};
$("audit-download").onclick = () => {
  if (!latestAudit) return;
  const href = URL.createObjectURL(
    new Blob([JSON.stringify(latestAudit, null, 2)], {
      type: "application/json",
    }),
  );
  const link = document.createElement("a");
  link.href = href;
  link.download = `oy-challenge-${latestAudit.id}.json`;
  link.click();
  URL.revokeObjectURL(href);
};
$("refund").onclick = async () => {
  if (!current) return;
  try {
    if (current.mode === "live") {
      if (!wallet || wallet.publicKey?.toString() !== current.buyer)
        throw new Error(
          "Connect the original buyer wallet to refund this task.",
        );
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
  const evidence = archived
    ? archivedEvidence
    : await request(`/api/orders/${current.id}/evidence`);
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(evidence, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `oy-order-${current.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
let connection: AbortController | undefined;
async function connectLive() {
  connection?.abort();
  const controller = new AbortController();
  connection = controller;
  $("connection-status").dataset.state = "connecting";
  $("connection-copy").textContent = "Connecting to the live demo…";
  $("connection-retry").hidden = true;
  try {
    health = await pollForResult<any>({
      read: async () => {
        const result = await request("/health", undefined, 15000);
        if (!result.ok) throw new RequestError("INVALID_HEALTH_RESPONSE", 502);
        return result;
      },
      pending: () => false,
      signal: controller.signal,
      onValue: () => {},
      onRetry: () => {
        serviceAvailable = false;
        $("connection-status").dataset.state = "reconnecting";
        $("connection-copy").textContent =
          "Reconnecting automatically. Your saved checkout is kept.";
        $("connection-retry").hidden = false;
        $("mode-notice").replaceChildren(
          text("span", "RECONNECTING", "pill amber"),
          text(
            "span",
            "The live service has not replied yet. We’ll retry automatically; recorded proof is available in See the demo.",
          ),
        );
        $("create-order").setAttribute("disabled", "");
        $("wallet").setAttribute("disabled", "");
      },
    });
    serviceAvailable = true;
    $("connection-status").dataset.state = "connected";
    $("connection-copy").textContent =
      health.mode === "live"
        ? "Live service connected · Test coins only"
        : "Rehearsal service connected · No real payments";
    $("connection-retry").hidden = true;
    $("create-order").removeAttribute("disabled");
    $("wallet").removeAttribute("disabled");
    if (health.mode === "live") {
      $("mode-notice").replaceChildren(
        text("span", "TEST COINS ONLY", "pill green"),
        text(
          "span",
          "Real records. Demo payments use test coins with no cash value.",
        ),
      );
      $("create-order").textContent = "Set the reward & start";
      $("scenario").hidden = true;
      document
        .querySelector('label[for="scenario"]')
        ?.setAttribute("hidden", "");
      $("sample").textContent = "Fill in example accounts";
      $("sample").hidden = !savedEvidence;
    }
    renderIntegrations(health.integrations);
    // Task history is optional: failure here must not mark a healthy service offline.
    await loadRecent().catch(() => {
      if (savedEvidence) renderRecent([savedEvidence.order]);
    });
  } catch {
    if (controller.signal.aborted) return;
    serviceAvailable = false;
    $("connection-status").dataset.state = "reconnecting";
    $("connection-copy").textContent =
      "Live connection unavailable. Reconnect or view the recorded demo.";
    $("connection-retry").hidden = false;
    $("create-order").setAttribute("disabled", "");
    $("wallet").setAttribute("disabled", "");
  }
}
$("connection-retry").onclick = () => void connectLive();
async function init() {
  // Historical evidence loads independently from the live connection.
  const proof = fetch("/proof.json")
    .then(async (r) => {
      if (!r.ok) throw new Error("SAVED_PROOF_UNAVAILABLE");
      savedEvidence = await r.json();
      if (
        savedEvidence?.order.mode !== "live" ||
        savedEvidence.order.status !== "settled"
      )
        throw new Error("INVALID_SAVED_PROOF");
      $("verified-demo").removeAttribute("disabled");
      if (
        savedEvidence.adversarial?.order.verification?.reason ===
        "Source provenance"
      )
        $("signed-lie").removeAttribute("disabled");
      if (
        savedEvidence.adversarial?.refund?.confirmed &&
        savedEvidence.adversarial.finalOrder?.status === "refunded"
      )
        $("refund-story").removeAttribute("disabled");
      showSavedEvidence("success", true);
      if (health?.mode === "live") $("sample").hidden = false;
      if (!serviceAvailable) renderRecent([savedEvidence.order]);
    })
    .catch(() => {
      savedEvidence = undefined;
    });
  await Promise.allSettled([proof, connectLive()]);
}
initShop({ request, showPage: () => tab("shop") });
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
