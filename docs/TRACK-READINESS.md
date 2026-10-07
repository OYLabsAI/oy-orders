# OY Orders: requirements review, 7 October 2026

All five official pages were reread in the browser on 7 October. The live retail pass and the reporting/fake-answer journey meaningfully use all four sponsors. Technical eligibility is distinct from an award: judges still evaluate execution, originality, usefulness and presentation.

## Exact mandatory requirements

| Entry | Required material / behavior | Current evidence | Remaining gap |
|---|---|---|---|
| Main event | Code built within the hackathon; meaningful partner use; judge-accessible GitHub repository; live URL; Drive `.ppt` or Keynote deck | Built from scratch during the event; first source commit 6 October 14:55 Singapore. Public Vercel app and real testnet flows. | GitHub publication; compliant stage deck with native movie playback; judge Drive access; final submission. |
| Solana | Functional Devnet or Mainnet app using deployed/existing programs, not reads alone; Program ID and cluster; example explorer transaction; README disclosure of reused work; GitHub; runnable demo | Custom Devnet escrow `2rdpj8fQHaZ7BbyaRFvZfHagJfT4QAWPrCUsC8LKobkj`; actual retail funding, reservation and settlement; actual refund from a rejected reporting order; compiled-program tests; funded no-wallet retail checkout. | Common repository/deck/access gates and closed partner RSVP. Program/transaction details must accompany the final source submission even though the dashboard has only three common fields. |
| Cardano | Working Cardano prototype; open-source repository/docs; demo video at most 3 minutes; short problem/technical/deployment write-up | Genuine exact x402 preprod purchase of the supplier-signed pass and reporting service. Payment is independently observed. Retail/security/deployment write-up saved; 87-second authentic-screen demo supplied. | Common repository/deck/access gates and closed partner RSVP. Public repository is the safest reading of the open-source requirement. |
| Chainlink CRE | CRE as an orchestration layer; blockchain plus an external API/system/data source/agent; successful official CLI simulation or live CRE deployment; execution evidence | Actual retail simulation passed 10/10 checks before settlement. Fresh false/corrected fee checks and paid rejection/refund evidence. | Common repository/deck/access gates and closed partner RSVP. DON deployment and confidential TEE workflow are optional and are not claimed. |
| NOWNodes | Account; at least one actual NOWNodes endpoint; working useful product; architecture explanation | Configured account/key; independent preprod payment observation. Reporting and fake-answer flows use both mainnets. Exact endpoint roles are documented and saved in the draft. | Common repository/deck/access gates and closed partner RSVP. |

Public retail execution: [order evidence](https://oy-orders.vercel.app/api/orders/29ab7330-93fa-4aef-b74e-02bca9495b3a/evidence). [RETAIL.md](RETAIL.md) explains the pass, separate costs and trust boundaries. Test coins suffice for the demonstrated prototype; extra mainnet funds are not a missing published requirement. Masumi/Sokosumi, NFTs, a currency bridge and production CRE deployment are not qualification requirements for our selected implementation.

## Administrative gates and the user's fastest help

1. **GitHub:** the user signed into the existing `nknwn-eth` account. The public `nknwn-eth/oy-orders` repository is created; uploading the audited local history awaits the local GitHub CLI device authorization. A public source ZIP or empty repository does not replace the required source repository.
2. **Partner RSVP:** main dashboard check-ins are **2/2**. Partner dashboards show attendance confirmed but **RSVP unchecked and closed**, producing **1/2**. On-site, ask the organizer to repair the partner RSVP/eligibility for all four selected tracks. Do not claim that a physical presence automatically updates it.
3. **Stage deck:** stage rules require a `.ppt` or Keynote file with the screen recording embedded; live stage demos and external video links are prohibited. The PPTX embeds the MP4. The legacy PPT visual backup drops it. Keynote is installed, but its first-run Continue accepts its Software License Agreement; the user must complete that step. Then convert to native Keynote and verify playback, or obtain explicit organizer acceptance of PPTX. No native playback is claimed before it is checked.
4. **Drive access:** the updated PPTX, MP4 and source ZIP now have read-only access for anyone with the link, verified in Drive. The legacy PPT is a visual backup only. The eventual native Keynote deck also needs judge-readable access. The independent Vercel downloads work publicly.
5. **Final submission:** draft fields can be updated before the deadline. Submit the main entry and all four partner entries together with the user, inspect the final links and retain receipts. No final submission has been sent.

The main team is **OY Labs**; the inspected NOWNodes team is **Orca Labs**, with the same four members. Team membership is present. Different labels are not themselves a published disqualification, but use the product name **OY Orders** consistently in submissions.

## Judging priorities

Main: functionality 30%, integration 25%, innovation 20%, usefulness 15%, demo 10%. Solana: execution 30%, originality 20%, UX 20%, viability 15%, demo 15%. Cardano: execution 30%, innovation 20%, UX 20%, impact 20%, pitch 10%. CRE: blockchain 40%, effective CRE 40%, WOW 20%. NOWNodes: completeness 25%, infrastructure 25%, usefulness 20%, creativity 15%, scalability 15%.

The retail pass makes the benefit visible. The signed-lie challenge explains why independent verification matters, and the separate paid rejection/refund proves reward protection. Cardano-specific depth and real merchant validation remain competitive weaknesses, rather than mandatory missing features. If time permits, obtain one genuine merchant reaction or problem example; no customer interviews, revenue, partnerships or adoption are claimed.

Deadline: **7 October 23:59 Singapore / 17:59 Berlin**. Internal target: **22:00 Singapore / 16:00 Berlin**. Prioritize repository, RSVP repair, stage playback/access and submission over adding features. Freeze the deck before submission.

Official sources: [main event](https://builderbase.com/event/token2049-origins-hackathon), [Solana](https://builderbase.com/track/solana-best-use-of-solana), [Cardano](https://builderbase.com/track/cardano-agentic-commerce), [Chainlink CRE](https://builderbase.com/track/chainlink-best-workflow-with-cre), [NOWNodes](https://builderbase.com/track/nownodes-multichain-infrastructure-challenge).
