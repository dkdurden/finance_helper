# Gate Signup for Single-User V1

Date: 2026-10-12

## Context

V1 uses Django session authentication but does not assign finance records to an owner. Accounts, categories, transactions, transfers, products, and receipts are shared across authenticated users. Leaving signup open would therefore allow newly registered users to access the same financial dataset.

## Decision

Treat V1 as a single-user application and disable signup by default.

The API reads `DJANGO_ALLOW_SIGNUP`. Signup is enabled only when the value is explicitly set to `true`, `1`, `yes`, or `on`. Local onboarding can opt in through `apps/api/.env`; deployments should leave signup disabled after the intended user is created.

## Impact

- Login and existing sessions continue to work normally.
- Disabled signup requests return `403 Forbidden`.
- The frontend may continue to show its signup form, but the API remains authoritative and returns a clear disabled message.
- Authentication does not provide tenant isolation in V1.
- Supporting multiple users later requires owner relationships, filtered querysets, and same-owner validation across linked finance records.
