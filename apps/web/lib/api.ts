import "server-only";
import { NextResponse } from "next/server";
import { getContext, type Ctx } from "@/lib/data";
import { ForbiddenError } from "@/lib/roles";
import { ValidationError } from "@/lib/validate";
import { NotFoundError } from "@/lib/errors";

export type ApiError = { ok: false; error: "UNAUTHENTICATED" | "FORBIDDEN" | "INVALID" | "NOT_FOUND" | "RATE_LIMITED" | "SERVER"; message: string };
export const fail = (status: number, error: ApiError["error"], message: string) => NextResponse.json({ ok: false, error, message } satisfies ApiError, { status });
export const okJson = <T,>(data: T, status = 200) => NextResponse.json({ ok: true, data }, { status });

/** Wraps a route: requires login, maps known errors to JSON responses. */
export const api = <P = unknown>(handler: (ctx: Ctx, req: Request, params: P) => Promise<Response>) =>
  async (req: Request, route: { params: Promise<P> }) => {
    try {
      const ctx = await getContext();
      if (!ctx) return fail(401, "UNAUTHENTICATED", "Log in first.");
      return await handler(ctx, req, await route.params);
    } catch (e) {
      if (e instanceof ForbiddenError) return fail(403, "FORBIDDEN", "Teachers and admins only.");
      if (e instanceof ValidationError) return fail(400, "INVALID", e.message);
      if (e instanceof NotFoundError) return fail(404, "NOT_FOUND", e.message);
      console.error(e);
      return fail(500, "SERVER", (e as Error).message);
    }
  };

export const body = async (req: Request): Promise<unknown> => req.json().catch(() => { throw new ValidationError("Body must be JSON"); });
