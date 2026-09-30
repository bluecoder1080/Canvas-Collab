/**
 * Zod schemas = runtime validation for HTTP + WS payloads.
 * TypeScript types disappear at runtime; these guards keep bad
 * clients from crashing the server or poisoning Postgres.
 */
import { z } from "zod";

export const pointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export const shapeSchema = z.object({
  id: z.string().min(1).max(100),
  kind: z.enum(["rect", "ellipse", "diamond", "line", "arrow", "pencil", "text"]),
  x: z.number().finite(),
  y: z.number().finite(),
  w: z.number().finite(),
  h: z.number().finite(),
  stroke: z.string().max(30).default("#1e1e1e"),
  strokeWidth: z.number().min(1).max(50).default(2),
  fill: z.string().max(30).default("transparent"),
  points: z.array(pointSchema).max(5000).optional(),
  text: z.string().max(2000).optional(),
  createdBy: z.string().max(60).optional(),
});

export const signupSchema = z.object({
  name: z.string().min(1).max(60),
  email: z.string().email().max(320),
  password: z.string().min(6).max(200),
});

export const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createRoomSchema = z.object({
  name: z.string().min(1).max(100).optional().default("Untitled board"),
});

export const saveShapesSchema = z.object({
  shapes: z.array(shapeSchema).max(5000),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
