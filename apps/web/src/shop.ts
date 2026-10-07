import QRCode from "qrcode";
import { technologyBadge } from "./brands.ts";
import type { ShoppingPlan } from "../../../packages/core/src/types.ts";

type Checkout = {
  checkoutId: string;
  orderId: string;
  status: string;
  token?: string;
  usedAt: number | null;
  createdAt: number;
  error?: string;
  shopping?: ShoppingPlan;
  proof: {
    fundingTx?: string;
    cardanoTx?: string;
    settleTx?: string;
    resultHash?: string;
  };
  verification?: {
    accepted: boolean;
    checks: { name: string; passed: boolean }[];
  };
};
type Access = { idempotencyKey: string; accessKey: string };
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const text = (tag: string, value: string) => {
  const element = document.createElement(tag);
  element.textContent = value;
  return element;
};
const storageKey = "oy-coffee-checkout-v1";
const terminal = ["settled", "blocked", "rejected", "expired", "refunded"];
const roles = [
  {
    name: "Solana",
    title: "Protect the payment",
    detail:
      "Our Devnet program holds 0.01 tSOL and releases it after verified delivery.",
    target: "shop-step-pay",
  },
  {
    name: "Cardano",
    title: "Let the agent buy",
    detail:
      "The agent pays 2 tADA via x402 for the supplier-signed digital pass.",
    target: "shop-step-check",
  },
  {
    name: "Chainlink CRE",
    title: "Check before paying out",
    detail:
      "An official CRE simulation checks the purchase, the pass commitment, and the escrow.",
    target: "shop-step-check",
  },
  {
    name: "NOWNodes",
    title: "Read the real chain records",
    detail:
      "Its Cardano preprod RPC independently checks the supplier payment. The fake-answer demo also reads both networks.",
    target: "shop-proof-roles",
  },
];

export function initShop({
  request,
  showPage,
}: {
  request: (path: string, body?: unknown, timeout?: number) => Promise<any>;
  showPage: () => void;
}) {
  let access: Access | undefined;
  let current: Checkout | undefined;
  let polling: ReturnType<typeof setTimeout> | undefined;
  let busy = false;
  let qrUrl = "";
  let ticketLink = "";
  let selectedPlan: ShoppingPlan | undefined;
  const reasons: Record<string, string> = {
    INVALID_SIGNATURE: "Fake price caught · changed after signing",
    WRONG_ITEM: "Wrong item · you asked for coffee",
    PRICE_EXCEEDS_CEILING: "Over your budget · refused",
    MATCHES_GOAL_AND_BUDGET: "Matches your goal and budget",
  };
  function renderPlan(plan: ShoppingPlan, purchased = false) {
    const offers = $("shop-offers");
    offers.replaceChildren();
    for (const [index, offer] of plan.offers.entries()) {
      const decision = plan.decisions[index],
        card = text("article", "");
      card.className = "mission-offer";
      card.dataset.accepted = String(decision.accepted);
      card.dataset.selected = String(index === plan.selected);
      const price = `${Number(offer.quote.amount) / 1000000} test ADA`;
      card.append(
        text("small", index === plan.selected ? "✓ SELECTED" : "× REFUSED"),
        text("h3", offer.label),
        text("strong", price),
        text(
          "p",
          reasons[decision.reason] ?? "Offer does not meet your mission",
        ),
      );
      offers.append(card);
    }
    $("shop-plan-summary").dataset.accepted = String(plan.selected !== null);
    $("shop-plan-summary").textContent =
      plan.selected === null
        ? "Budget respected. No matching deal. No purchase authorized. No coins spent on this comparison."
        : `${purchased ? "This checkout selected" : "Agent found"} the matching pass for 2 test ADA. ${purchased ? "The signed decision is bound to this order." : "Three bad deals refused. Ready to buy within your budget."}`;
    $("shop-offer-json").textContent = JSON.stringify(plan, null, 2);
    $("shop-offer-proof").hidden = false;
    if (!current?.token && !busy) {
      $("shop-buy").toggleAttribute("disabled", plan.selected === null);
      $("shop-buy").textContent =
        plan.selected === null
          ? "No deal fits this budget"
          : "Let the agent buy it ↗";
    }
    return plan;
  }
  $("shop-plan").onclick = async () => {
    if (busy) return;
    busy = true;
    selectedPlan = undefined;
    const budget = $<HTMLSelectElement>("shop-budget");
    const requestedBudget = budget.value;
    budget.disabled = true;
    $("shop-buy").setAttribute("disabled", "");
    const button = $("shop-plan");
    button.setAttribute("disabled", "");
    $("shop-plan-summary").textContent =
      "Checking signed prices, the item and your budget…";
    try {
      selectedPlan = renderPlan(
        await request("/api/shop/plan", {
          sku: "coffee-pass",
          budget: requestedBudget,
        }),
      );
    } catch (error) {
      $("shop-plan-summary").textContent = friendly(error);
    } finally {
      busy = false;
      budget.disabled = !!current && !terminal.includes(current.status);
      button.removeAttribute("disabled");
      if (!current?.token) {
        $("shop-buy").toggleAttribute(
          "disabled",
          !selectedPlan || selectedPlan.selected === null,
        );
        $("shop-buy").textContent = !selectedPlan
          ? "Compare offers first ↗"
          : selectedPlan.selected === null
            ? "No deal fits this budget"
            : "Let the agent buy it ↗";
      }
    }
  };
  $("shop-budget").onchange = () => {
    selectedPlan = undefined;
    $("shop-offers").replaceChildren();
    $("shop-offer-proof").hidden = true;
    $("shop-plan-summary").textContent =
      "New budget. Compare the offers again before buying.";
    if (!current?.token) {
      $("shop-buy").setAttribute("disabled", "");
      $("shop-buy").textContent = "Compare offers first ↗";
    }
  };
  try {
    access =
      JSON.parse(localStorage.getItem(storageKey) ?? "null") ?? undefined;
  } catch {}
  for (const role of roles) {
    const box = text("div", "");
    box.className = "shop-tech-role";
    box.append(
      technologyBadge(role.name),
      text("strong", role.title),
      text("p", role.detail),
    );
    $("shop-proof-roles").append(box);
    if (role.target !== "shop-proof-roles")
      $(role.target).append(technologyBadge(role.name));
  }
  const sourceBadge = technologyBadge("NOWNodes");
  $("shop-node-proof").append(
    technologyBadge("NOWNodes"),
    text("small", "Payment records independently checked"),
  );
  sourceBadge.title =
    "NOWNodes supplies the independent Cardano payment records.";
  $("shop-proof-links").before(sourceBadge);
  const stateText: Record<string, string> = {
    created: "Preparing your test payment…",
    funded: "Payment protected. The agent is finding your pass…",
    reserved: "Supplier price agreed. Buying your pass…",
    purchasing: "The agent is paying the supplier on Cardano…",
    paid: "Supplier paid. Checking your pass and the real payment records…",
    verifying: "Chainlink CRE is independently checking the delivery…",
    settled: "Your payment checked out. Your digital pass is ready.",
    blocked: "Checkout paused. No usable pass was issued.",
    rejected: "Delivery checks failed. No usable pass was issued.",
    expired: "Checkout expired. No usable pass was issued.",
    refunded: "Test payment refunded. No usable pass was issued.",
  };
  function friendly(error: unknown) {
    const message = error instanceof Error ? error.message : "";
    return (
      (
        {
          SHOP_DEMO_LIMIT:
            "Today’s five funded demos have been used. Explore the recorded demo instead.",
          SHOP_CHECKOUT_BUSY:
            "Another demo checkout is running. Try again after it finishes.",
          SHOP_LIVE_SETUP_REQUIRED:
            "Live checkout is unavailable. The recorded demo is still available.",
          PASS_NOT_FOUND: "This pass link is invalid or incomplete.",
          PASS_NOT_READY: "This pass has not passed its delivery checks yet.",
          SHOP_NO_MATCH:
            "No matching offer fits your budget. No purchase was created.",
          SHOP_INTENT_CHANGED:
            "Your saved checkout has a different budget. Reconnect to that checkout first.",
          SHOP_DEMO_WALLET_EMPTY:
            "The demo wallet needs more test SOL. No order or payment was created. You can still compare offers.",
        } as Record<string, string>
      )[message] ??
      "The live service could not complete this check. Your saved checkout can be retried safely."
    );
  }
  async function render(data: Checkout) {
    current = data;
    if (data.shopping) {
      $<HTMLSelectElement>("shop-budget").value = data.shopping.budget;
      selectedPlan = renderPlan(data.shopping, true);
    }
    $<HTMLSelectElement>("shop-budget").disabled = !terminal.includes(
      data.status,
    );
    $("shop-plan").toggleAttribute("disabled", !terminal.includes(data.status));
    $("shop-status").textContent = data.usedAt
      ? "This pass has been used once. A second scan is refused."
      : (data.error ?? stateText[data.status] ?? "Checking your order…");
    $("shop-status").dataset.status = data.status;
    for (const [id, done] of [
      ["shop-step-pay", !!data.proof.fundingTx],
      ["shop-step-check", !!data.token],
      ["shop-step-use", !!data.usedAt],
    ] as const)
      $(id).classList.toggle("done", done);
    $("shop-buy").hidden = !!data.token;
    $("shop-buy").toggleAttribute("disabled", !terminal.includes(data.status));
    if (!data.token && terminal.includes(data.status))
      $("shop-buy").textContent = "Start another demo checkout ↗";
    $("shop-pass-actions").hidden = !data.token;
    $("shop-node-proof").hidden = !data.proof.cardanoTx;
    $("shop-new").hidden = !data.usedAt;
    $("ticket-serial").textContent =
      `OY / ${data.orderId.slice(0, 8).toUpperCase()}`;
    $("ticket-state").textContent = data.token
      ? data.usedAt
        ? "USED · ONE GOOD MOMENT"
        : "READY TO USE · PAYMENT VERIFIED"
      : "CHECKOUT IN PROGRESS";
    $("ticket-use").textContent = data.usedAt
      ? `Used ${new Date(data.usedAt).toLocaleTimeString()}`
      : "One use · demo only";
    $("coffee-ticket").dataset.state = data.token
      ? data.usedAt
        ? "used"
        : "ready"
      : "pending";
    if (data.token) {
      ticketLink = `${location.origin}/#pass=${data.orderId}.${data.token}`;
      qrUrl = await QRCode.toDataURL(ticketLink, {
        margin: 1,
        width: 360,
        errorCorrectionLevel: "M",
        color: { dark: "#173b2b", light: "#ffffff" },
      });
      const img = document.createElement("img");
      img.src = qrUrl;
      img.alt = "QR code for this one-use demo pass";
      img.width = 112;
      img.height = 112;
      $("pass-qr").replaceChildren(img);
      $("pass-qr").title = "Anyone with this QR can use this demo pass.";
      $("shop-cashier").textContent = data.usedAt
        ? "Show the duplicate-scan test →"
        : "Open cashier view →";
    }
    const links = $("shop-proof-links");
    links.replaceChildren();
    for (const [label, tx, url] of [
      [
        "Solana payment protection",
        data.proof.fundingTx,
        "https://explorer.solana.com/tx/",
      ],
      [
        "Cardano supplier payment",
        data.proof.cardanoTx,
        "https://preprod.cardanoscan.io/transaction/",
      ],
      [
        "Solana payment released",
        data.proof.settleTx,
        "https://explorer.solana.com/tx/",
      ],
    ] as const)
      if (tx) {
        const link = document.createElement("a");
        link.textContent = `${label} ↗`;
        link.href = `${url}${tx}${url.includes("solana") ? "?cluster=devnet" : ""}`;
        link.target = "_blank";
        link.rel = "noopener";
        links.append(link);
      }
    if (data.verification)
      links.append(
        text(
          "strong",
          `${data.verification.checks.filter((c) => c.passed).length}/${data.verification.checks.length} delivery checks passed`,
        ),
      );
  }
  async function refresh() {
    if (!access) return;
    try {
      const data = await request("/api/shop/status", {
        checkoutId: access.idempotencyKey,
        accessKey: access.accessKey,
      });
      await render(data);
      if (!terminal.includes(data.status))
        polling = setTimeout(() => void refresh(), 4000);
    } catch (error) {
      $("shop-status").textContent = friendly(error);
      $("shop-buy").removeAttribute("disabled");
      $("shop-buy").textContent = "Reconnect to my checkout ↗";
    }
  }
  $("shop-buy").onclick = async () => {
    if (busy) return;
    busy = true;
    $("shop-buy").setAttribute("disabled", "");
    $("shop-status").textContent = "Starting your funded test checkout…";
    try {
      if (!access || (current && terminal.includes(current.status))) {
        const random = crypto.getRandomValues(new Uint8Array(32));
        access = {
          idempotencyKey: crypto.randomUUID(),
          accessKey: Array.from(random, (b) =>
            b.toString(16).padStart(2, "0"),
          ).join(""),
        };
        localStorage.setItem(storageKey, JSON.stringify(access));
      }
      const data = await request("/api/shop/checkout", {
        ...access,
        sku: "coffee-pass",
        budget: selectedPlan?.budget ?? current?.shopping?.budget ?? "2000000",
      });
      await render(data);
      if (polling) clearTimeout(polling);
      if (!terminal.includes(data.status))
        polling = setTimeout(() => void refresh(), 2500);
    } catch (error) {
      $("shop-status").textContent = friendly(error);
      $("shop-buy").removeAttribute("disabled");
    } finally {
      busy = false;
    }
  };
  function showCashier() {
    $("shop-cashier-panel").hidden = false;
    $("cashier-title").textContent = current?.usedAt
      ? "This coffee moment was used."
      : "One pass. One coffee.";
    $("cashier-detail").textContent =
      "The cashier checks the confirmed payment, then records one use. Anyone with this code can redeem this demo pass.";
    $("shop-redeem").textContent = current?.usedAt
      ? "Try this pass again →"
      : "Use this pass →";
    $("shop-cashier-panel").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "center",
    });
  }
  $("shop-cashier").onclick = showCashier;
  $("shop-redeem").onclick = async () => {
    if (!current?.token || busy) return;
    busy = true;
    $("shop-redeem").setAttribute("disabled", "");
    $("cashier-result").textContent = "Checking the payment and pass…";
    try {
      const result = await request("/api/shop/redeem", {
        orderId: current.orderId,
        token: current.token,
      });
      current.usedAt = result.usedAt;
      await render(current);
      $("cashier-title").textContent = result.accepted
        ? "Pass accepted. Coffee moment unlocked."
        : "Nice try. This pass was already used.";
      $("cashier-result").textContent = result.accepted
        ? "✓ FIRST SCAN ACCEPTED"
        : "× SECOND SCAN REFUSED";
      $("cashier-result").dataset.accepted = String(result.accepted);
      $("cashier-detail").textContent = result.accepted
        ? "One use recorded. Now try the same pass again and watch the duplicate get caught."
        : "The saved redemption record refused the second use. This QR cannot unlock another demo coffee.";
      $("shop-redeem").textContent = "Try this pass again →";
    } catch (error) {
      $("cashier-result").textContent = friendly(error);
    } finally {
      busy = false;
      $("shop-redeem").removeAttribute("disabled");
    }
  };
  $("shop-new").onclick = () => {
    current = undefined;
    access = undefined;
    qrUrl = "";
    ticketLink = "";
    localStorage.removeItem(storageKey);
    $("shop-buy").hidden = false;
    $("shop-buy").setAttribute("disabled", "");
    $("shop-buy").textContent = "Compare offers first ↗";
    selectedPlan = undefined;
    $("shop-offers").replaceChildren();
    $("shop-offer-proof").hidden = true;
    $<HTMLSelectElement>("shop-budget").disabled = false;
    $("shop-plan").removeAttribute("disabled");
    $("shop-plan-summary").textContent =
      "Give the agent a budget and compare the offers.";
    $("shop-pass-actions").hidden = true;
    $("shop-cashier-panel").hidden = true;
    $("ticket-state").textContent = "PREVIEW · NOT YET ISSUED";
    $("ticket-serial").textContent = "OY / ORIGINS / 2026";
    $("ticket-use").textContent = "One use · demo only";
    $("pass-qr").replaceChildren(text("span", "YOUR QR GOES HERE ↗"));
    $("shop-status").textContent =
      "Ready for a new funded test checkout. Up to five demos are available per day.";
    for (const id of ["shop-step-pay", "shop-step-check", "shop-step-use"])
      $(id).classList.remove("done");
    $("shop-mission").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  };
  $("shop-copy").onclick = async () => {
    if (!ticketLink) return;
    try {
      await navigator.clipboard.writeText(ticketLink);
      $("shop-copy").textContent = "Pass link copied ✓";
    } catch {
      $("shop-status").textContent = "Use Save my pass to keep the QR code.";
    }
  };
  $("shop-download").onclick = () => {
    if (!current?.token || !qrUrl) return;
    const serial = current.orderId.slice(0, 8).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><rect width="600" height="900" rx="38" fill="#d6e9db"/><circle cx="440" cy="170" r="230" fill="#eff7dc" opacity=".8"/><g fill="#173b2b" font-family="Arial"><text x="48" y="85" font-size="52" font-weight="700">OY</text><text x="48" y="121" font-size="18" letter-spacing="4">COFFEE CLUB</text><text x="48" y="275" font-size="58" font-weight="700">Your next</text><text x="48" y="342" font-size="58" font-weight="700">coffee moment.</text><text x="48" y="420" font-size="21">One use. Payment verified.</text><text x="48" y="455" font-size="17">Demo voucher only. No real coffee or admission.</text><text x="48" y="780" font-size="21">OY / ${serial}</text><text x="48" y="820" font-size="17">${current.usedAt ? "ALREADY USED" : "READY TO USE"}</text><text x="48" y="860" font-size="14">Anyone with this QR can use this demo pass.</text></g><path d="M0 520h600" stroke="#173b2b" stroke-dasharray="8 9" opacity=".3"/><image x="48" y="556" width="180" height="180" href="${qrUrl}"/></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `OY-Coffee-Pass-${serial}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const pass = location.hash.match(/^#pass=([a-f0-9-]{36})\.([a-f0-9]{64})$/);
  if (pass) {
    showPage();
    $("shop-buy").hidden = true;
    void request("/api/shop/pass", { orderId: pass[1], token: pass[2] })
      .then(async (data) => {
        await render(data);
        showCashier();
      })
      .catch((error) => {
        $("shop-status").textContent = friendly(error);
      });
  } else if (access) void refresh();
  window.addEventListener(
    "pagehide",
    () => {
      if (polling) clearTimeout(polling);
    },
    { once: true },
  );
}
