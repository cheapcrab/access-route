# AccessRoute

**Experimental Project candidate; contract deployed, full frontend workflow pending.** A GenLayer intelligent contract and static frontend that turn independently reviewed public accessibility evidence into a deterministic path through an immutable directed graph.

The contract owner registers topology, positive integer costs, source locators and a condition such as step-free passage. Public assessments classify each segment OPEN/CLOSED/UNKNOWN. Only fresh OPEN segments enter the on-chain shortest-path search. The browser displays the contract's path and evidence; it does not let a model or frontend write a route answer.

This is an evidence prototype, **not a personal safety, emergency response, real-time accessibility or travel-time guarantee**. A registered graph can be incomplete or inaccurate. NO_EVIDENCE_PATH means the graph lacks a path supported by current qualifying evidence; it does not establish physical impossibility. A zero-distance start=end route does not perform an on-site access check.

## Install and verify

Use Python 3.12, Node 20.19+ or 22.12+, and pnpm 11.25.0.

```sh
python -m venv .venv
# Activate the venv for your platform.
python -m pip install -r requirements-dev.txt
python -m pytest
cd frontend
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm dev
```

Tests execute the actual contract and captured validator callbacks with official genlayer-test direct fixtures. Web and model I/O are explicitly mocked; no direct test is a network transaction. `tests/windows_direct.py` is a narrow workaround for genlayer-test 0.29.2's Windows temporary message-file unlink and raw datetime refresh. It does not replace contract/state/validator behavior.

The contract SDK dependency header is pinned to `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`. Local verification uses GenVM v0.2.12, genlayer-test 0.29.2, genvm-linter 0.11.0 and cloudpickle 3.1.2. Run `genvm-lint check contract.py --json` against the matching SDK before deployment. The verification report includes the local `GENVMROOT` used.

## Deploy and run the workflow

1. Load `contract.py` into stable GenLayer Studio and deploy through the intended wallet, with **no constructor arguments**. The deploying account becomes graph publisher. Save the actual address and transaction.
2. Serve `frontend/dist` as static files or run the local dev command. The relative Vite base supports hosting under a path.
3. Select **Stable Studio · 61999**, enter the real AccessRoute address and connect MetaMask. The SDK preset is `studionet`, RPC `https://studio.genlayer.com/api`. Studio Devnet 61997 is deliberately excluded. Bradbury 4221 and Asimov are optional choices for independent deployments.
4. Publish a graph as owner. IDs use letters, digits, `_` or `-`. Supply 2–20 nodes, 1–40 directed edges, a precise public evidence condition, and evidence TTL 60–86400 seconds.
5. Read the graph, then assess each relevant edge. Every assessment stores a source-digest/citation packet, observation time and expiry. A segment can be reassessed only after its prior evidence expires; prior versions remain visible. Each edge allows 20 versions, after which publish a new graph version.
6. Request a start/end path. Positive integer registered minutes are the cost; ties use the lexicographically ordered edge-ID sequence. The contract searches only fresh OPEN edges. It returns node/edge IDs, total registered cost, evidence records and the earliest expiry on that path.
7. Inspect the route and its sources. The frontend withdraws the highlighted path at its displayed expiry. Re-read chain state and refresh expired segment evidence before treating a path as current.

Nodes are exactly `{id,label}`. Edges are exactly `{id,from,to,minutes,sources}`; endpoints must exist, self-edges are rejected, minutes are integer 1–1440, and sources contain 1–2 distinct public named HTTPS URLs. The owner cannot overwrite a graph's topology, cost, condition or sources. Costs are declared weights, not externally measured walking duration.

## Independent evidence review

Each source must return status 200, nonempty UTF-8 content, at most 16,000 bytes. Web access and inference run only within `gl.vm.run_nondet_unsafe`. Every validator independently fetches the original URLs, hashes actual bytes and derives its own segment status and finite reason. It validates the leader's exact quotations against its own matching documents and compares the decisive status/reason/digest tuple. A fabricated quote or a changed source is rejected even if the packet looks like valid JSON.

OPEN requires ACCESSIBLE; CLOSED requires RESTRICTION. UNKNOWN reasons include INSUFFICIENT_EVIDENCE, CONFLICTING_SOURCES, SOURCE_UNAVAILABLE and MODEL_INVALID. Missing sources, extra model keys, unsupported classifications or malformed citations cannot enable an edge. Only deterministic code appends assessments, sets TTL and runs the graph algorithm.

TTL measures the life of a stored assessment, not the age or reliability of a physical observation. The model must consider the document's stated location, direction and time scope, and ambiguous old claims should remain UNKNOWN. Prefer current authoritative sources or explicit version-pinned documentation. A fresh fetch alone does not make an old statement true. Exact decisive outputs and source hashes may diverge and delay consensus. Sources and prompts remain fallible public claims.

The URL checks reject credentials, explicit ports, IP literals, fragments and local-looking suffixes. They do not pin DNS resolution or prove a request cannot follow a redirect; external transport remains a runtime assumption. No source publisher identity, infrastructure authority or site ownership is proved by the application. The deploying publisher chooses the graph and its sources.

## Contract methods

| Method | Arguments | Result |
| --- | --- | --- |
| `publish_graph` | graph_id, title, conditions, nodes_json, edges_json, evidence_ttl | Owner-only immutable graph |
| `assess_edge` | graph_id, edge_id | Initial or post-expiry consensus observation |
| `get_graph` | graph_id | JSON graph, all edge histories and view time |
| `get_edge` | graph_id, edge_id | JSON assessment history |
| `find_route` | graph_id, start, end | JSON deterministic evidence-qualified path or no path |

## Frontend and transaction lifecycle

Wallet writes use the current `createClient({chain,account,provider})` SDK interface. A separate RPC client waits with `waitForTransactionReceipt({hash,waitUntil:'finalized'})`, verifies stored finalized lifecycle, then calls SDK `isSuccessful(receipt)`. A finalized execution error is failure, not a graph update. Submission IDs remain in the trail after a timeout and can be inspected again before resubmitting. The dApp sends zero contract value, holds no keys and has no backend; network transaction fees may apply.

`genlayer-js` is pinned to **2.0.0-rc.2** because it exposes the currently documented `waitUntil` and `isSuccessful` APIs. npm latest 1.1.8 lacked those exports at verification time. A real SDK read returned stable Studio chain ID 61999; this does not establish deployed-contract read/write compatibility. The release-candidate SDK and full wallet workflow still require actual network verification.

## Demo fixtures and release status

`fixtures/segment-open.md` and `segment-restricted.md` describe an explicitly fictional campus. They are authored demo documents, not official accessibility statements. Publish them to a public repository and populate the empty source arrays in `graph-input.json` with the real URLs. The expected demo path is A → B → C when those edges actually receive fresh OPEN assessments; the direct A → C staircase segment should be excluded under a step-free condition. Actual consensus outcomes must be observed, never prefilled as successful live results.

`deployment.json` and frontend config record the verified zero-value Normal-consensus deployment on Studio chain 61999: `0x8667862a0d79F4D915BC069816E7CB00B652fE06`, transaction `0x1c78aa0be122ba3101fdfa25b003a102def0268b3e1b3634be3adf4230763372`. Chain source SHA-256 matches the tested Python file. This verifies constructor deployment only; public frontend hosting and the full graph/assessment/path workflow are still pending. Retained tests, lint and build output are under `verification/`. Before presenting this as deployed, fill real deployment records, publicly host the fixtures and static UI, run publish/assess/path/read/receipt actions through the wallet and preserve actual results. No audit or live adoption is claimed. MIT licensed.

Official references checked on 2026-10-21: [GenVM non-determinism](https://docs.genlayer.com/developers/intelligent-contracts/features/non-determinism), [LLM calls](https://docs.genlayer.com/developers/intelligent-contracts/features/calling-llms), [transaction lifecycle](https://docs.genlayer.com/developers/decentralized-applications/querying-a-transaction), [GenLayer JS](https://github.com/genlayerlabs/genlayer-js).
