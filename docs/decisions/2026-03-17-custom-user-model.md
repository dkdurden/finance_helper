# Use a Custom Email-First User Model

Date: 2026-03-17

## Context

The project initially relied on Django's default `User` model while beginning a small signup API slice.
That default model uses `username` as the primary login identifier.

As auth design became clearer, the project direction shifted toward:

- using email as the canonical login field
- avoiding a redundant `username` field
- keeping the auth foundation flexible for future growth
- still staying close to Django's built-in auth system

Because the project is still early and there is no important production data yet, this was the right time to make the identity-model change cleanly.

## Decision

Use a project-owned custom user model in `finance.models.User` based on `AbstractUser`.

Customize it to be email-first by:

- removing `username`
- making `email` unique
- setting `USERNAME_FIELD = "email"`
- setting `REQUIRED_FIELDS = []`
- using a custom user manager for email-based user and superuser creation

Keep the model otherwise close to Django's default auth behavior.

## Why

- Preserves Django's built-in auth, password hashing, permissions, and admin compatibility.
- Avoids storing the same identity in both `username` and `email`.
- Creates a cleaner long-term foundation if user-related fields are added later.
- Keeps future login behavior aligned with the actual product UX, where users identify themselves by email.
- Makes future auth work simpler than continuing with an email-as-username compromise.

## Impact

- `AUTH_USER_MODEL` now points to `finance.User`.
- Finance migrations were reset early so the custom user model exists from the start of the migration chain.
- Signup now creates users against the email-first custom model.
- Future backend auth work should continue using `get_user_model()` and `settings.AUTH_USER_MODEL` rather than importing Django's default `User` directly.
- Any future related user data can still be added either to the custom user model or to separate user-owned models, depending on whether the data belongs to identity/auth or to domain/profile concerns.