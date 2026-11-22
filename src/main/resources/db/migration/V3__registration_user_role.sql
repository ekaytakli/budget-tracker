-- Only the default for future rows changes. Existing accounts and roles stay intact.
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'USER';
