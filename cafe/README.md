# Coffee Spot

A full MERN coffee shop management project based on the BrewTrack proposal, renamed **Coffee Spot**. The interface uses burgundy, white, and yellow, with locally bundled Plus Jakarta Sans and Lucide icons.

## Start with the sample workspace

Install **Node.js 22.12 or newer**, extract this ZIP, and open a terminal inside `Coffee-Spot` (the folder containing this README and the root package.json).

```bash
npm install
npm run demo
```

Open **http://localhost:5173**.

| Demo role | Email | Password |
| --- | --- | --- |
| Manager | manager@coffeespot.local | CoffeeSpot123! |
| Staff | staff@coffeespot.local | CoffeeSpot123! |

Demo mode starts a temporary, real MongoDB replica set and seeds accounts, menu products, ingredients, and a team announcement. It does not use browser local storage as a database. The first launch may download a MongoDB binary and needs internet access. Keep the terminal open. **Demo data resets when you stop it.** Demo credentials are only for the temporary sample workspace.

If a managed computer blocks local database processes or the binary download, use the persistent Atlas setup below instead. Do not start `npm run dev` and `npm run demo` together because both use port 5000.

## Use persistent MongoDB data

1. Run `npm install` in the root folder if you have not already done so.
2. Run `npm run setup`. This creates `server/.env` and generates a random JWT signing secret. It keeps an existing `.env` unchanged.
3. Set `MONGODB_URI` in `server/.env` to your MongoDB Atlas connection string with a database name, for example:

   ```env
   MONGODB_URI=mongodb+srv://YOUR_DB_USER:YOUR_URL_ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/coffee_spot?retryWrites=true&w=majority
   ```

   Use a database user, and allow your current IP in Atlas network access. Replace the example values with your own. Percent-encode special characters in the URI password. Never put this URI in React code.

4. In the same file, set strong `SEED_MANAGER_PASSWORD` and `SEED_STAFF_PASSWORD` values of at least 10 characters with letters and numbers. Set the account emails if you want different logins.
5. Run:

   ```bash
   npm run seed
   npm run dev
   ```

6. Open **http://localhost:5173**, and log in with your seed email and password.

The seed script creates missing seed accounts, and creates sample stock only if menu and inventory are empty. It does not clear collections or overwrite existing accounts. To use a completely empty business inventory, create your manager account with the seed script, then remove unused sample menu records, or use a separate clean database and tailor `server/seed-data.js` before the first seed.

MongoDB creates collections through Mongoose; you do **not** need SQL. Local MongoDB must be a **replica set**; standalone MongoDB cannot support the transactions used for checkout. Atlas is the simpler persistent option.

## Included screens and functions

- **Accounts:** registration, pending staff approval, login, server-side JWT sessions, logout, profiles, and password changes.
- **Overview:** date filters, sales revenue, transaction count, active preparation orders, low-stock alerts, daily sales chart, and top-selling products. KPI cards link to their records.
- **Point of Sale:** searchable illustrated products, category filters, a cart with quantity controls, dine-in/takeaway, validated cash checkout, change computation, and receipt preview before printing.
- **Preparation Board:** Queued → Preparing → Ready → Completed, with automatic refresh every 10 seconds.
- **Menu & Recipes:** product CRUD, pricing, recipe quantities, computed servings, archiving, and safe deletion of unused records.
- **Stock Inventory:** ingredient CRUD, fixed base units, reorder levels, suppliers, stock receipts, positive/negative adjustments with reasons, low-stock filtering, and stock movement history.
- **Transactions:** date and status filters, search, pagination, receipt preview, manager-controlled voids, and cash refund recording.
- **Sales & Reports:** period sales, transaction count, average order value, top products, and CSV export with a confirmation preview. Export includes all matching pages.
- **Team Members:** activate pending staff or disable accounts and revoke their sessions.
- **Announcements:** a shared text-based team feed with manager publishing and deletion.
- **Activity History:** records of menu edits, inventory changes, account status changes, and voids.
- **My Profile:** name updates and password changes that end active sessions.

FranchiSync-inspired behavior includes the Plus Jakarta Sans typography, clickable dashboard summaries, period filters, stock alerts, inventory drill-down, supplier details, announcements, and role-based access. This project uses newly written MERN code; it does not contain or connect to your existing FranchiSync production database or backend. Brand-to-branch supply ordering, ghost-stock analysis, AI recommendations, and online payment processing are not included in this single-branch scope.

## Manager and staff access

| Capability | Manager | Staff |
| --- | --- | --- |
| POS and preparation board | Yes | Yes |
| Read menu and inventory | Yes | Yes |
| Edit menu, recipes, and inventory | Yes | No |
| View transactions | All | Own receipts; shared preparation queue |
| Void and record cash refund | Yes | No |
| Financial reports and CSV | Yes | No |
| Approve or disable users | Yes | No |
| Publish announcements | Yes | No |
| Read announcements and edit own profile | Yes | Yes |

Public registration always creates a pending staff account. It never creates managers. The seed script provisions the initial manager. Staff roles cannot be escalated through the profile API or user interface.

## Business rules

- Money is stored as **integer centavos**. PHP 120.00 is stored as `12000`.
- Ingredients use integer base units: **g**, **ml**, or **piece**. For example, enter a 1-liter milk receipt as 1,000 ml. Conversion is entered by the manager; there is no automatic bulk-pack conversion UI.
- A recipe is per serving. All products in a cart are checked together, including ingredients shared across products.
- Prices and recipes come from the server at payment. Past orders retain their own price and recipe snapshots.
- Stock deductions, stock history, and order creation run inside one MongoDB transaction. Conditional updates prevent negative stock.
- Each checkout has a unique request ID. A retry with identical details returns the existing order; changing details with the same ID is rejected. When a network request times out, retry with the same cart and cash amount.
- Queued orders can be voided with a one-time ingredient reversal. Once preparation starts, a void records consumed ingredients as waste without deducting them again.
- A void records the refund but does not send money electronically. The manager must actually return the cash and confirm it in the dialog.
- Voided sales are excluded from sales totals; receipts and stock movement history are retained.
- Orders are not deleted. Products and ingredients with history cannot be permanently deleted; use the Active checkbox to archive them.
- Business date filters use **Asia/Manila**. Dashboard stock alerts and preparation counts are live, while financial cards follow the selected period.
- Sales reports are sales summaries, not accounting profit statements or tax invoices. Discounts, tax breakdowns, loyalty points, and customer online ordering are outside this version.

## Project folders

```text
Coffee-Spot/
  client/
    src/
      components/       Shared UI, layout, receipt
      pages/            Each application screen
      api.js            Axios client and shared formatters
      Auth.jsx          Authentication context
      App.jsx           Routes and access guards
      main.jsx          React entry point
      styles.css        Burgundy, white, yellow design
    vite.config.js      Development API proxy
  server/
    routes/             Accounts, catalogue, operations
    services/           Checkout, voids, shared calculations
    tests/              Unit and real-MongoDB integration tests
    models.js           Mongoose models
    auth.js             JWT/session/role/CSRF checks
    app.js              Express application and error handling
    index.js            Persistent database startup
    demo.js             Temporary sample database startup
    seed-data.js        Sample records and seed accounts
    seed.js             Persistent seed command
    .env.example        Configuration template
  scripts/setup.mjs     Safe environment-file creation
  docs/                 API, walkthrough, and validation notes
  package.json          Root commands
  package-lock.json     Locked dependencies
```

## Build and run as one application

For a local production-build check:

```bash
npm run build
npm start
```

`npm start` requires the persistent `server/.env` database configuration. Open **http://localhost:5000**. When using that address locally, add `http://localhost:5000` and `http://127.0.0.1:5000` to the comma-separated `CLIENT_ORIGIN` setting. The server serves the built React files and the API together.

For an HTTPS deployment, set `NODE_ENV=production`, set `CLIENT_ORIGIN` to your exact HTTPS site origin, use your production MongoDB URI and a unique JWT secret, and run the build. Secure cookies require HTTPS. Keep React and the API on the same site; the supplied client uses relative `/api` URLs. Configure only the trusted reverse-proxy hops in Express if your hosting environment requires them for rate limiting. Do not set unrestricted proxy trust blindly.

Secrets stay in `server/.env`, which is excluded from version control and this ZIP. No database URI or JWT secret belongs in a `VITE_` variable.

## Tests and validation

```bash
npm run test:unit          # No database required
npm run test:integration   # Temporary MongoDB replica set required
npm test                  # Both test groups
npm run build             # Production React build
```

See `docs/VALIDATION.md` for what was actually run and what still needs verification with a working MongoDB instance. Do not treat the UI checks as proof that a database transaction passed.

## Common startup fixes

- **Cannot connect to Coffee Spot:** keep both API and web processes running. Use the URL printed by Vite. Check the API terminal for the actual database startup message.
- **MongoDB authentication error:** check the database username/password and URI encoding, not your Coffee Spot app login.
- **Atlas connection timeout:** check your allowed IP and cluster connection string.
- **Transaction numbers are only allowed on a replica set:** use Atlas or configure a local replica set.
- **Port 5000 or 5173 already in use:** stop the earlier running instance before starting another one.
- **Account waiting for approval:** sign in as manager → Team Members → Activate.
- **Product unavailable:** check recipe ingredients, their Active setting, and stock quantities; refresh the menu after receiving stock.
- **No sales shown:** finish a payment, check your selected dates, and ensure the order was not voided.
- **Expired session:** log in again. Sessions expire after eight hours and are revoked on logout, password changes, or account disabling.

Official references used for implementation decisions: [Vite guide](https://vite.dev/guide/) and [Mongoose transactions](https://mongoosejs.com/docs/8.x/docs/transactions.html).

To run the optional interface tests with mock API responses, run `npx playwright install chromium` and then `npm run test:ui`. The tests start Vite automatically. The test mocks are isolated in `tests/ui.spec.js` and are not part of the application build.
