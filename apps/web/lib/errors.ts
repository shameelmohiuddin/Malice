import { ValidationError } from "@/lib/validate";

export class NotFoundError extends Error {}

/** Turn a Supabase/Postgres error into something a user can act on. */
export const dbError = (e: { code?: string; message: string }, duplicateMessage = "That already exists"): Error =>
  e.code === "23505" ? new ValidationError(duplicateMessage) : e.code === "23514" ? new ValidationError("That value isn't allowed") : new Error(e.message);
