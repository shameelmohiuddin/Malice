export type Role = "student" | "teacher" | "admin";
export class ForbiddenError extends Error { constructor() { super("FORBIDDEN"); } }
export const requireStaff = (role: Role | null | undefined): void => {
  if (role !== "teacher" && role !== "admin") throw new ForbiddenError();
};
