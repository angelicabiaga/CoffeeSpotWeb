# Coffee Spot API and data model

Base path: `/api`. JSON request and response bodies. Success is HTTP 200 or 201. Errors return `{ "message": "Readable explanation" }` with 400, 401, 403, 404, 409, 429, or 500.

## Authentication

`POST /auth/login` sets the HttpOnly `coffee_session` cookie and returns `{ user, csrf }`. Axios sends the cookie automatically. Supply the returned CSRF value in the `X-CSRF-Token` header for authenticated POST, PATCH, and DELETE requests. `GET /auth/me` restores the user and CSRF token after a refresh. The token is stored only in React memory; JWTs are not placed in browser localStorage. Session records are checked on every authenticated request so logout revokes the session before JWT expiry.

## Routes

| Method and path | Access | Purpose |
| --- | --- | --- |
| GET /health | Public | Availability and demo-mode flag |
| POST /auth/register | Public, rate limited | name, email, password; creates pending staff |
| POST /auth/login | Public, rate limited | email, password |
| GET /auth/me | Signed-in | Session and profile |
| POST /auth/logout | Signed-in | Revoke current session |
| PATCH /profile | Signed-in | Update own name |
| POST /profile/password | Signed-in | currentPassword, newPassword; revoke all sessions |
| GET /users | Manager | Paginated name search |
| PATCH /users/:id | Manager | status: active or disabled; cannot change self |
| GET /menu | Signed-in | Paginated menu, populated recipes, available servings |
| POST /menu | Manager | Create product and recipe |
| PATCH /menu/:id | Manager | Full product form update |
| DELETE /menu/:id | Manager | Delete unused product; block records with sales |
| GET /ingredients | Signed-in | Paginated inventory; low=true or active=true |
| POST /ingredients | Manager | Create ingredient at zero stock |
| PATCH /ingredients/:id | Manager | Metadata update; unit is immutable |
| DELETE /ingredients/:id | Manager | Delete unused ingredient; block history/recipes |
| POST /stock | Manager | Receipt or Adjustment with signed quantity and reason |
| GET /movements | Manager | Paginated movement history; optional ingredient ID |
| POST /orders | Signed-in | Transactional checkout |
| GET /orders | Signed-in | Own orders for staff; all for managers; board=true for shared queue |
| GET /orders/:id | Owner or manager | Receipt details |
| PATCH /orders/:id/status | Signed-in | Sequential preparation transition |
| POST /orders/:id/void | Manager | Refund and stock reversal/waste with reason |
| GET /dashboard | Signed-in | Stock and queue; manager also receives financial aggregates |
| GET /reports/export | Manager | CSV across all matching records |
| GET /audit | Manager | Paginated activity history |
| GET /announcements | Signed-in | Paginated announcements |
| POST /announcements | Manager | Publish title and body |
| DELETE /announcements/:id | Manager | Delete announcement |

List endpoints return `{ items, total, page, pages }`. Supply `page`, `limit` (1–100), and `q` where supported. Dates use `from` and `to` in YYYY-MM-DD format, inclusive in Asia/Manila. Transaction status filters use Queued, Preparing, Ready, Completed, or Voided.

### Checkout example

```json
{
  "requestId": "3728520c-9a62-4cbc-9982-5998c6de166e",
  "service": "Takeaway",
  "cash": 30000,
  "items": [{ "menuId": "REPLACE_WITH_A_REAL_24_CHARACTER_ID", "quantity": 2 }]
}
```

The server ignores no extra fields: unrecognized fields are rejected. Product price, total, cashier, recipe, and stock deductions are derived on the server. IDs in examples are placeholders, not usable records.

### Menu form

`name`, `category`, `description`, integer `price` in centavos, `visual` (latte/espresso/matcha/chocolate/tea/pastry), boolean `active`, and `recipe: [{ ingredient, quantity }]`. Recipe quantities are positive integer base units. Duplicate ingredients are rejected.

### Ingredient form

`name`, `unit` (g/ml/piece), integer `reorderLevel`, `supplier`, and boolean `active`. Use the stock endpoint to change the balance. Ingredient metadata APIs do not accept stock values.

## Collections

- **users:** hashed password, unique email, name, role, approval state.
- **sessions:** JWT ID, user reference, random CSRF token, expiration date with a TTL index. Expiry is also checked in application code.
- **ingredients:** base unit, current balance, reorder level, supplier, active flag, write revision.
- **menus:** description, price, visual key, active flag, ingredient recipe references, revision.
- **orders:** unique request ID, request hash, order number, cashier, item/price/recipe snapshots, total/cash/change, status history, void and refund details.
- **movements:** ingredient, signed quantity, resulting balance, movement type, order link, reason, actor.
- **audits:** actor, action, target, detail, timestamps.
- **announcements:** title, body, author, timestamps.

## Consistency decisions

Checkout and void operations use MongoDB transactions. Product revisions are touched during checkout so concurrent recipe edits cause a conflict and retry. Ingredient updates use a stock-at-least-needed condition. Duplicate request IDs are checked outside and inside the transaction, and unique indexes provide a final uniqueness constraint.

Deleting a menu item or ingredient is transactional with its reference checks. Order history uses snapshots so historical values do not change when a menu price or recipe changes. Waste movements record zero additional balance change because checkout already consumed those ingredients.

The preparation board is shared across staff; financial report access is manager-only. Staff may view the active preparation tickets for the team, but their transaction/receipt list is restricted to their own orders.
