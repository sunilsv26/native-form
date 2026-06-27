/* @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";

import { FieldNode } from "../src/FieldNode";
import {
  createValidationPipeline,
  ValidationPipeline,
} from "../src/ValidationPipeline";
import { StandardSchemaV1, Validator } from "../src/Validation";

describe("ValidationPipeline", () => {
  it("uses native validation when no schema/validator is provided", async () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.name = "email";
    input.setCustomValidity("Email is required");
    form.append(input);

    const field = new FieldNode(input);
    const pipeline = createValidationPipeline();
    const controller = new AbortController();

    const result = await pipeline.validate(
      { email: "" },
      {
        form,
        signal: controller.signal,
        fields: [field],
      },
    );

    expect(result).toEqual({
      success: false,
      issues: [{ name: "email", message: "Email is required" }],
    });
  });

  it("uses native field-only validation in validateField", async () => {
    const form = document.createElement("form");
    const email = document.createElement("input");
    email.name = "email";
    email.setCustomValidity("Email is required");
    const password = document.createElement("input");
    password.name = "password";
    password.setCustomValidity("Password is required");

    form.append(email, password);

    const emailField = new FieldNode(email);
    const passwordField = new FieldNode(password);
    const pipeline = createValidationPipeline();
    const controller = new AbortController();

    const result = await pipeline.validateField(
      emailField,
      { email: "", password: "" },
      {
        form,
        signal: controller.signal,
        fields: [emailField, passwordField],
      },
    );

    expect(result).toEqual({
      success: false,
      issues: [{ name: "email", message: "Email is required" }],
    });
  });

  it("adapts standard schema validation results", async () => {
    const schema: StandardSchemaV1<{ email: FormDataEntryValue }> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({
          value: { email: "a@example.com" },
        }),
      },
    };
    const pipeline = createValidationPipeline({ schema });
    const form = document.createElement("form");
    const controller = new AbortController();

    const result = await pipeline.validate(
      { email: "a@example.com" },
      {
        form,
        signal: controller.signal,
        fields: [],
      },
    );

    expect(result).toEqual({
      success: true,
      values: { email: "a@example.com" },
    });
  });

  it("forwards abort signal and context to validator", async () => {
    const validator: Validator = {
      validate: vi.fn((_values, context) => {
        if (context.signal.aborted) {
          return {
            success: false,
            issues: [{ name: "", message: "aborted" }],
          };
        }

        return {
          success: true,
          values: {},
        };
      }),
    };
    const pipeline = createValidationPipeline({ validator });
    const form = document.createElement("form");
    const controller = new AbortController();
    controller.abort();

    const result = await pipeline.validate(
      {},
      {
        form,
        signal: controller.signal,
        fields: [],
      },
    );

    expect(validator.validate).toHaveBeenCalledOnce();
    expect(validator.validate).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ signal: controller.signal, form }),
    );
    expect(result).toEqual({
      success: false,
      issues: [{ name: "", message: "aborted" }],
    });
  });

  it("prefers schema when both schema and validator are provided", async () => {
    const schemaValidate = vi.fn(() => ({
      value: { email: "schema@example.com" },
    }));
    const schema: StandardSchemaV1<{ email: FormDataEntryValue }> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: schemaValidate,
      },
    };
    const validator: Validator<{ email: FormDataEntryValue }> = {
      validate: vi.fn(() => ({
        success: true,
        values: { email: "validator@example.com" },
      })),
    };

    const pipeline = createValidationPipeline({ schema, validator });
    const form = document.createElement("form");
    const controller = new AbortController();

    const result = await pipeline.validate(
      { email: "input@example.com" },
      {
        form,
        signal: controller.signal,
        fields: [],
      },
    );

    expect(schemaValidate).toHaveBeenCalledOnce();
    expect(validator.validate).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      values: { email: "schema@example.com" },
    });
  });
});
