# Demonstrating Coffee Spot

## A short walkthrough

1. Log in as manager. Explain the dashboard, date filters, stock alert count, and clickable summary cards.
2. Open Stock Inventory. Receive an ingredient delivery using the base unit and a delivery reference. Open stock history to show the new record.
3. Open Menu & Recipes. View Classic Latte: 18 g beans, 200 ml milk, one cup per serving. Demonstrate an unused test product's add/edit/delete operations.
4. Open Point of Sale. Add two Classic Lattes. With the sample PHP 120 price, the total is PHP 240. Enter PHP 300 cash. The change is PHP 60.
5. Confirm payment. Show the receipt preview and Print/Close actions. Open stock history to show the deductions: 36 g beans, 400 ml milk, and two cups.
6. Open Preparation Board. Move the order through Queued, Preparing, Ready, and Completed.
7. Open Sales & Reports. Choose the correct business date and show the matching order. Explain that voided orders do not count in sales revenue. Preview and download the CSV.
8. Register a new staff account in a private browser window. Show that it cannot log in before manager approval. Activate it from Team Members, then log in.
9. Show staff access: POS, preparation, menu/inventory reading, own transactions, announcements, and profile. Manager modules are absent, and direct API calls are also rejected.
10. Demonstrate an out-of-stock rejection, a reasoned stock adjustment, and a manager void. Explain the difference between restoring a queued order and recording waste after preparation starts.
11. Log out. Refresh or use a protected route to show that the session has ended.

## Explain the stack in simple Taglish

“Sa React ginagawa at ipinapakita ang interface. Kapag nag-click ng Confirm payment, ipinapadala ng Axios ang cart sa Express API. Chine-check ng backend ang login, permission, input, presyo, at stock. Ginagamit ng Mongoose ang schemas para mag-save sa MongoDB. Magkakasama sa isang transaction ang order at stock deduction, kaya kapag may kulang na ingredient, walang partial na bawas. Ibinabalik ng API ang result, tapos ina-update ng React ang receipt at interface.”

## Map to the rubric

| Criterion | What to show |
| --- | --- |
| Functionality and completeness | Working account flow, CRUD, checkout, stock history, preparation, reports |
| MERN implementation | Axios request in browser Network panel, Express route, Mongoose models, MongoDB records |
| Authentication and security | Password hash, JWT cookie/session, role middleware, CSRF, validation, logout |
| UI and responsiveness | Desktop and mobile navigation, burgundy/white/yellow styling, loading and error states |
| React concepts | Components, hooks, auth context, routing, effects with cleanup |
| Code organization | client and server split, routes/services/models, shared components, README |
| Documentation | README, API guide, demo guide, test files and honest results |
| Innovation | Recipe deductions, serving availability, alerts, preparation board, auditable movements |

A grade is based on the implemented demonstration and your explanation. Run the database integration tests in your environment before presenting the transaction safeguards as verified.
