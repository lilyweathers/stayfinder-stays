# Database changes

Use the existing development Supabase/PostgreSQL project. This folder is
reserved for versioned SQL describing its schema, constraints, and policies.
No database changes have been applied by the repository preparation steps.

Before adding migrations, record the current schema from the existing project
and compare it with the columns documented in `backend/README.md`. Do not run
new CREATE TABLE statements over existing tables blindly. Future SQL changes
should be committed here so the database setup can be reproduced.

Do not include passwords, API keys, connection strings, or real user data in
schema files. The backend's connection settings stay in `backend/.env`.
