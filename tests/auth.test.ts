import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

describe("Authentication Validation Schemas", () => {
  it("should validate a correct login payload", () => {
    const valid = {
      email: "finance.user@example.com",
      password: "SecurePassword123!",
      rememberMe: true,
    };
    const result = loginSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("should reject invalid login email", () => {
    const invalid = {
      email: "not-an-email",
      password: "ValidPassword123",
    };
    const result = loginSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("valid email");
    }
  });

  it("should reject registration if passwords do not match", () => {
    const mismatched = {
      fullName: "Nehal Alam",
      email: "nehal@example.com",
      password: "Password123",
      confirmPassword: "DifferentPassword123",
      acceptTerms: true,
    };
    const result = registerSchema.safeParse(mismatched);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Passwords do not match");
    }
  });

  it("should enforce strong password rules on registration", () => {
    const weakPassword = {
      fullName: "Nehal Alam",
      email: "nehal@example.com",
      password: "weak",
      confirmPassword: "weak",
      acceptTerms: true,
    };
    const result = registerSchema.safeParse(weakPassword);
    expect(result.success).toBe(false);
  });

  it("should require terms acceptance on registration", () => {
    const unacceptedTerms = {
      fullName: "Nehal Alam",
      email: "nehal@example.com",
      password: "Password123",
      confirmPassword: "Password123",
      acceptTerms: false,
    };
    const result = registerSchema.safeParse(unacceptedTerms);
    expect(result.success).toBe(false);
  });

  it("should validate forgot password email", () => {
    expect(
      forgotPasswordSchema.safeParse({ email: "valid@domain.com" }).success
    ).toBe(true);
    expect(
      forgotPasswordSchema.safeParse({ email: "invalid-email" }).success
    ).toBe(false);
  });

  it("should validate reset password schema", () => {
    const valid = {
      password: "NewPassword123",
      confirmPassword: "NewPassword123",
    };
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true);
  });
});

