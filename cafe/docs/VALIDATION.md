# Validation results

Checked on 11 October 2026.

| Check | Result | Scope |
| --- | --- | --- |
| React production build | Passed | Vite compiled and bundled the complete frontend |
| Unit and API input tests | 10 passed | Real calculations and Express validation paths that do not require a database |
| Desktop UI workflow | Passed | Login, routing, cart, payment request payload, receipt preview, preparation transition, menu creation form, stock receipt form, all main screens |
| Mobile UI | Passed | 390 px viewport; overview, POS, inventory, board, reports, profile; no document-level horizontal overflow; mobile cart dialog opens and closes |
| Staff UI access | Passed | Manager screen redirects for a staff session |
| Receipt printing | Passed | Print output contains one receipt page without app navigation |
| Browser runtime errors | None observed | In the checked, mocked-API interface workflow |
| MongoDB integration suite | Blocked, not passed | The workspace prevented the local MongoDB process from starting with an OS permission error |

## Important distinction

Browser checks used **mock API responses** to exercise the React interface. The shipped application itself uses Axios with the real Express API; it contains no mock-data fallback. Browser checks do not prove that MongoDB checkout, rollback, concurrency, voids, account approval, or persistence work end to end.

The real database integration suite is included at `server/tests/integration.test.js`. It uses a temporary MongoDB replica set and asserts:

- Registration, approval, disabled-account access, duplicate emails.
- Server role checks, CSRF checks, origin restrictions, and strict request schemas.
- Ingredient CRUD, stock receipts, adjustment bounds, pagination, and historical deletion protection.
- Correct checkout totals and ingredient deductions.
- Atomic rejection on insufficient stock or cash, including shared ingredients in a mixed cart.
- Simultaneous orders competing for the final serving.
- Simultaneous duplicate checkout requests.
- Queued voids restoring stock once; prepared voids recording waste without another deduction.
- Sequential preparation states, report reconciliation, CSV output, and revoked logout sessions.

Run it in an environment that allows MongoDB processes before treating these safeguards as verified:

```bash
npm run test:integration
```

Unit/API checks without MongoDB:

```bash
npm run test:unit
```

Reproduce the mocked-API browser flow with Playwright:

```bash
npx playwright install chromium
npm run test:ui
```

The UI test starts Vite automatically. It does not require Atlas or a running API. The local validation runner used an available headless Chromium distribution for screen checks. The portable test uses Playwright's normal browser installation.

## Manual checks on your configured database

1. Complete a two-latte order and verify deductions and the receipt in MongoDB.
2. Refresh the app and sign in again; confirm that the order remains.
3. Verify a stock shortage rejects the entire checkout without a partial deduction.
4. Void one queued order and one preparing order; compare the stock history.
5. Try restricted API calls as staff; do not rely only on hidden navigation links.
6. Run a sample day of transactions and reconcile the report against the receipts.

The project is delivered as source code for setup and review, not as a claim of a production deployment or a guaranteed rubric score.
