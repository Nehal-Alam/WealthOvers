# REST API Specification & Endpoint Documentation

**Project:** WealthOvers — Advanced Personal Money Manager Web Application  
**Version:** v1 (Semantic URI: `/api/v1/*`)  
**Format:** RESTful JSON over HTTPS  
**Authentication:** Supabase Session JWT (Browser) / Bearer Token & Device Key (Android Companion)  

---

## 1. Global API Standards & Conventions

### 1.1 Base URL
All API endpoints are anchored to:
```
https://<domain>/api/v1
```

### 1.2 Authentication Headers
Every request to protected endpoints must include either standard session cookies managed by `@supabase/ssr` or explicit authentication headers:

- **Browser Web Client**: Automatically supplies HTTP-only encrypted session cookies (`sb-access-token`, `sb-refresh-token`).
- **REST Client / CLI**:
  ```http
  Authorization: Bearer <supabase_jwt_access_token>
  ```
- **Android Companion Device Sync**:
  ```http
  X-Device-Id: <device_uuid>
  X-Device-Token: wov_dev_<secret_token_hash>
  ```

### 1.3 Uniform Response Envelopes

#### Success Envelope (HTTP 200, 201)
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 128,
    "totalPages": 6
  }
}
```

#### Error Envelope (HTTP 4xx, 5xx)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The transaction amount must be greater than zero.",
    "details": [
      {
        "field": "amount",
        "issue": "Must be greater than 0"
      }
    ]
  }
}
```

### 1.4 Standard HTTP Status Codes

| Code | Meaning | Usage |
| :--- | :--- | :--- |
| `200 OK` | Request succeeded | Standard for successful `GET`, `PATCH`, `PUT`. |
| `201 Created` | Resource created | Standard for successful `POST` operations. |
| `204 No Content` | Succeeded with no body | Standard for `DELETE` operations. |
| `400 Bad Request` | Malformed syntax / body | Unparseable JSON or schema failure. |
| `401 Unauthorized`| Missing / Invalid Token | Session expired or signature invalid. |
| `403 Forbidden` | Access denied | User attempting cross-tenant access. |
| `404 Not Found` | Resource nonexistent | Resource ID does not exist for this user. |
| `409 Conflict` | State conflict | Duplicate transaction detected by idempotency hash. |
| `422 Unprocessable`| Business logic violation| Negative transfer amount, insufficient balance. |
| `429 Too Many Req`| Rate limited | Surpassed rate threshold. |
| `500 Server Error`| Internal failure | Unhandled server error (logged to audit log). |

---

## 2. Authentication & User Profile Endpoints

### `GET /api/v1/auth/me`
Retrieves authenticated user profile and account configuration.

- **Auth Required**: Yes
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "email": "user@example.com",
    "fullName": "Nehal Alam",
    "avatarUrl": "https://example.com/avatar.jpg",
    "currency": "INR",
    "locale": "en-IN",
    "financialYearStartMonth": 4,
    "timezone": "Asia/Kolkata",
    "isPrivacyMode": false
  }
}
```

### `PATCH /api/v1/user/settings`
Updates global preferences, currency, and display settings.

- **Auth Required**: Yes
- **Request Body**:
```json
{
  "currency": "INR",
  "locale": "en-IN",
  "financialYearStartMonth": 4,
  "isPrivacyMode": false,
  "themePreference": "dark"
}
```
- **Response (200 OK)**: Returns updated user settings object.

---

## 3. Accounts Management Endpoints

### `GET /api/v1/accounts`
Retrieves all financial accounts for the authenticated user.

- **Query Parameters**:
  - `type` (optional): Filter by `account_type_enum` (`savings`, `credit_card`, etc.)
  - `includeArchived` (boolean, default: `false`)
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "name": "HDFC Salary Account",
      "accountType": "salary",
      "institutionName": "HDFC Bank",
      "accountNumberMasked": "••••4321",
      "currency": "INR",
      "initialBalance": "10000.0000",
      "currentBalance": "145820.5000",
      "color": "#1E40AF",
      "icon": "Building2",
      "isArchived": false,
      "updatedAt": "2026-10-31T06:00:00Z"
    }
  ]
}
```

### `POST /api/v1/accounts`
Creates a new financial account and establishes opening balance.

- **Request Body**:
```json
{
  "name": "ICICI Savings",
  "accountType": "savings",
  "institutionName": "ICICI Bank",
  "accountNumberMasked": "••••9876",
  "currency": "INR",
  "initialBalance": "25000.0000",
  "color": "#EA580C",
  "icon": "Landmark"
}
```
- **Response (201 Created)**: Returns created account object.

### `PATCH /api/v1/accounts/:id`
Updates account details or archives the account.

- **Request Body**:
```json
{
  "name": "ICICI Primary Savings",
  "color": "#C2410C",
  "isArchived": false
}
```

---

## 4. Transactions Ledger Endpoints

### `GET /api/v1/transactions`
Fetches paginated, sorted, and filtered transaction records.

- **Query Parameters**:
  - `page` (int, default: 1)
  - `limit` (int, default: 25, max: 100)
  - `startDate` (ISO 8601 string, e.g., `2026-10-01`)
  - `endDate` (ISO 8601 string, e.g., `2026-10-31`)
  - `accountId` (UUID)
  - `categoryId` (UUID)
  - `type` (`income` | `expense` | `transfer` | `refund`)
  - `search` (text query matching description/merchant)
  - `sortBy` (`transaction_date` | `amount`, default: `transaction_date`)
  - `sortOrder` (`asc` | `desc`, default: `desc`)
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "e9b5a8c2-263a-4416-8f2e-4b68ef5ad932",
      "accountId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "accountName": "HDFC Salary Account",
      "destinationAccountId": null,
      "destinationAccountName": null,
      "categoryId": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "categoryName": "Food & Dining",
      "amount": "640.0000",
      "currency": "INR",
      "transactionType": "expense",
      "transactionDate": "2026-10-30T14:32:00Z",
      "description": "Lunch at Social",
      "notes": "Team celebration",
      "source": "manual",
      "referenceNumber": "UPI/428392183921",
      "isReviewed": true,
      "tags": ["dining", "team"]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 1,
    "totalPages": 1
  }
}
```

### `POST /api/v1/transactions`
Records a new financial transaction (Income, Expense, Transfer, or Refund).

- **Transfer Request Payload**:
```json
{
  "accountId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "destinationAccountId": "8d3e6912-78d1-4cb3-911e-ecb4f8a85112",
  "amount": "15000.0000",
  "currency": "INR",
  "transactionType": "transfer",
  "transactionDate": "2026-10-31T09:00:00Z",
  "description": "Monthly transfer to Savings",
  "source": "manual"
}
```
- **Response (201 Created)**: Returns created transaction. The database trigger automatically updates balances on both accounts atomically.

### `POST /api/v1/transactions/bulk`
Atomic bulk insert/update for imported or synchronized transactions.

- **Request Body**:
```json
{
  "transactions": [
    {
      "accountId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "amount": "1299.0000",
      "transactionType": "expense",
      "transactionDate": "2026-10-29T18:20:00Z",
      "description": "Amazon Prime Annual Subscription",
      "source": "csv_import",
      "idempotencyHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    }
  ]
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "inserted": 1,
    "skippedDuplicates": 0
  }
}
```

---

## 5. Android Transaction Synchronization Endpoints

### `POST /api/v1/devices/register`
Registers an Android companion device and generates a cryptographically secure token.

- **Auth Required**: User session (initiated from web dashboard or via pairing QR code)
- **Request Body**:
```json
{
  "deviceName": "Pixel 8 Pro",
  "deviceModel": "Google Pixel 8 Pro (Android 15)",
  "appVersion": "1.0.4"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "deviceId": "b1e60f22-4c48-4cb2-83b3-8d6f51cb3298",
    "deviceToken": "wov_dev_9a4f2c81e7d03b68149f1234567890abcdef",
    "registeredAt": "2026-10-31T10:00:00Z"
  }
}
```
> [!IMPORTANT]
> The plaintext `deviceToken` is presented to the user/device only once during registration. A SHA-256 hash is retained on the server.

### `POST /api/v1/transactions/sync`
Synchronizes transactions extracted on-device via Android NotificationListenerService or SMS.

- **Headers**:
  ```http
  X-Device-Id: b1e60f22-4c48-4cb2-83b3-8d6f51cb3298
  X-Device-Token: wov_dev_9a4f2c81e7d03b68149f1234567890abcdef
  ```
- **Request Body**:
```json
{
  "syncBatchId": "c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
  "records": [
    {
      "externalId": "sms_notif_1029384",
      "amount": "450.0000",
      "transactionType": "expense",
      "merchant": "Swiggy",
      "accountIdentifier": "4321",
      "timestamp": "2026-10-31T08:15:22Z",
      "referenceNumber": "UPI/239482910394",
      "sourceApplication": "com.phonepe.app",
      "parserConfidence": 0.95,
      "idempotencyHash": "7a35b1d5c28e938f4a106b83f08138942b9c7b89d41285093414902348abcde1"
    }
  ]
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "batchId": "c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f",
    "ingested": 1,
    "flaggedForReview": 0,
    "duplicatesIgnored": 0
  }
}
```

### `GET /api/v1/sync/status`
Checks synchronization telemetry and health for paired devices.

- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "activeDevices": 1,
    "lastSyncTimestamp": "2026-10-31T08:16:00Z",
    "pendingReviewCount": 2
  }
}
```

---

## 6. Investment & Portfolio Endpoints

### `GET /api/v1/investments`
Lists all user holdings (stocks, mutual funds, gold, crypto, FDs).

- **Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "7f8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d",
      "name": "Parag Parikh Flexi Cap Fund - Direct Plan",
      "symbol": "122639",
      "assetType": "mutual_fund",
      "brokerName": "Zerodha Coin",
      "currency": "INR",
      "totalQuantity": "1542.381000",
      "averageBuyPrice": "62.4500",
      "totalInvestedAmount": "96321.6900",
      "currentNavOrPrice": "84.1200",
      "currentValuation": "129745.0900",
      "unrealizedGain": "33423.4000",
      "unrealizedGainPercent": "34.7000",
      "lastPriceUpdateAt": "2026-10-30T16:00:00Z"
    }
  ]
}
```

### `GET /api/v1/investments/metrics`
Calculates overall portfolio performance including XIRR and asset allocation.

- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "totalInvested": "450000.0000",
    "currentValuation": "582400.0000",
    "totalProfitLoss": "132400.0000",
    "absoluteReturn": "29.4222",
    "xirr": "16.8500",
    "assetAllocation": {
      "equity": "68.5000",
      "debt": "15.2000",
      "gold": "10.3000",
      "cash": "6.0000"
    }
  }
}
```

---

## 7. Statement Import Pipeline Endpoints

### `POST /api/v1/import/upload`
Uploads a bank statement file (CSV, XLSX, PDF) to Supabase Storage and initialises an import job.

- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `file`: Binary file stream (max 10MB)
  - `accountId`: Target Account UUID
  - `fileFormat`: `csv` | `xlsx` | `pdf`
- **Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "jobId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "fileName": "HDFC_Oct2026.csv",
    "status": "pending",
    "detectedColumns": ["Date", "Narration", "Chq/Ref No", "Withdrawal Amt", "Deposit Amt", "Closing Balance"]
  }
}
```

### `POST /api/v1/import/confirm`
Commits verified and categorized parsed rows to the transaction ledger.

- **Request Body**:
```json
{
  "jobId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "accountId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "transactions": [
    {
      "transactionDate": "2026-10-15T00:00:00Z",
      "description": "ZOMATO ORDER #38291",
      "amount": "380.0000",
      "transactionType": "expense",
      "categoryId": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c"
    }
  ]
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "importedCount": 1,
    "status": "completed"
  }
}
```

---

## 8. Financial Reports & Export Endpoints

### `GET /api/v1/reports/summary`
Generates comprehensive analytical summary metrics over an arbitrary date range.

- **Query Parameters**:
  - `startDate`: `2026-04-01`
  - `endDate`: `2026-10-31`
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "totalIncome": "840000.0000",
    "totalExpenses": "412500.0000",
    "netSavings": "427500.0000",
    "savingsRate": "50.8928",
    "topCategories": [
      { "category": "Housing & Rent", "amount": "140000.0000", "percentage": "33.94" },
      { "category": "Food & Dining", "amount": "52000.0000", "percentage": "12.60" }
    ],
    "monthlyCashFlow": [
      { "month": "2026-04", "income": "120000.0000", "expense": "58000.0000", "net": "62000.0000" }
    ]
  }
}
```

### `GET /api/v1/reports/export`
Exports user financial records in CSV or XLSX format.

- **Query Parameters**:
  - `format`: `csv` | `xlsx`
  - `scope`: `transactions` | `all`
- **Response (200 OK)**: Streamed binary file with header `Content-Disposition: attachment; filename="wealthovers_export_20261031.csv"`.

