import { it, expect } from "vitest";
import { requireStaff } from "@/lib/roles";
it("only teachers/admins pass", () => {
  expect(() => requireStaff("student")).toThrow("FORBIDDEN");
  expect(() => requireStaff(null)).toThrow("FORBIDDEN");
  expect(() => requireStaff("teacher")).not.toThrow();
  expect(() => requireStaff("admin")).not.toThrow();
});
