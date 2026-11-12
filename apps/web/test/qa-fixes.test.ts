import { it, expect } from "vitest";
import { dbError, NotFoundError } from "@/lib/errors";
import { ValidationError } from "@/lib/validate";

it("I2: unique violations become a readable validation error", () => {
  expect(dbError({ code: "23505", message: "dup" }, "That class is already cancelled")).toBeInstanceOf(ValidationError);
  expect(dbError({ code: "23505", message: "dup" }, "That class is already cancelled").message).toBe("That class is already cancelled");
  expect(dbError({ code: "XX000", message: "boom" }).message).toBe("boom");
  expect(new NotFoundError("x")).toBeInstanceOf(Error);
});
