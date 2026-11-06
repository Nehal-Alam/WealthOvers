# WealthOvers — Known Issues & External Integration Constraints

**Last Updated:** November 2026  
**Status:** Monitored / Documented

---

## 1. Native Android Companion APK

* **Status:** Web Application & Ingestion API Ready (`app/api/v1/transactions/sync/route.ts`).
* **Constraint:** The native Android companion is an external APK that must be installed on a physical or emulated Android device.
* **Truthful UI State:** The web application displays pairing codes, device lists, zero-trust security architecture, and staging transactions. When a user has 0 paired devices or 0 sync logs, the UI displays `"N/A"` for Ingestion Success Rate and `"No synchronization events yet"` rather than fabricating a 100% success rate.

---

## 2. Live Stock Market Price Feeds

* **Status:** Portfolio Valuation Engine Functional via `current_nav_or_price` and `average_buy_price`.
* **Constraint:** Live real-time market data APIs (e.g. NSE/BSE/Yahoo Finance live WebSockets) require paid third-party API credentials.
* **Current Behavior:** Prices are updated manually via the "Update Price" modal or CSV portfolio holding import. The date and time of the last price update is clearly displayed (`last_price_update_at`). Market prices are never fabricated or simulated.

---

## 3. Bank Statement PDF Parsing

* **Status:** CSV and tabular imports are fully functional with column mapping and deduplication (`lib/parsers/csv-parser.ts`).
* **Constraint:** Password-protected or scanned image PDFs require OCR and password entry, which may fall back to manual verification or CSV export from the user's net banking portal.

