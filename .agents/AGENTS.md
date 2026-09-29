# AI CODING RULES — EXPENSE MANAGEMENT APP

## 1. Project Goal

Build a secure, maintainable, responsive personal expense management application.

The application must:

- Work well on desktop, tablet, and mobile.
- Be designed as a responsive web application.
- Be installable as a PWA when possible.
- Have an architecture that can later be converted or packaged into Android/iOS applications.
- Be easy to maintain and extend.
- Prioritize security and user data privacy.

---

## 2. Code Quality

Always write clean, readable, maintainable code.

Follow:

- SOLID principles.
- DRY — Don't Repeat Yourself.
- KISS — Keep It Simple.
- Separation of Concerns.
- Single Responsibility Principle.

Avoid:

- God classes/components.
- Huge functions.
- Deep nested conditions.
- Duplicate logic.
- Hard-coded configuration.
- Magic numbers and magic strings.
- Unnecessary abstractions.
- Premature optimization.

Functions should perform one clear responsibility.

Split large files into smaller modules when necessary.

Do not create abstractions unless they provide real value.

---

## 3. Naming Convention

All code must use English naming.

Use descriptive names.

Variables:

```text
monthlyIncome
totalExpense
selectedCategory
transactionList
currentUser
```

Functions:

```text
createTransaction()
updateTransaction()
deleteTransaction()
calculateMonthlyBalance()
getTransactionsByMonth()
```

Boolean variables must clearly represent true/false states:

```text
isLoading
isAuthenticated
hasPermission
canEditTransaction
```

Avoid unclear names:

```text
data
temp
x
abc
obj
value1
```

unless their meaning is obvious from a very small local scope.

---

## 4. Project Architecture

Keep clear separation between:

```text
UI
Business Logic
Data Access
API
Authentication
Validation
Utilities
Configuration
```

Recommended structure:

```text
src/
  components/
  pages/
  layouts/
  features/
    auth/
    transactions/
    categories/
    budgets/
    reports/
  services/
  hooks/
  stores/
  utils/
  types/
  validators/
  config/
```

Feature-specific code should stay inside its feature whenever possible.

Shared code should only be moved into common folders when it is genuinely reusable.

---

## 5. Responsive Design

The application must be mobile-first.

Every screen must support:

```text
Mobile
Tablet
Desktop
```

Do not create desktop-only UI.

Avoid fixed widths unless necessary.

Use responsive layouts such as:

```text
Flexbox
CSS Grid
Responsive breakpoints
Relative sizing
```

Important actions must remain accessible on small screens.

Forms must be comfortable to use with touch input.

Buttons and interactive elements must have adequate touch target sizes.

Navigation should adapt between desktop and mobile layouts.

Always test layouts conceptually at common widths such as:

```text
375px
768px
1024px
1440px
```

---

## 6. Mobile App Compatibility

Design the web application so it can later become a mobile application with minimal business logic changes.

Keep business logic independent from browser-specific UI whenever possible.

Do not tightly couple core logic to:

```text
window
document
localStorage
browser-only APIs
```

Wrap platform-specific APIs behind services or adapters.

Example:

```text
StorageService
NotificationService
AuthenticationService
ExportService
```

The project should be compatible with a future migration or packaging solution such as Capacitor.

Prefer PWA-compatible architecture.

---

## 7. Security

Security is mandatory.

Never sacrifice security for development speed.

Never store:

```text
passwords
API secrets
private keys
database credentials
access secrets
```

directly in source code.

Use environment variables for configuration and secrets.

Never commit `.env` files containing real secrets.

---

## 8. Authentication

Passwords must never be stored as plain text.

On the backend, passwords must be hashed using a strong password hashing algorithm such as:

```text
Argon2
bcrypt
```

Authentication and authorization must be handled separately.

Never trust a user ID sent by the frontend to determine resource ownership.

The backend must determine the authenticated user from the verified authentication context.

Every protected API endpoint must verify authentication.

Every user-specific resource must verify ownership or permission.

Example:

A user must never be able to access another user's transaction by changing:

```text
/transactions/100
```

to:

```text
/transactions/101
```

---

## 9. API Security

Never trust frontend input.

All incoming data must be validated on the server.

Validate:

```text
type
format
length
range
required fields
allowed values
ownership
permissions
```

Use proper HTTP status codes.

Do not expose:

```text
stack traces
database errors
internal paths
secret configuration
sensitive implementation details
```

to clients.

Use rate limiting for sensitive endpoints when appropriate.

Examples:

```text
login
register
password reset
OTP verification
data export
```

Apply appropriate protection against:

```text
SQL Injection
XSS
CSRF
Broken Access Control
IDOR
Brute Force
Mass Assignment
Injection attacks
```

Use parameterized queries or a safe ORM/query builder.

Never construct SQL using raw user input.

---

## 10. Financial Data Rules

Money must never use floating-point arithmetic when precision matters.

Do not rely on:

```text
0.1 + 0.2
```

style floating-point calculations for stored financial values.

Prefer:

```text
integer minor units
```

Example:

```text
100000 VND
```

can be stored as an integer amount.

For currencies with decimal minor units, store the smallest currency unit when appropriate.

Each transaction should contain explicit information such as:

```text
id
userId
type
amount
currency
categoryId
date
description
createdAt
updatedAt
```

Transaction types should be explicitly defined, for example:

```text
INCOME
EXPENSE
TRANSFER
```

Do not infer transaction type from positive or negative values alone.

---

## 11. Data Privacy

Financial information is sensitive.

Return only the minimum required data from APIs.

Do not log:

```text
passwords
tokens
authorization headers
financial data unnecessarily
personal sensitive information unnecessarily
```

Sensitive operations should have appropriate authorization checks.

Data belonging to different users must remain isolated.

---

## 12. Validation

Use centralized validation schemas where practical.

Frontend validation improves UX.

Backend validation is mandatory.

Never assume frontend validation provides security.

Provide clear validation messages without exposing internal system details.

---

## 13. Error Handling

Do not silently ignore errors.

Use centralized error handling when appropriate.

Users should receive understandable messages.

Developers should receive useful diagnostic information through safe logging.

Do not display raw exceptions to users.

Handle:

```text
network failures
API failures
authentication expiration
invalid input
missing data
permission errors
unexpected server errors
```

---

## 14. State Management

Keep state as local as possible.

Do not put everything into global state.

Separate:

```text
server state
UI state
authentication state
persistent preferences
```

Avoid unnecessary duplicated state.

Do not store derived values when they can be safely calculated from existing state.

---

## 15. Database

Use migrations for database schema changes.

Use:

```text
primary keys
foreign keys
indexes
unique constraints
NOT NULL constraints
```

where appropriate.

Never rely only on frontend rules to maintain database integrity.

All user-owned records must have a clear ownership relationship.

Financial records should not be accidentally lost through unsafe cascade deletion.

Use transactions for database operations that must succeed or fail atomically.

---

## 16. Core Features

The architecture should support:

```text
User registration
Login / Logout
Income management
Expense management
Transaction history
Categories
Monthly budgets
Savings goals
Dashboard
Monthly statistics
Income vs expense reports
Category reports
Search
Filtering
Date filtering
Currency settings
Profile settings
Data export
```

The architecture should allow future features such as:

```text
Recurring transactions
Notifications
Cloud synchronization
Multiple wallets
Multiple currencies
Bank integrations
Receipt attachments
Shared wallets
Biometric authentication on mobile
```

Do not implement future features unless requested, but do not design the system in a way that makes them unnecessarily difficult to add.

---

## 17. UI/UX

Keep the interface simple and fast.

Important information should be visible quickly:

```text
Current balance
Monthly income
Monthly expenses
Remaining budget
Recent transactions
Expense distribution
```

Forms should require as few steps as reasonably possible.

Always include appropriate states:

```text
Loading
Empty
Success
Error
Disabled
```

Confirm destructive operations such as deleting important financial records.

Do not rely only on color to communicate status.

---

## 18. Accessibility

Use semantic HTML.

Inputs must have labels.

Buttons must have meaningful accessible names.

Support keyboard navigation where applicable.

Maintain adequate text contrast.

Do not make important functionality dependent only on hover.

---

## 19. Performance

Avoid unnecessary API requests.

Avoid unnecessary component re-renders.

Use pagination or incremental loading for large transaction histories.

Optimize images and static assets.

Lazy-load heavy modules when useful.

Do not optimize prematurely at the cost of readability.

---

## 20. Testing

Important business logic must be testable.

Prioritize tests for:

```text
Authentication
Authorization
Transaction creation
Transaction editing
Transaction deletion
Money calculations
Budget calculations
Date filtering
Ownership checks
Validation
```

Security-sensitive logic should not depend only on manual testing.

---

## 21. Comments

Do not write comments that simply repeat what the code already says.

Bad:

```text
// Get user
const user = getUser();
```

Comments are acceptable when explaining:

```text
Security decisions
Complex algorithms
Non-obvious business rules
Workarounds
Important architectural decisions
```

Prefer self-explanatory code over excessive comments.

---

## 22. Dependencies

Do not install a library when the requirement can be solved cleanly with existing dependencies or simple code.

Before adding a dependency, consider:

```text
Security
Maintenance
Bundle size
Mobile compatibility
License
Long-term support
```

Avoid abandoned or unnecessary packages.

---

## 23. AI Coding Behavior

Before implementing a feature:

1. Understand the requirement.
2. Identify affected modules.
3. Consider security implications.
4. Consider desktop and mobile behavior.
5. Reuse existing architecture where appropriate.
6. Implement the smallest clean solution.

When modifying existing code:

- Read the relevant existing code first.
- Follow the existing project conventions.
- Do not rewrite unrelated files.
- Do not remove working functionality without a reason.
- Do not introduce breaking changes unnecessarily.
- Avoid duplicated implementations.
- Update related types, validation, tests, and API contracts when required.

Never generate fake APIs or pretend functionality is implemented when it is not.

Never bypass authentication or validation just to make a feature work.

Never disable security checks as a temporary solution.

Never expose secrets to frontend code.

---

## 24. Priority Order

When making technical decisions, prioritize:

```text
1. Security
2. Data correctness
3. Maintainability
4. User experience
5. Mobile/Desktop compatibility
6. Performance
7. Development speed
```

The final implementation should be simple, secure, readable, and production-oriented rather than over-engineered.