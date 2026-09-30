/**
 * Auth controller: signup / signin.
 * Flow: validate (zod) -> check DB -> bcrypt -> sign JWT -> respond.
 */
import {
  createUser,
  findUserByEmail,
  signinSchema,
  signupSchema,
} from "@repo/shared";
import { createUser as dbCreateUser, findUserByEmail as dbFindByEmail } from "@repo/db";
import type { Response } from "express";
import { HttpError } from "../middleware/errorHandler.js";
import type { AuthRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signToken } from "../utils/jwt.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

// Re-exported so routes stay one-liners. (Validators live in @repo/shared.)
void createUser;
void findUserByEmail;

function publicUser(row: { id: string; name: string; email: string }) {
  return { id: row.id, name: row.name, email: row.email };
}

export const signup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = signupSchema.safeParse(req.body);
  if (!input.success) throw new HttpError(400, "Invalid name, email or password");

  const existing = await dbFindByEmail(input.data.email);
  if (existing) throw new HttpError(409, "Email already registered");

  const row = await dbCreateUser(
    input.data.name,
    input.data.email,
    await hashPassword(input.data.password),
  );
  res.status(201).json({ user: publicUser(row), token: signToken(row.id) });
});

export const signin = asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = signinSchema.safeParse(req.body);
  if (!input.success) throw new HttpError(400, "Invalid email or password");

  const row = await dbFindByEmail(input.data.email);
  if (!row) throw new HttpError(401, "Invalid email or password");

  const ok = await verifyPassword(input.data.password, row.password_hash);
  if (!ok) throw new HttpError(401, "Invalid email or password");

  res.json({ user: publicUser(row), token: signToken(row.id) });
});
