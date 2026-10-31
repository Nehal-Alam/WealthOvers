# MASTER DEVELOPMENT PROMPT

# PROJECT: ADVANCED PERSONAL MONEY MANAGER WEB APPLICATION

## ROLE AND EXPECTATIONS

Act as a complete senior software engineering team consisting of:

- Principal Software Architect
- Senior Next.js Developer
- Senior React Developer
- Backend Engineer
- PostgreSQL Database Architect
- UI/UX Designer
- Financial Application Specialist
- Security Engineer
- QA Automation Engineer
- DevOps Engineer

Your task is to design, develop, test and deliver a production-ready personal finance management web application.

The application should be inspired by the functionality of:

1. Leftovers: <https://github.com/saisaharsh3/Leftovers>
2. Money Manager Expense & Budget by Realbyte.
3. Modern fintech dashboards and wealth management platforms.

Repository reference:
<https://github.com/saisaharsh3/Leftovers>

Study its features and workflows before implementing this project. Use it as functional inspiration, not as a requirement to copy its source code.

Build an original application with a more advanced, professional, scalable and responsive user experience.

The application must manage a user's complete financial life in one place.

==================================================

1. NON-NEGOTIABLE DEVELOPMENT REQUIREMENTS
==================================================

- Build a fully functional application, not a static UI prototype.
- Use open-source libraries and technologies.
- Avoid paid APIs and mandatory subscriptions.
- No Docker or Docker Desktop requirement.
- Application must be deployable directly to Vercel.
- Use Supabase Cloud for database and authentication.
- Use PostgreSQL as the primary database.
- Use TypeScript throughout the application.
- Implement multi-user authentication.
- Enforce strict user-level data isolation.
- Make the application responsive across all screen sizes.
- Implement actual database operations for every functional module.
- Never use hardcoded financial values in production components.
- All calculations must use accurate decimal-based financial arithmetic.
- Implement loading, error, empty and success states.
- Write maintainable, reusable and modular code.
- Keep documentation updated.

Do not generate the entire project as one large component.

==================================================
2. TECHNOLOGY STACK
==================================================

Frontend:

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Radix UI
- Lucide React
- Recharts
- TanStack Table
- React Hook Form
- Zod
- Zustand

Backend:

- Supabase
- Next.js Route Handlers where custom server-side logic is necessary
- PostgreSQL
- Drizzle ORM where appropriate

Authentication:

- Supabase Auth
- Email and password
- Email verification
- Password reset
- Google OAuth as an optional login method

Database:

- PostgreSQL
- Row Level Security
- Database migrations
- Proper indexing
- Foreign key constraints

Utilities:

- date-fns
- PapaParse
- SheetJS Community Edition
- PDF.js
- Decimal.js

Testing:

- Vitest
- React Testing Library
- Playwright

Development:

- Node.js LTS
- npm
- Git
- GitHub
- Antigravity IDE

Hosting:

- Vercel for the web application.
- Supabase Cloud for backend services.

Verify dependency maintenance, compatibility and licenses before adding packages.

==================================================
3. APPLICATION DESIGN AND BRANDING
==================================================

Create a premium fintech-style user interface.

Design references:

- Linear
- Stripe Dashboard
- Modern digital banking applications
- Premium personal finance applications

Visual style:

- Minimalist.
- Modern.
- Professional.
- Clean typography.
- Consistent spacing.
- Subtle shadows.
- Smooth animations.
- Beautiful financial charts.
- Clear financial data hierarchy.

Theme:

- Light mode.
- Dark mode.
- System theme.

Desktop layout:

- Collapsible left sidebar.
- Top navigation.
- Main dashboard.
- Financial overview cards.
- Analytical charts.
- Transaction tables.

Mobile layout:

- Mobile-first design.
- Bottom navigation.
- Responsive financial cards.
- Touch-friendly controls.
- Responsive tables converted into cards where appropriate.
- Compact charts.
- Mobile-friendly forms.
- Responsive dialogs and navigation.

Responsive breakpoints:

- 320px–375px.
- 376px–767px.
- 768px–1023px.
- 1024px–1439px.
- 1440px and above.

Strictly prevent horizontal overflow.

Implement accessibility, keyboard navigation, semantic HTML and appropriate contrast.

Create reusable design tokens and components.

==================================================
4. MULTI-USER AUTHENTICATION
==================================================

Build a complete multi-user authentication system.

Registration:

- Full Name.
- Email Address.
- Password.
- Confirm Password.
- Optional Mobile Number.
- Terms and Privacy Policy acceptance.
- Email verification.

Login:

- Email and Password.
- Optional Google OAuth.
- Remember Me.
- Forgot Password.
- Show/Hide Password.

Additional features:

- Password reset.
- Session management.
- Secure logout.
- Logout from all devices.
- Account deletion.
- Email change verification.
- Authentication error handling.
- Rate limiting.

Pages:

- /login
- /register
- /forgot-password
- /reset-password
- /verify-email
- /onboarding
- /profile
- /settings
- /sessions

After successful authentication, load the authenticated user's individual financial dashboard.

Every user must have an independent financial workspace.

Never allow one user to access another user's:

- Transactions.
- Accounts.
- Investments.
- Credit cards.
- Loans.
- Budgets.
- Reports.
- Financial goals.
- Uploaded statements.
- Android synchronization records.

Use Supabase Auth and PostgreSQL RLS.

Never trust user_id supplied by the frontend. Derive ownership from the verified authenticated identity.

Implement and test RLS policies for every user-owned table.

ADMIN privileges must not automatically expose private user financial records.

==================================================
5. FIRST-TIME USER ONBOARDING
==================================================

After registration, provide a guided onboarding process.

Step 1: Welcome screen.
Step 2: Profile details.
Step 3: Select country and currency.
Step 4: Configure financial year.
Step 5: Create bank or cash account.
Step 6: Enter opening balance.
Step 7: Configure default expense categories.
Step 8: Optional monthly budget.
Step 9: Finish setup.

Default:

- Country: India.
- Currency: INR (₹).
- Financial year: April to March.
- Time zone: Asia/Kolkata.

Allow users to skip optional steps and complete onboarding later.

==================================================
6. MAIN FINANCIAL DASHBOARD
==================================================

Build an advanced financial dashboard.

Top financial summary:

1. Total Net Worth.
2. Total Assets.
3. Total Liabilities.
4. Total Income.
5. Total Expenses.
6. Monthly Savings.
7. Savings Rate.
8. Total Investments.
9. Investment Returns.
10. Available Balance.

Charts:

- Income vs Expenses.
- Monthly Cash Flow.
- Net Worth Growth.
- Expense Breakdown.
- Category-wise Spending.
- Asset Allocation.
- Investment Allocation.
- Liability Distribution.
- Savings Trend.

Dashboard widgets:

- Recent Transactions.
- Upcoming Bills.
- Recurring Payments.
- Budget Progress.
- Recent Investments.
- Credit Card Due Dates.
- Financial Goals.
- Account Balances.
- Monthly Financial Summary.

Date filters:

- Today.
- This Week.
- This Month.
- Last Month.
- This Year.
- Last Year.
- Custom Range.

All widgets and charts must use actual authenticated-user database records.

==================================================
7. TRANSACTION MANAGEMENT
==================================================

Create a complete transaction management module.

Transaction types:

- Income.
- Expense.
- Transfer.
- Refund.
- Investment.
- Loan Received.
- Loan Given.
- Loan Repayment.

Transaction fields:

- Transaction ID.
- Date and Time.
- Amount.
- Type.
- Account.
- Category.
- Subcategory.
- Merchant.
- Payment Method.
- Reference Number.
- Description.
- Notes.
- Tags.
- Source.
- Attachment.

Sources:

- Manual Entry.
- CSV Import.
- Excel Import.
- PDF Statement Import.
- Android SMS Synchronization.
- Payment Notification Synchronization.

Features:

- Add.
- Edit.
- Delete.
- Duplicate.
- Bulk edit.
- Bulk delete.
- Search.
- Sort.
- Pagination.
- Date filtering.
- Account filtering.
- Category filtering.
- Merchant filtering.
- Export.

Build a professional transaction table with responsive mobile layouts.

Implement transaction deduplication.

Never double-count transfers between the user's own accounts.

Refunds must be represented accurately.

Credit card purchases and credit card bill payments must not be counted twice as expenses.

==================================================
8. ACCOUNT MANAGEMENT
==================================================

Allow users to manage multiple financial accounts.

Account types:

- Savings Account.
- Current Account.
- Salary Account.
- Cash.
- UPI-linked Account.
- Fixed Deposit.
- Recurring Deposit.
- Credit Card.
- Loan Account.
- Other.

Features:

- Create account.
- Edit account.
- Archive account.
- Opening balance.
- Current balance.
- Account statement.
- Transaction history.
- Account reconciliation.
- Inter-account transfers.
- Bank-wise summary.
- Balance history.

Allow users to assign custom account names, colors and icons.

==================================================
9. BANK STATEMENT IMPORT
==================================================

Create a smart statement-import module.

Supported formats:

- CSV.
- XLSX.
- PDF.

Import workflow:

1. Upload statement.
2. Identify file format and bank.
3. Extract transaction records.
4. Detect available columns.
5. Map columns.
6. Preview transactions.
7. Detect duplicates.
8. Suggest categories.
9. Ask user to confirm.
10. Save transactions.

Support configurable Indian bank statement templates.

Maintain import history.

Never automatically import uncertain transactions without user confirmation.

==================================================
10. ANDROID SMS AND PAYMENT NOTIFICATION SYNC
==================================================

IMPORTANT:

The web application cannot directly access the phone's SMS inbox through a browser.

The Android companion application will handle permitted SMS and notification access.

Build the web application's secure synchronization infrastructure.

Requirements:

- Authenticated device registration.
- Device-specific credentials.
- Secure API requests.
- Transaction synchronization.
- Offline sync support.
- Idempotency.
- Duplicate detection.
- Sync history.
- Last sync time.
- Device revocation.

Suggested API routes:

POST /api/v1/devices/register
GET /api/v1/devices
DELETE /api/v1/devices/:id
POST /api/v1/transactions/sync
GET /api/v1/sync/status

Payload fields:

- External Transaction ID.
- Amount.
- Transaction Type.
- Merchant.
- Account Identifier.
- Transaction Timestamp.
- Reference Number.
- Source Application.
- Parser Confidence.
- Masked Account Suffix.

Security:

- Authenticate every device.
- Validate all incoming records.
- Never trust client-provided user IDs.
- Do not upload OTP messages.
- Do not upload unrelated personal SMS conversations.
- Do not store the complete SMS inbox.
- Apply per-user transaction ownership.
- Support manual review for uncertain matches.

The Android application must be able to work offline and synchronize later.

==================================================
11. CATEGORIES AND MERCHANT MANAGEMENT
==================================================

Default expense categories:

- Food & Dining.
- Groceries.
- Shopping.
- Transportation.
- Fuel.
- Rent.
- Electricity.
- Water.
- Internet.
- Mobile Recharge.
- Healthcare.
- Education.
- Entertainment.
- Travel.
- Insurance.
- Subscriptions.
- Personal Care.
- Household.
- Miscellaneous.

Default income categories:

- Salary.
- Business Income.
- Freelancing.
- Interest.
- Dividends.
- Rental Income.
- Refunds.
- Other Income.

Features:

- Custom categories.
- Subcategories.
- Custom icons.
- Custom colors.
- Category rules.
- Merchant management.
- Category-wise reporting.

Allow users to edit or delete custom categories without breaking historical transaction records.

==================================================
12. BUDGET MANAGEMENT
==================================================

Features:

- Monthly budgets.
- Annual budgets.
- Category budgets.
- Custom date ranges.
- Budget rollover.
- Spending limits.
- Remaining budget.
- Budget utilization.
- Overspending alerts.
- Budget comparison.

Visualize:

- Budgeted amount.
- Actual expenses.
- Remaining amount.
- Percentage used.

==================================================
13. RECURRING TRANSACTIONS AND SUBSCRIPTIONS
==================================================

Manage:

- Netflix.
- YouTube Premium.
- Rent.
- Insurance.
- Internet bills.
- Utility bills.
- Loan EMIs.
- SIPs.
- Other recurring payments.

Features:

- Daily.
- Weekly.
- Monthly.
- Quarterly.
- Yearly.
- Custom recurrence.
- Next payment date.
- Expected amount.
- Reminders.
- Active and cancelled status.

Implement reliable scheduling without depending on permanent server processes.

==================================================
14. INVESTMENT PORTFOLIO
==================================================

Create an advanced investment management module.

Indian Stocks:

- NSE.
- BSE.
- Multiple brokers.
- Holdings.
- Buy and sell records.
- Dividends.

US Stocks:

- Multiple brokers.
- USD valuation.
- INR conversion.
- Holdings and transactions.

Mutual Funds:

- Direct plans.
- Regular plans.
- SIP.
- Lump Sum.
- Redeemed units.
- NAV tracking.

ETFs:

- Equity ETFs.
- Index ETFs.
- Gold ETFs.
- Silver ETFs.

Other Investments:

- Sovereign Gold Bonds.
- Physical Gold.
- Digital Gold.
- Fixed Deposits.
- Recurring Deposits.
- PPF.
- EPF.
- NPS.
- Manually tracked cryptocurrency assets.

Dashboard metrics:

- Total Invested.
- Current Valuation.
- Unrealized Profit/Loss.
- Realized Profit/Loss.
- Absolute Return.
- XIRR.
- Asset Allocation.
- Broker-wise Portfolio.
- Investment History.

Allow manual entry and spreadsheet imports.

Do not require paid market-data APIs.

Create an optional market-data provider interface.

Clearly label stale, delayed and manually entered valuations.

Use appropriate foreign exchange rates for multi-currency investments.

==================================================
15. CREDIT CARD MANAGEMENT
==================================================

Features:

- Multiple cards.
- Card issuer.
- Card name.
- Last four digits.
- Credit limit.
- Outstanding balance.
- Available credit.
- Billing cycle.
- Statement date.
- Payment due date.
- Minimum payment.
- Full payment.
- Utilization percentage.
- Payment history.

Generate due-date reminders.

Ensure credit card transactions and repayments are accounted for correctly.

==================================================
16. LOAN AND LIABILITY MANAGEMENT
==================================================

Support:

- Personal Loans.
- Education Loans.
- Home Loans.
- Vehicle Loans.
- Credit Card Debt.
- Loans Given.
- Loans Received.
- Other Debts.

Fields:

- Principal.
- Interest Rate.
- EMI.
- Start Date.
- End Date.
- Outstanding Balance.
- Lender.
- Borrower.
- Payment Frequency.

Build:

- Repayment schedule.
- Interest calculation.
- Outstanding balance.
- EMI history.
- Loan progress.
- Liability reports.

==================================================
17. ASSET MANAGEMENT AND NET WORTH
==================================================

Asset categories:

- Bank Balances.
- Cash.
- Stocks.
- Mutual Funds.
- ETFs.
- Gold.
- Fixed Deposits.
- Real Estate.
- Vehicles.
- Other Assets.

Liability categories:

- Home Loans.
- Personal Loans.
- Education Loans.
- Credit Card Outstanding.
- Personal Debts.
- Other Obligations.

Net Worth = Total Assets - Total Liabilities.

Features:

- Asset valuation.
- Historical valuation.
- Monthly net worth.
- Yearly net worth.
- Asset allocation.
- Liability allocation.
- Net worth growth charts.

Prevent duplicate asset representation.

For example, a mutual fund holding must not be counted both as an investment and as an independently added asset.

==================================================
18. FINANCIAL GOALS
==================================================

Allow users to create:

- Emergency Fund.
- House Purchase.
- Vehicle Purchase.
- Vacation.
- Education.
- Retirement.
- Investment Target.
- Custom Goals.

Fields:

- Goal Name.
- Target Amount.
- Current Amount.
- Target Date.
- Monthly Contribution.

Calculate goal progress and estimated completion date.

==================================================
19. REPORTS AND ANALYTICS
==================================================

Create:

- Monthly Financial Report.
- Annual Financial Report.
- Income Report.
- Expense Report.
- Category Analysis.
- Merchant Analysis.
- Account Analysis.
- Cash Flow.
- Savings Report.
- Investment Report.
- Net Worth Report.
- Credit Card Report.
- Loan Report.

Export formats:

- CSV.
- XLSX.
- PDF.

Implement date filters and comparison periods.

==================================================
20. SMART AUTOMATION
==================================================

Implement:

- Rule-based categorization.
- Merchant recognition.
- Duplicate detection.
- Recurring transaction detection.
- Unusual spending alerts.
- Budget notifications.
- Monthly financial summaries.
- Transaction review suggestions.

Start with deterministic rule-based automation.

Keep optional AI integration modular.

Do not require paid AI APIs.

All automated suggestions must be explainable and editable.

==================================================
21. DATABASE DESIGN
==================================================

Design a normalized PostgreSQL schema.

Core tables:

- profiles
- user_settings
- accounts
- transactions
- categories
- subcategories
- merchants
- budgets
- recurring_transactions
- subscriptions
- investments
- investment_transactions
- credit_cards
- loans
- loan_payments
- assets
- liabilities
- financial_goals
- devices
- sync_logs
- import_jobs
- categorization_rules
- attachments
- audit_logs

Requirements:

- UUID primary keys.
- Correct foreign key constraints.
- User ownership fields.
- Appropriate indexes.
- Created and updated timestamps.
- Soft deletion where necessary.
- Database migrations.
- Referential integrity.
- Decimal-based monetary fields.
- Row Level Security.

Use NUMERIC/DECIMAL for monetary amounts rather than floating-point types.

Use integer minor units or appropriate exact decimal arithmetic for currency calculations.

Design database relationships before implementing UI modules.

==================================================
22. SECURITY AND PRIVACY
==================================================

Implement:

- Supabase Auth.
- Server-side authentication verification.
- PostgreSQL RLS.
- Secure API authorization.
- Input validation.
- Rate limiting.
- Secure file uploads.
- XSS protection.
- CSRF protection where applicable.
- Secure session handling.
- User data export.
- Account deletion.
- Device revocation.
- Audit logging.

Never expose:

- Supabase service-role key.
- Database passwords.
- Private API secrets.
- Sensitive server environment variables.

Use least-privilege access.

Test cross-user data access attacks.

==================================================
23. USER INTERFACE NAVIGATION
==================================================

Desktop sidebar:

OVERVIEW

- Dashboard
- Net Worth

MONEY MANAGEMENT

- Transactions
- Accounts
- Transfers
- Categories

PLANNING

- Budgets
- Recurring Transactions
- Subscriptions
- Financial Goals

WEALTH

- Investments
- Assets

CREDIT AND DEBT

- Credit Cards
- Loans
- Liabilities

ANALYTICS

- Reports
- Financial Insights

AUTOMATION

- Statement Import
- SMS Synchronization
- Connected Devices
- Automation Rules

SETTINGS

- Profile
- Security
- Preferences
- Data Export

Use responsive navigation on mobile.

==================================================
24. VERCEL DEPLOYMENT ARCHITECTURE
==================================================

The application must be designed specifically for Vercel deployment.

Frontend:

- Next.js App Router.
- TypeScript.
- Tailwind CSS.

Backend:

- Next.js Route Handlers.
- Supabase APIs.
- PostgreSQL.

Deployment:

- GitHub repository.
- Vercel project.
- Supabase Cloud project.

Requirements:

1. No Docker dependency.
2. No VPS requirement.
3. No persistent Node.js server requirement.
4. Use secure environment variables.
5. Use appropriate Supabase database connection pooling if connecting through Drizzle.
6. Avoid long-lived connections in serverless functions.
7. Configure authentication redirect URLs.
8. Separate development, preview and production environments.
9. Protect privileged backend keys.
10. Implement serverless-compatible API routes.
11. Support a custom domain.
12. Verify successful production builds.

Create:

- .env.example
- Deployment documentation.
- Database migration instructions.
- Vercel configuration where needed.
- Production setup guide.

==================================================
25. PWA AND RESPONSIVE EXPERIENCE
==================================================

Build the application as a Progressive Web App where appropriate.

Features:

- Installable web application.
- Application manifest.
- Responsive icons.
- Offline application shell.
- Cached static resources.
- Appropriate offline fallback.
- Mobile navigation.
- Responsive charts and tables.

Do not cache sensitive financial information in public caches.

Do not imply that a PWA can access the SMS inbox.

==================================================
26. PROJECT DIRECTORY AND CODE QUALITY
==================================================

Use a professional modular directory structure.

Separate:

- app routes.
- UI components.
- financial modules.
- hooks.
- services.
- API clients.
- database schema.
- database migrations.
- validation schemas.
- utilities.
- types.
- tests.
- configuration.

Avoid:

- Giant React components.
- Duplicate components.
- Unnecessary dependencies.
- Business logic inside presentation components.
- Hardcoded data.
- Exposed secrets.
- Unused packages.
- Dead code.

Maintain consistent naming conventions and clear documentation.

==================================================
27. TESTING AND QUALITY ASSURANCE
==================================================

Write automated tests for:

Authentication:

- Registration.
- Login.
- Logout.
- Password recovery.
- Session expiry.

Financial calculations:

- Income.
- Expenses.
- Transfers.
- Refunds.
- Credit card balances.
- Investment returns.
- XIRR.
- Loan repayment.
- Net worth.

Data security:

- User A cannot access User B's records.
- User A cannot update User B's transactions.
- User A cannot delete User B's accounts.
- Unauthorized API requests are rejected.
- Device ownership is validated.

UI:

- Desktop responsiveness.
- Tablet responsiveness.
- Mobile responsiveness.
- Form validation.
- Loading states.
- Empty states.
- Error handling.

Run:

npm run lint
npm run typecheck
npm run test
npm run build

Also run appropriate integration and Playwright tests.

Do not claim tests passed unless they have actually been executed.

==================================================
28. ANTIGRAVITY IDE EXECUTION WORKFLOW
==================================================

You are operating inside Google Antigravity IDE.

Follow this workflow carefully.

PHASE 1 — PROJECT INSPECTION

- Inspect the current workspace.
- Identify existing files and dependencies.
- Do not overwrite existing useful work.
- Inspect the Leftovers reference project.
- Identify reusable functionality and missing features.
- Check the existing Git state.
- Report existing configuration.

PHASE 2 — ARCHITECTURE

Before implementation, prepare:

- System architecture.
- Database ER diagram.
- Database schema.
- API endpoint documentation.
- Authentication flow.
- User data isolation strategy.
- UI navigation.
- Responsive design strategy.
- Development milestones.

PHASE 3 — FOUNDATION

Implement:

- Next.js setup.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Supabase configuration.
- Authentication.
- Database schema.
- Migrations.
- RLS policies.

PHASE 4 — CORE FINANCIAL MODULES

Implement incrementally:

1. Dashboard.
2. Transactions.
3. Accounts.
4. Transfers.
5. Categories.
6. Budgets.
7. Recurring Transactions.
8. Investments.
9. Credit Cards.
10. Loans.
11. Assets and Liabilities.
12. Net Worth.
13. Financial Goals.
14. Reports.

PHASE 5 — IMPORT AND AUTOMATION

Implement:

- CSV import.
- Excel import.
- PDF import.
- Transaction categorization.
- Duplicate detection.
- SMS synchronization APIs.
- Device management.

PHASE 6 — RESPONSIVENESS

Test all major pages at:

- 320px.
- 375px.
- 390px.
- 768px.
- 1024px.
- 1440px.
- 1920px.

Fix all horizontal overflow and mobile layout issues.

PHASE 7 — QUALITY ASSURANCE

- Run tests.
- Fix TypeScript errors.
- Fix lint errors.
- Fix build errors.
- Verify database access controls.
- Verify financial calculations.
- Test API authorization.
- Test production configuration.

PHASE 8 — DEPLOYMENT

Prepare:

- GitHub repository.
- Supabase production project.
- Database migrations.
- Vercel environment variables.
- Production deployment.
- Custom domain instructions.

==================================================
29. STRICT RULES FOR AUTONOMOUS DEVELOPMENT
==================================================

1. Do not stop after creating the architecture document.
2. Do not deliver only a frontend prototype.
3. Do not use mock financial data in production features.
4. Do not create buttons without functionality.
5. Do not skip backend integration.
6. Do not skip database migrations.
7. Do not skip RLS.
8. Do not compromise user data security.
9. Do not introduce Docker.
10. Do not introduce paid API dependencies.
11. Do not create unnecessary files.
12. Do not delete useful existing code without inspection.
13. Do not break existing working modules.
14. Do not leave unfinished TODOs in critical functionality.
15. Do not claim functionality works without testing it.

When a requirement is unclear, document your assumption and choose a secure, maintainable default.

Implement in small, verifiable milestones.

After each milestone:

- Run relevant tests.
- Fix discovered issues.
- Review code quality.
- Update documentation.

Maintain a DEVELOPMENT_PROGRESS.md file documenting:

- Completed modules.
- Pending modules.
- Known bugs.
- Tests executed.
- Deployment readiness.
- Next implementation tasks.

==================================================
30. FINAL PRODUCT ACCEPTANCE CRITERIA
==================================================

The final application must:

- Support multiple independent users.
- Have complete authentication.
- Maintain strict user data isolation.
- Provide a real financial dashboard.
- Support manual and imported transactions.
- Manage multiple accounts.
- Manage investments.
- Track credit cards and loans.
- Calculate net worth accurately.
- Manage budgets and goals.
- Generate financial reports.
- Support Android transaction synchronization.
- Provide secure data export.
- Work on mobile, tablet and desktop.
- Deploy successfully to Vercel.
- Use Supabase PostgreSQL.
- Work without Docker.
- Use open-source dependencies.
- Have documentation and automated tests.

FINAL OBJECTIVE:

Deliver a professional, responsive, privacy-first, multi-user Money Manager platform that combines personal expense tracking, wealth management, investment tracking, debt management, financial analytics and Android transaction synchronization into one unified application.

Start by inspecting the workspace and creating the architecture. Then proceed with actual implementation, testing and deployment preparation.

Do not stop at planning. Deliver working software.
