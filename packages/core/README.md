# @openpromo/core

Core package where shared core infra (db, storage, email service clients) and business logic resides.

## Folder structure

- `/providers`: cloud service provider sdk / clients
- `/schema`: db schema (dizzle) definitions and inferred types
- `/helpers`: infra components / service clients (e.g. env helper db/storage/email clients)
- `/domain`: scoped business logic, including abstracted representation (e.g. entities), actions(e.g. atomic CRUD sets), workflows, etc.
- `/util`: mundane / language-specific or runtime-specific utilities
