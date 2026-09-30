/**
 * Minimal user store (for optional JWT auth).
 * Passwords are NEVER stored in plain text — only bcrypt hashes.
 */
import { query } from "./pool.js";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export async function findUserByEmail(email: string) {
  const { rows } = await query<UserRow>(`SELECT * FROM users WHERE email = $1`, [
    email.toLowerCase(),
  ]);
  return (rows[0] as UserRow | undefined) ?? null;
}

export async function createUser(name: string, email: string, passwordHash: string) {
  const { rows } = await query<UserRow>(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
     RETURNING id, name, email, password_hash, created_at`,
    [name, email.toLowerCase(), passwordHash],
  );
  return rows[0] as UserRow;
}
