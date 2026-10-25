/* @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";

import { Runtime } from "../src/Runtime";
import {
  StandardSchemaV1,
  ValidationResult,
  Validator,
} from "../src/Validation";
import { ValidationPipeline } from "../src/ValidationPipeline";
import { NativeFormValues } from "../src/types";

describe("Runtime", () => {
  it("discovers and serializes native form controls", () => {
    const form = createForm(`
      <input name="email" value="a@example.com" />
      <input name="roles" value="admin" />
      <input name="roles" value="editor" />
      <button>Submit</button>
    `);
    const runtime = new Runtime();

    runtime.mount(form);

    expect(runtime.fields.map((field) => field.name)).toEqual([
      "email",
      "roles",
    ]);
    expect(runtime.serialize()).toEqual({
      email: "a@example.com",
      roles: ["admin", "editor"],
    });
  });

  it("respects native serialization semantics for disabled and radio controls", () => {
    const form = createForm(`
      <input name="email" value="a@example.com" />
      <input name="internal" value="secret" disabled />
      <input type="radio" name="plan" value="basic" />
      <input type="radio" name="plan" value="pro" checked />
    `);
    const runtime = new Runtime();

    runtime.mount(form);

    expect(runtime.serialize()).toEqual({
      email: "a@example.com",
      plan: "pro",
    });
  });

  it("serializes and tracks select-multiple values through change lifecycle", async () => {
    const form = createForm(`
      <select name="tags" multiple>
        <option value="a">A</option>
        <option value="b">B</option>
        <option value="c">C</option>
      </select>
    `);
    const select = form.elements.namedItem("tags") as HTMLSelectElement;
    const runtime = new Runtime();

    runtime.mount(form);

    select.options[0].selected = true;
    select.options[2].selected = true;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    expect(runtime.serialize()).toEqual({
      tags: ["a", "c"],
    });
    expect(runtime.getFieldState("tags")).toMatchObject({
      value: ["a", "c"],
      dirty: true,
    });
  });

  it("respects native checkbox serialization semantics", () => {
    const form = createForm(`
      <input type="checkbox" name="terms" value="accepted" checked />
      <input type="checkbox" name="newsletter" value="yes" />
    `);
    const runtime = new Runtime();

    runtime.mount(form);

    expect(runtime.serialize()).toEqual({
      terms: "accepted",
    });
  });

  it("tracks dirty, touched, and native reset state", async () => {
    const form = createForm('<input name="email" value="a@example.com" />');
    const input = form.elements.namedItem("email") as HTMLInputElement;
    const runtime = new Runtime();
    const listener = vi.fn();

    runtime.subscribe(listener);
    runtime.mount(form);

    input.value = "new@example.com";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(runtime.getFieldState("email")).toMatchObject({
      dirty: true,
      touched: false,
      value: "new@example.com",
    });

    input.dispatchEvent(new FocusEvent("blur", { bubbles: true }));

    expect(runtime.getFieldState("email")).toMatchObject({
      dirty: true,
      touched: true,
    });

    form.reset();
    await Promise.resolve();

    expect(runtime.getFieldState("email")).toMatchObject({
      dirty: false,
      touched: false,
      value: "a@example.com",
    });
    expect(listener).toHaveBeenCalledWith({
      type: "form:reset",
      values: { email: "a@example.com" },
    });
  });

  it("blocks submit and projects schema errors onto native controls", async () => {
    const form = createForm('<input name="email" />');
    const input = form.elements.namedItem("email") as HTMLInputElement;
    const onSubmit = vi.fn();
    const validator: Validator = {
      validate: () => ({
        success: false,
        issues: [{ name: "email", message: "Email is required" }],
      }),
    };
    const runtime = new Runtime({ validator, onSubmit });

    runtime.mount(form);

    const result = await runtime.submit();

    expect(result).toEqual({
      success: false,
      issues: [{ name: "email", message: "Email is required" }],
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(input.validationMessage).toBe("Email is required");
    expect(runtime.getFieldState("email")).toMatchObject({
      error: "Email is required",
    });
    expect(runtime.getFormState()).toMatchObject({
      valid: false,
      errors: { email: "Email is required" },
    });
  });

  it("submits typed values after successful validation", async () => {
    const form = createForm('<input name="email" value="a@example.com" />');
    const onSubmit = vi.fn();
    const validator: Validator<{ email: FormDataEntryValue }> = {
      validate: (values) => ({
        success: true,
        values: { email: values.email as FormDataEntryValue },
      }),
    };
    const runtime = new Runtime({ validator, onSubmit });

    runtime.mount(form);

    await expect(runtime.submit()).resolves.toEqual({
      success: true,
      values: { email: "a@example.com" },
    });
    expect(onSubmit).toHaveBeenCalledWith(
      { email: "a@example.com" },
      undefined,
    );
  });

  it("submits nested typed values from dotted field names", async () => {
    const form = createForm(`
      <input name="user.email" value="a@example.com" />
      <input name="user.password" value="secret123" />
    `);
    const onSubmit = vi.fn();
    const validator: Validator<{
      user: { email: string; password: string };
    }> = {
      validate: (values) => ({
        success: true,
        values: {
          user: {
            email: String(values["user.email"] ?? ""),
            password: String(values["user.password"] ?? ""),
          },
        },
      }),
    };
    const runtime = new Runtime({ validator, onSubmit });

    runtime.mount(form);

    await expect(runtime.submit()).resolves.toEqual({
      success: true,
      values: {
        user: {
          email: "a@example.com",
          password: "secret123",
        },
      },
    });
    expect(onSubmit).toHaveBeenCalledWith(
      {
        user: {
          email: "a@example.com",
          password: "secret123",
        },
      },
      undefined,
    );
  });

  it("projects dotted validation issues to form errors and matching field UI", async () => {
    const form = createForm(`
      <input name="user.email" value="not-an-email" />
      <input name="user.password" value="secret123" />
    `);
    const email = form.elements.namedItem("user.email") as HTMLInputElement;
    const validator: Validator = {
      validate: () => ({
        success: false,
        issues: [{ name: "user.email", message: "Enter a valid email" }],
      }),
    };
    const runtime = new Runtime({ validator });

    runtime.mount(form);

    await expect(runtime.submit()).resolves.toEqual({
      success: false,
      issues: [{ name: "user.email", message: "Enter a valid email" }],
    });

    expect(runtime.getFormState().errors).toEqual({
      "user.email": "Enter a valid email",
    });
    expect(runtime.getFieldState("user.email")).toMatchObject({
      error: "Enter a valid email",
    });
    expect(runtime.getFieldState("user.password")?.error).toBeUndefined();

    expect(email.validationMessage).toBe("Enter a valid email");
    const errorElement = email.nextElementSibling as HTMLElement;
    expect(errorElement?.dataset.nativeFormError).toBe("true");
    expect(errorElement?.textContent).toBe("Enter a valid email");
  });

  it("clears dotted field error UI after subsequent successful change validation", async () => {
    const form = createForm(`
      <input name="user.email" value="" />
      <input name="user.password" value="secret123" />
    `);
    const email = form.elements.namedItem("user.email") as HTMLInputElement;
    const validator: Validator = {
      validate: (values) => {
        const emailValue = String(values["user.email"] ?? "");

        if (!emailValue.includes("@")) {
          return {
            success: false,
            issues: [{ name: "user.email", message: "Enter a valid email" }],
          };
        }

        return {
          success: true,
          values,
        };
      },
    };
    const runtime = new Runtime({ validator });

    runtime.mount(form);

    // First change is invalid -> dotted error should appear.
    email.value = "invalid";
    email.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    expect((email.nextElementSibling as HTMLElement)?.textContent).toBe(
      "Enter a valid email",
    );
    expect(runtime.getFormState().errors).toEqual({
      "user.email": "Enter a valid email",
    });

    // Second change is valid -> dotted error should clear.
    email.value = "user@example.com";
    email.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    expect(
      form.querySelectorAll('div[data-native-form-error="true"]').length,
    ).toBe(0);
    expect(runtime.getFormState().errors).toEqual({});
  });

  it("clears dotted field error UI after subsequent successful input validation", async () => {
    const form = createForm(`
      <input name="user.email" value="" />
      <input name="user.password" value="secret123" />
    `);
    const email = form.elements.namedItem("user.email") as HTMLInputElement;
    const validator: Validator = {
      validate: (values) => {
        const emailValue = String(values["user.email"] ?? "");

        if (!emailValue.includes("@")) {
          return {
            success: false,
            issues: [{ name: "user.email", message: "Enter a valid email" }],
          };
        }

        return {
          success: true,
          values,
        };
      },
    };
    const runtime = new Runtime({ validator });

    runtime.mount(form);

    // First input is invalid -> dotted error should appear.
    email.value = "invalid";
    email.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();

    expect((email.nextElementSibling as HTMLElement)?.textContent).toBe(
      "Enter a valid email",
    );
    expect(runtime.getFormState().errors).toEqual({
      "user.email": "Enter a valid email",
    });

    // Second input is valid -> dotted error should clear.
    email.value = "user@example.com";
    email.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();

    expect(
      form.querySelectorAll('div[data-native-form-error="true"]').length,
    ).toBe(0);
    expect(runtime.getFormState().errors).toEqual({});
  });

  it("emits stable event order across invalid then valid dotted input recovery", async () => {
    const form = createForm(`
      <input name="user.email" value="" />
      <input name="user.password" value="secret123" />
    `);
    const email = form.elements.namedItem("user.email") as HTMLInputElement;
    const validator: Validator = {
      validate: (values) => {
        const emailValue = String(values["user.email"] ?? "");

        if (!emailValue.includes("@")) {
          return {
            success: false,
            issues: [{ name: "user.email", message: "Enter a valid email" }],
          };
        }

        return {
          success: true,
          values,
        };
      },
    };
    const runtime = new Runtime({ validator });
    const events: string[] = [];

    runtime.subscribe((event) => {
      events.push(event.type);
    });
    runtime.mount(form);

    email.value = "invalid";
    email.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();

    email.value = "user@example.com";
    email.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();

    expect(events).toEqual([
      "field:mount",
      "field:mount",
      "form:mount",
      "validation:start",
      "field:input",
      "field:update",
      "validation:end",
      "validation:start",
      "field:input",
      "field:update",
      "validation:end",
    ]);
  });

  it("emits stable event order across invalid then valid dotted change recovery", async () => {
    const form = createForm(`
      <input name="user.email" value="" />
      <input name="user.password" value="secret123" />
    `);
    const email = form.elements.namedItem("user.email") as HTMLInputElement;
    const validator: Validator = {
      validate: (values) => {
        const emailValue = String(values["user.email"] ?? "");

        if (!emailValue.includes("@")) {
          return {
            success: false,
            issues: [{ name: "user.email", message: "Enter a valid email" }],
          };
        }

        return {
          success: true,
          values,
        };
      },
    };
    const runtime = new Runtime({ validator });
    const events: string[] = [];

    runtime.subscribe((event) => {
      events.push(event.type);
    });
    runtime.mount(form);

    email.value = "invalid";
    email.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    email.value = "user@example.com";
    email.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    expect(events).toEqual([
      "field:mount",
      "field:mount",
      "form:mount",
      "validation:start",
      "field:change",
      "field:update",
      "validation:end",
      "validation:start",
      "field:change",
      "field:update",
      "validation:end",
    ]);
  });

  it("does not duplicate the same error message after repeated validation", async () => {
    const form = createForm('<input name="email" value="" />');
    const input = form.elements.namedItem("email") as HTMLInputElement;
    const validator: Validator = {
      validate: () => ({
        success: false,
        issues: [{ name: "email", message: "Email is required" }],
      }),
    };
    const runtime = new Runtime({ validator });

    runtime.mount(form);

    await runtime.submit();
    await runtime.submit();

    expect(
      form.querySelectorAll('div[data-native-form-error="true"]').length,
    ).toBe(1);
    const errorElement = input.nextElementSibling as HTMLElement;
    expect(errorElement?.dataset.nativeFormError).toBe("true");
    expect(errorElement?.textContent).toBe("Email is required");
  });

  it("applies inline error UI on change-triggered validation", async () => {
    const form = createForm('<input name="email" value="" />');
    const input = form.elements.namedItem("email") as HTMLInputElement;
    const validator: Validator = {
      validate: () => ({
        success: false,
        issues: [{ name: "email", message: "Email is required" }],
      }),
    };
    const runtime = new Runtime({ validator });

    runtime.mount(form);

    input.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    const errorElement = input.nextElementSibling as HTMLElement;
    expect(errorElement?.dataset.nativeFormError).toBe("true");
    expect(errorElement?.textContent).toBe("Email is required");
    expect(runtime.getFormState().errors).toEqual({
      email: "Email is required",
    });
  });

  it("clears inline error UI after subsequent successful change validation", async () => {
    const form = createForm('<input name="email" value="" />');
    const input = form.elements.namedItem("email") as HTMLInputElement;
    const validator: Validator = {
      validate: (values) => {
        const email = String(values.email ?? "");

        if (!email.includes("@")) {
          return {
            success: false,
            issues: [{ name: "email", message: "Email is required" }],
          };
        }

        return {
          success: true,
          values: { email },
        };
      },
    };
    const runtime = new Runtime({ validator });

    runtime.mount(form);

    // First change is invalid -> error should appear.
    input.value = "invalid";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    expect((input.nextElementSibling as HTMLElement)?.textContent).toBe(
      "Email is required",
    );
    expect(runtime.getFormState().errors).toEqual({
      email: "Email is required",
    });

    // Second change is valid -> error should clear.
    input.value = "user@example.com";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    expect(input.nextElementSibling).toBeNull();
    expect(runtime.getFormState().errors).toEqual({});
  });

  it("clears inline error UI after subsequent successful input validation", async () => {
    const form = createForm('<input name="email" value="" />');
    const input = form.elements.namedItem("email") as HTMLInputElement;
    const validator: Validator = {
      validate: (values) => {
        const email = String(values.email ?? "");

        if (!email.includes("@")) {
          return {
            success: false,
            issues: [{ name: "email", message: "Email is required" }],
          };
        }

        return {
          success: true,
          values: { email },
        };
      },
    };
    const runtime = new Runtime({ validator });

    runtime.mount(form);

    // First input is invalid -> error should appear.
    input.value = "invalid";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();

    expect((input.nextElementSibling as HTMLElement)?.textContent).toBe(
      "Email is required",
    );
    expect(runtime.getFormState().errors).toEqual({
      email: "Email is required",
    });

    // Second input is valid -> error should clear.
    input.value = "user@example.com";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();

    expect(input.nextElementSibling).toBeNull();
    expect(runtime.getFormState().errors).toEqual({});
  });

  it("emits stable event order across invalid then valid input recovery", async () => {
    const form = createForm('<input name="email" value="" />');
    const input = form.elements.namedItem("email") as HTMLInputElement;
    const validator: Validator = {
      validate: (values) => {
        const email = String(values.email ?? "");

        if (!email.includes("@")) {
          return {
            success: false,
            issues: [{ name: "email", message: "Email is required" }],
          };
        }

        return {
          success: true,
          values: { email },
        };
      },
    };
    const runtime = new Runtime({ validator });
    const events: string[] = [];

    runtime.subscribe((event) => {
      events.push(event.type);
    });
    runtime.mount(form);

    input.value = "invalid";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();

    input.value = "user@example.com";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();

    expect(events).toEqual([
      "field:mount",
      "form:mount",
      "validation:start",
      "field:input",
      "field:update",
      "validation:end",
      "validation:start",
      "field:input",
      "field:update",
      "validation:end",
    ]);
  });

  it("accepts a Standard Schema shaped validator", async () => {
    const form = createForm('<input name="email" value="a@example.com" />');
    const schema: StandardSchemaV1<{ email: FormDataEntryValue }> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (value) => ({
          value: {
            email: (value as Record<string, FormDataEntryValue>).email,
          },
        }),
      },
    };
    const runtime = new Runtime({ schema });

    runtime.mount(form);

    await expect(runtime.submit()).resolves.toEqual({
      success: true,
      values: { email: "a@example.com" },
    });
  });

  it("discovers fields added after mount", async () => {
    const form = createForm('<input name="email" value="a@example.com" />');
    const runtime = new Runtime();
    const listener = vi.fn();

    runtime.subscribe(listener);
    runtime.mount(form);

    const password = document.createElement("input");

    password.name = "password";
    password.value = "secret";
    form.append(password);

    await Promise.resolve();

    expect(runtime.fields.map((field) => field.name)).toEqual([
      "email",
      "password",
    ]);
    expect(runtime.serialize()).toEqual({
      email: "a@example.com",
      password: "secret",
    });
    expect(runtime.getFieldState("password")).toMatchObject({
      mounted: true,
      value: "secret",
    });
    expect(listener).toHaveBeenCalledWith({
      type: "field:mount",
      field: "password",
    });
  });

  it("unregisters fields removed after mount and emits unmount events", async () => {
    const form = createForm(`
      <input name="email" value="a@example.com" />
      <input name="password" value="secret" />
    `);
    const runtime = new Runtime();
    const listener = vi.fn();

    runtime.subscribe(listener);
    runtime.mount(form);

    const password = form.elements.namedItem("password") as HTMLInputElement;
    password.remove();

    await Promise.resolve();

    expect(runtime.fields.map((field) => field.name)).toEqual(["email"]);
    expect(runtime.serialize()).toEqual({
      email: "a@example.com",
    });
    expect(runtime.getFieldState("password")).toBeUndefined();
    expect(listener).toHaveBeenCalledWith({
      type: "field:unmount",
      field: "password",
    });
  });

  it("replaces a same-name control after mount and emits unmount/mount lifecycle events", async () => {
    const form = createForm('<input name="email" value="a@example.com" />');
    const runtime = new Runtime();
    const events: string[] = [];

    runtime.subscribe((event) => {
      events.push(`${event.type}:${"field" in event ? event.field : ""}`);
    });
    runtime.mount(form);

    const original = form.elements.namedItem("email") as HTMLInputElement;
    original.remove();

    const replacement = document.createElement("input");
    replacement.name = "email";
    replacement.value = "next@example.com";
    form.append(replacement);

    await Promise.resolve();

    expect(runtime.serialize()).toEqual({
      email: "next@example.com",
    });
    expect(runtime.getFieldState("email")).toMatchObject({
      value: "next@example.com",
      mounted: true,
    });

    const lifecycleEvents = events.filter(
      (event) =>
        event.startsWith("field:unmount:") || event.startsWith("field:mount:"),
    );
    expect(lifecycleEvents).toEqual([
      "field:mount:email",
      "field:unmount:email",
      "field:mount:email",
    ]);
  });

  it("emits normalized lifecycle events for field interactions", async () => {
    const form = createForm('<input name="email" value="a@example.com" />');
    const input = form.elements.namedItem("email") as HTMLInputElement;
    const runtime = new Runtime();
    const events: string[] = [];

    runtime.subscribe((event) => {
      events.push(event.type);
    });
    runtime.mount(form);

    input.value = "next@example.com";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new FocusEvent("blur", { bubbles: true }));

    form.reset();
    await Promise.resolve();

    await runtime.submit();
    runtime.unmount();

    const fieldEvents = events.filter((type) => type.startsWith("field:"));

    expect(fieldEvents).toEqual([
      "field:mount",
      "field:input",
      "field:update",
      "field:change",
      "field:update",
      "field:blur",
      "field:reset",
      "field:submit",
      "field:unmount",
    ]);
  });

  it("uses injected pipeline over schema/validator", async () => {
    const form = createForm('<input name="email" value="a@example.com" />');
    const validator: Validator = {
      validate: vi.fn(() => ({
        success: true,
        values: { email: "validator@example.com" },
      })),
    };
    const pipeline: ValidationPipeline = {
      validate: vi.fn(() => ({
        success: false,
        issues: [{ name: "email", message: "pipeline says no" }],
      })),
      validateField: vi.fn(() => ({
        success: true,
        values: { email: "a@example.com" },
      })),
    };
    const runtime = new Runtime({ validator, pipeline });

    runtime.mount(form);
    const result = await runtime.submit();

    expect(result).toEqual({
      success: false,
      issues: [{ name: "email", message: "pipeline says no" }],
    });
    expect(pipeline.validate).toHaveBeenCalledOnce();
    expect(validator.validate).not.toHaveBeenCalled();
  });

  it("uses pipeline.validateField on input and applies only active field issues", async () => {
    const form = createForm(`
      <input name="email" value="" />
      <input name="password" value="" />
    `);
    const email = form.elements.namedItem("email") as HTMLInputElement;
    const runtime = new Runtime({
      pipeline: {
        validate: vi.fn(() => ({
          success: true,
          values: { email: "", password: "" },
        })),
        validateField: vi.fn((field) => {
          if (field.name === "email") {
            return {
              success: false,
              issues: [{ name: "email", message: "Email is required" }],
            };
          }

          return {
            success: true,
            values: { email: "", password: "" },
          };
        }),
      },
    });

    runtime.mount(form);

    email.value = "";
    email.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();

    expect(runtime.getFormState().errors).toEqual({
      email: "Email is required",
    });
    expect(runtime.getFieldState("password")?.error).toBeUndefined();
  });

  it("uses pipeline.validateField on change and applies only active field issues", async () => {
    const form = createForm(`
      <input name="email" value="" />
      <input name="password" value="" />
    `);
    const password = form.elements.namedItem("password") as HTMLInputElement;
    const pipeline = {
      validate: vi.fn(() => ({
        success: true,
        values: { email: "", password: "" },
      })),
      validateField: vi.fn((field) => {
        if (field.name === "password") {
          return {
            success: false,
            issues: [{ name: "password", message: "Password is required" }],
          };
        }

        return {
          success: true,
          values: { email: "", password: "" },
        };
      }),
    };
    const runtime = new Runtime({ pipeline });

    runtime.mount(form);

    password.value = "";
    password.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    expect(pipeline.validateField).toHaveBeenCalled();
    expect(runtime.getFormState().errors).toEqual({
      password: "Password is required",
    });
    expect(runtime.getFieldState("email")?.error).toBeUndefined();
  });

  it("uses pipeline.validate on submit and not validateField", async () => {
    const form = createForm(`
      <input name="email" value="a@example.com" />
      <input name="password" value="secret" />
    `);
    const pipeline = {
      validate: vi.fn(() => ({
        success: false,
        issues: [{ name: "email", message: "Submit validation failed" }],
      })),
      validateField: vi.fn(() => ({
        success: true,
        values: { email: "a@example.com", password: "secret" },
      })),
    };
    const runtime = new Runtime({ pipeline });

    runtime.mount(form);
    const result = await runtime.submit();

    expect(result).toEqual({
      success: false,
      issues: [{ name: "email", message: "Submit validation failed" }],
    });
    expect(pipeline.validate).toHaveBeenCalledOnce();
    expect(pipeline.validateField).not.toHaveBeenCalled();
  });

  it("defaults to validateField on input when pipeline capabilities are omitted", async () => {
    const form = createForm('<input name="email" value="" />');
    const email = form.elements.namedItem("email") as HTMLInputElement;
    const pipeline = {
      validate: vi.fn(() => ({
        success: true,
        values: { email: "" },
      })),
      validateField: vi.fn(() => ({
        success: false,
        issues: [{ name: "email", message: "Email is required" }],
      })),
    };
    const runtime = new Runtime({ pipeline });

    runtime.mount(form);

    email.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();

    expect(pipeline.validateField).toHaveBeenCalled();
    expect(pipeline.validate).not.toHaveBeenCalled();
    expect(runtime.getFormState().errors).toEqual({
      email: "Email is required",
    });
  });

  it("defaults to validateField on change when pipeline capabilities are omitted", async () => {
    const form = createForm('<input name="email" value="" />');
    const email = form.elements.namedItem("email") as HTMLInputElement;
    const pipeline = {
      validate: vi.fn(() => ({
        success: true,
        values: { email: "" },
      })),
      validateField: vi.fn(() => ({
        success: false,
        issues: [{ name: "email", message: "Email is required" }],
      })),
    };
    const runtime = new Runtime({ pipeline });

    runtime.mount(form);

    email.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    expect(pipeline.validateField).toHaveBeenCalled();
    expect(pipeline.validate).not.toHaveBeenCalled();
    expect(runtime.getFormState().errors).toEqual({
      email: "Email is required",
    });
  });

  it("uses validate (not validateField) on input/change when field-scoped capability is false", async () => {
    const form = createForm('<input name="email" value="" />');
    const email = form.elements.namedItem("email") as HTMLInputElement;
    const pipeline = {
      capabilities: { supportsFieldScopedValidation: false },
      validate: vi.fn(() => ({
        success: false,
        issues: [{ name: "email", message: "Global validation" }],
      })),
      validateField: vi.fn(() => ({
        success: false,
        issues: [{ name: "email", message: "Field validation" }],
      })),
    };
    const runtime = new Runtime({ pipeline });

    runtime.mount(form);

    email.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();

    email.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    expect(pipeline.validate).toHaveBeenCalled();
    expect(pipeline.validateField).not.toHaveBeenCalled();
    expect(runtime.getFormState().errors).toEqual({
      email: "Global validation",
    });
  });

  it("uses validateField (not validate) on input/change when field-scoped capability is true", async () => {
    const form = createForm('<input name="email" value="" />');
    const email = form.elements.namedItem("email") as HTMLInputElement;
    const pipeline = {
      capabilities: { supportsFieldScopedValidation: true },
      validate: vi.fn(() => ({
        success: false,
        issues: [{ name: "email", message: "Global validation" }],
      })),
      validateField: vi.fn(() => ({
        success: false,
        issues: [{ name: "email", message: "Field validation" }],
      })),
    };
    const runtime = new Runtime({ pipeline });

    runtime.mount(form);

    email.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();

    email.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    expect(pipeline.validateField).toHaveBeenCalled();
    expect(pipeline.validate).not.toHaveBeenCalled();
    expect(runtime.getFormState().errors).toEqual({
      email: "Field validation",
    });
  });

  it("emits invalid submit event order without form:submit", async () => {
    const form = createForm('<input name="email" value="" />');
    const validator: Validator = {
      validate: () => ({
        success: false,
        issues: [{ name: "email", message: "Email is required" }],
      }),
    };
    const runtime = new Runtime({ validator });
    const events: string[] = [];

    runtime.subscribe((event) => {
      events.push(event.type);
    });
    runtime.mount(form);

    const result = await runtime.submit();

    expect(result).toEqual({
      success: false,
      issues: [{ name: "email", message: "Email is required" }],
    });
    expect(events).toEqual([
      "field:mount",
      "form:mount",
      "field:submit",
      "validation:start",
      "validation:end",
      "form:invalid",
    ]);
    expect(events).not.toContain("form:submit");
  });

  it("keeps submitting=true only while onSubmit is in flight", async () => {
    const form = createForm('<input name="email" value="a@example.com" />');
    let resolveSubmit: (() => void) | undefined;
    let markStarted: (() => void) | undefined;
    const submitStarted = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const submitGate = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    const onSubmit = vi.fn(async () => {
      markStarted?.();
      await submitGate;
    });
    const validator: Validator<{ email: FormDataEntryValue }> = {
      validate: (values) => ({
        success: true,
        values: { email: values.email as FormDataEntryValue },
      }),
    };
    const runtime = new Runtime({ validator, onSubmit });

    runtime.mount(form);

    const submitPromise = runtime.submit();
    await submitStarted;

    expect(runtime.getFormState().submitting).toBe(true);

    resolveSubmit?.();
    await submitPromise;

    expect(runtime.getFormState().submitting).toBe(false);
  });

  it("keeps validating=true only while validate is in flight", async () => {
    const form = createForm('<input name="email" value="a@example.com" />');
    let resolveValidate: (() => void) | undefined;
    let markStarted: (() => void) | undefined;
    const validationStarted = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const validationGate = new Promise<void>((resolve) => {
      resolveValidate = resolve;
    });
    const validator: Validator<{ email: FormDataEntryValue }> = {
      validate: vi.fn(async (values) => {
        markStarted?.();
        await validationGate;

        return {
          success: true,
          values: { email: values.email as FormDataEntryValue },
        };
      }),
    };
    const runtime = new Runtime({ validator });

    runtime.mount(form);

    const validatePromise = runtime.validate();
    await validationStarted;

    expect(runtime.getFormState().validating).toBe(true);

    resolveValidate?.();
    await validatePromise;

    expect(runtime.getFormState().validating).toBe(false);
  });

  it("keeps latest field value state during rapid typing", async () => {
    const form = createForm('<input name="email" value="" />');
    const input = form.elements.namedItem("email") as HTMLInputElement;
    const runtime = new Runtime();

    runtime.mount(form);

    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.value = "ab";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.value = "abc";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();

    expect(runtime.serialize()).toEqual({ email: "abc" });
    expect(runtime.getFieldState("email")).toMatchObject({
      value: "abc",
      dirty: true,
    });
  });

  it("keeps latest input validation result when earlier validation resolves late", async () => {
    const form = createForm('<input name="email" value="" />');
    const input = form.elements.namedItem("email") as HTMLInputElement;
    const pending: Array<{
      resolve: (result: ValidationResult<NativeFormValues>) => void;
      signal: AbortSignal;
    }> = [];
    const validator: Validator = {
      validate: vi.fn(
        (_values, context) =>
          new Promise<ValidationResult<NativeFormValues>>((resolve) => {
            pending.push({ resolve, signal: context.signal });
          }),
      ),
    };
    const runtime = new Runtime({ validator });

    runtime.mount(form);

    input.value = "first";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    input.value = "second@example.com";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(pending.length).toBe(2);
    expect(pending[0].signal.aborted).toBe(true);
    expect(pending[1].signal.aborted).toBe(false);

    // Resolve latest validation first as success.
    pending[1].resolve({
      success: true,
      values: { email: "second@example.com" },
    });
    await Promise.resolve();

    expect(runtime.getFormState().errors).toEqual({});

    // Resolve stale validation after latest completion.
    pending[0].resolve({
      success: false,
      issues: [{ name: "email", message: "Stale error" }],
    });
    await Promise.resolve();

    expect(runtime.getFormState().errors).toEqual({});
  });

  it("keeps submit result authoritative when submit starts during in-flight field validation", async () => {
    const form = createForm('<input name="email" value="" />');
    const input = form.elements.namedItem("email") as HTMLInputElement;
    const events: string[] = [];
    const pending: Array<{
      resolve: (result: ValidationResult<NativeFormValues>) => void;
      signal: AbortSignal;
    }> = [];
    const validator: Validator = {
      validate: vi.fn(
        (values, context) =>
          new Promise<ValidationResult<NativeFormValues>>((resolve) => {
            pending.push({ resolve, signal: context.signal });

            events.push(`validate:${String(values.email ?? "")}`);
          }),
      ),
    };
    const runtime = new Runtime({ validator });

    runtime.subscribe((event) => {
      events.push(event.type);
    });
    runtime.mount(form);

    input.value = "first";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(pending.length).toBe(1);
    expect(runtime.getFormState().validating).toBe(true);

    const submitPromise = runtime.submit();

    expect(pending.length).toBe(2);
    expect(pending[0].signal.aborted).toBe(true);
    expect(pending[1].signal.aborted).toBe(false);

    // Resolve the stale field validation late: it should not overwrite submit state.
    pending[0].resolve({
      success: false,
      issues: [{ name: "email", message: "Stale input error" }],
    });
    await Promise.resolve();

    expect(runtime.getFormState().errors).toEqual({});

    pending[1].resolve({
      success: false,
      issues: [{ name: "email", message: "Submit error" }],
    });

    await expect(submitPromise).resolves.toEqual({
      success: false,
      issues: [{ name: "email", message: "Submit error" }],
    });

    expect(runtime.getFormState().errors).toEqual({ email: "Submit error" });
    expect(runtime.getFieldState("email")).toMatchObject({
      error: "Submit error",
    });
    expect(runtime.getFormState().validating).toBe(false);

    expect(events.filter((event) => event === "validation:start")).toHaveLength(
      2,
    );
    expect(events.filter((event) => event === "validation:end")).toHaveLength(
      1,
    );
    expect(events).toContain("form:invalid");
  });

  it("ignores stale submit validation completion and only fires callbacks for active submit", async () => {
    const form = createForm('<input name="email" value="" />');
    const input = form.elements.namedItem("email") as HTMLInputElement;
    const onInvalid = vi.fn();
    const onSubmit = vi.fn();
    const pending: Array<{
      resolve: (result: ValidationResult<NativeFormValues>) => void;
      signal: AbortSignal;
    }> = [];
    const validator: Validator = {
      validate: vi.fn(
        (_values, context) =>
          new Promise<ValidationResult<NativeFormValues>>((resolve) => {
            pending.push({ resolve, signal: context.signal });
          }),
      ),
    };
    const runtime = new Runtime({ validator, onInvalid, onSubmit });

    runtime.mount(form);

    input.value = "first";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    const firstSubmit = runtime.submit();
    const secondSubmit = runtime.submit();

    expect(pending.length).toBe(3);
    expect(pending[0].signal.aborted).toBe(true);
    expect(pending[1].signal.aborted).toBe(true);
    expect(pending[2].signal.aborted).toBe(false);

    pending[1].resolve({
      success: true,
      values: { email: "stale-success" },
    });
    await Promise.resolve();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onInvalid).not.toHaveBeenCalled();

    pending[2].resolve({
      success: false,
      issues: [{ name: "email", message: "active submit error" }],
    });

    await expect(secondSubmit).resolves.toEqual({
      success: false,
      issues: [{ name: "email", message: "active submit error" }],
    });

    pending[0].resolve({
      success: false,
      issues: [{ name: "email", message: "older stale error" }],
    });

    await expect(firstSubmit).resolves.toEqual({
      success: true,
      values: { email: "stale-success" },
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(runtime.getFormState().errors).toEqual({
      email: "active submit error",
    });
  });

  it("preserves touched and dirty state of existing fields when adding new array items after mount", async () => {
    const form = createForm(`
      <input name="items.0.name" value="First" />
    `);
    const runtime = new Runtime();
    runtime.mount(form);

    const firstInput = form.elements.namedItem(
      "items.0.name",
    ) as HTMLInputElement;

    // Modify and touch first input
    firstInput.value = "First Modified";
    firstInput.dispatchEvent(new Event("input", { bubbles: true }));
    firstInput.dispatchEvent(new FocusEvent("blur", { bubbles: true }));

    expect(runtime.getFieldState("items.0.name")).toMatchObject({
      dirty: true,
      touched: true,
      value: "First Modified",
    });

    // Dynamically append new array row
    const secondInput = document.createElement("input");
    secondInput.name = "items.1.name";
    secondInput.value = "Second";
    form.append(secondInput);

    await Promise.resolve();

    // Verify existing field state was NOT wiped
    expect(runtime.getFieldState("items.0.name")).toMatchObject({
      dirty: true,
      touched: true,
      value: "First Modified",
    });

    // Verify new field is initialized properly
    expect(runtime.getFieldState("items.1.name")).toMatchObject({
      dirty: false,
      touched: false,
      value: "Second",
      mounted: true,
    });

    expect(runtime.serialize()).toEqual({
      "items.0.name": "First Modified",
      "items.1.name": "Second",
    });
  });

  it("cleans up validation errors and error UI when an invalid array item is removed from DOM", async () => {
    const form = createForm(`
      <input name="items.0.name" value="Valid Name" />
      <input name="items.1.name" value="" />
    `);

    const runtime = new Runtime({
      validator: {
        async validate(values) {
          const issues = [];
          if (!values["items.0.name"]) {
            issues.push({ name: "items.0.name", message: "Item 0 required" });
          }
          if (!values["items.1.name"]) {
            issues.push({ name: "items.1.name", message: "Item 1 required" });
          }
          return issues.length === 0
            ? { success: true, values }
            : { success: false, issues };
        },
      },
    });

    runtime.mount(form);

    const initialResult = await runtime.submit();
    expect(initialResult.success).toBe(false);
    expect(runtime.getFormState().valid).toBe(false);
    expect(runtime.getFormState().errors).toEqual({
      "items.1.name": "Item 1 required",
    });

    const secondInput = form.elements.namedItem(
      "items.1.name",
    ) as HTMLInputElement;
    expect(secondInput.validationMessage).toBe("Item 1 required");

    // Remove the invalid row from DOM
    secondInput.remove();
    await Promise.resolve();

    // Verify error for removed item is cleared
    expect(runtime.getFormState().errors).toEqual({});
    expect(runtime.getFormState().valid).toBe(true);
    expect(runtime.getFieldState("items.1.name")).toBeUndefined();
  });

  it("handles reordering and re-indexing of array item fields with correct values and serialization", async () => {
    const form = createForm(`
      <input name="items.0.name" value="Alice" />
      <input name="items.1.name" value="Bob" />
      <input name="items.2.name" value="Charlie" />
    `);

    const runtime = new Runtime();
    runtime.mount(form);

    expect(runtime.serialize()).toEqual({
      "items.0.name": "Alice",
      "items.1.name": "Bob",
      "items.2.name": "Charlie",
    });

    // Remove row 1 ("Bob") and re-index row 2 ("Charlie" -> items.1.name)
    const row1 = form.elements.namedItem("items.1.name") as HTMLInputElement;
    const row2 = form.elements.namedItem("items.2.name") as HTMLInputElement;

    row1.remove();
    row2.name = "items.1.name";

    await Promise.resolve();

    expect(runtime.serialize()).toEqual({
      "items.0.name": "Alice",
      "items.1.name": "Charlie",
    });

    expect(runtime.getFieldState("items.0.name")?.value).toBe("Alice");
    expect(runtime.getFieldState("items.1.name")?.value).toBe("Charlie");
    expect(runtime.getFieldState("items.2.name")).toBeUndefined();
  });

  it("correctly projects and updates validation errors after array item fields are reordered", async () => {
    const form = createForm(`
      <input name="items.0.name" value="Valid" />
      <input name="items.1.name" value="" />
    `);

    const runtime = new Runtime({
      validator: {
        async validate(values) {
          const issues = [];
          if (!values["items.0.name"]) {
            issues.push({ name: "items.0.name", message: "Item 0 required" });
          }
          if (!values["items.1.name"]) {
            issues.push({ name: "items.1.name", message: "Item 1 required" });
          }
          return issues.length === 0
            ? { success: true, values }
            : { success: false, issues };
        },
      },
    });

    runtime.mount(form);

    await runtime.submit();
    expect(runtime.getFormState().errors).toEqual({
      "items.1.name": "Item 1 required",
    });

    // Swap values so items.0.name is now invalid and items.1.name is valid
    const input0 = form.elements.namedItem("items.0.name") as HTMLInputElement;
    const input1 = form.elements.namedItem("items.1.name") as HTMLInputElement;

    input0.value = "";
    input0.dispatchEvent(new Event("change", { bubbles: true }));

    input1.value = "Now Valid";
    input1.dispatchEvent(new Event("change", { bubbles: true }));

    await runtime.submit();

    expect(runtime.getFormState().errors).toEqual({
      "items.0.name": "Item 0 required",
    });
    expect(input0.validationMessage).toBe("Item 0 required");
    expect(input1.validationMessage).toBe("");
  });

  describe("getFieldValue fast-path optimization", () => {
    it("returns correct field values for various control types without full form serialization", () => {
      const form = createForm(`
        <input name="username" value="johndoe" />
        <input type="number" name="age" value="28" />
        <input type="checkbox" name="terms" checked />
        <input type="checkbox" name="newsletter" />
        <input type="radio" name="plan" value="free" />
        <input type="radio" name="plan" value="pro" checked />
        <select name="role">
          <option value="admin">Admin</option>
          <option value="member" selected>Member</option>
        </select>
        <select name="tags" multiple>
          <option value="ts" selected>TS</option>
          <option value="react" selected>React</option>
          <option value="vue">Vue</option>
        </select>
      `);

      const runtime = new Runtime();
      runtime.mount(form);

      expect(runtime.getFieldValue("username")).toBe("johndoe");
      expect(runtime.getFieldValue("age")).toBe(28);
      expect(runtime.getFieldValue("terms")).toBe(true);
      expect(runtime.getFieldValue("newsletter")).toBe(false);
      expect(runtime.getFieldValue("plan")).toBe("pro");
      expect(runtime.getFieldValue("role")).toBe("member");
      expect(runtime.getFieldValue("tags")).toEqual(["ts", "react"]);
      expect(runtime.getFieldValue("nonexistent")).toBeUndefined();
    });

    it("does not invoke serializer.serialize during getFieldValue", () => {
      const form = createForm('<input name="email" value="fast@test.com" />');
      const runtime = new Runtime();
      runtime.mount(form);

      const serializeSpy = vi.spyOn((runtime as any).serializer, "serialize");

      const value = runtime.getFieldValue("email");
      expect(value).toBe("fast@test.com");
      expect(serializeSpy).not.toHaveBeenCalled();

      serializeSpy.mockRestore();
    });

    it("returns undefined when unmounted", () => {
      const runtime = new Runtime();
      expect(runtime.getFieldValue("email")).toBeUndefined();
    });
  });

  describe("ValidationMode lifecycle (onChange, onBlur, onSubmit, onTouched, all)", () => {
    function createValidationForm() {
      return createForm('<input name="email" value="" />');
    }

    const validator = {
      validate(values: any) {
        const email = String(values.email ?? "");
        if (!email.includes("@")) {
          return { success: false, issues: [{ name: "email", message: "Invalid email" }] };
        }
        return { success: true, values: { email } };
      },
    };

    it("validates on input by default (mode: onChange)", async () => {
      const form = createValidationForm();
      const runtime = new Runtime({ validator, mode: "onChange" });
      runtime.mount(form);

      const input = form.querySelector("input")!;
      input.value = "invalid";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();

      expect(runtime.getFormState().errors.email).toBe("Invalid email");
    });

    it("does not validate on input in onBlur mode, but validates on blur", async () => {
      const form = createValidationForm();
      const runtime = new Runtime({ validator, mode: "onBlur" });
      runtime.mount(form);

      const input = form.querySelector("input")!;
      input.value = "invalid";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();

      // Error should NOT appear yet
      expect(runtime.getFormState().errors.email).toBeUndefined();

      // Blur the input
      input.dispatchEvent(new Event("blur", { bubbles: true }));
      await Promise.resolve();

      // Error should appear on blur
      expect(runtime.getFormState().errors.email).toBe("Invalid email");
    });

    it("does not validate on input or blur in onSubmit mode, but validates on submit", async () => {
      const form = createValidationForm();
      const runtime = new Runtime({ validator, mode: "onSubmit" });
      runtime.mount(form);

      const input = form.querySelector("input")!;
      input.value = "invalid";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("blur", { bubbles: true }));
      await Promise.resolve();

      // Error should NOT appear yet
      expect(runtime.getFormState().errors.email).toBeUndefined();

      // Submit form
      await runtime.submit();
      expect(runtime.getFormState().errors.email).toBe("Invalid email");
    });

    it("validates on blur first in onTouched mode, then validates live on input", async () => {
      const form = createValidationForm();
      const runtime = new Runtime({ validator, mode: "onTouched" });
      runtime.mount(form);

      const input = form.querySelector("input")!;
      input.value = "invalid";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();

      // Untouched: no error on first keystrokes
      expect(runtime.getFormState().errors.email).toBeUndefined();

      // Blur field to mark it touched
      input.dispatchEvent(new Event("blur", { bubbles: true }));
      await Promise.resolve();
      expect(runtime.getFormState().errors.email).toBe("Invalid email");

      // Now type valid email: should validate live because it is touched
      input.value = "valid@example.com";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
      expect(runtime.getFormState().errors.email).toBeUndefined();
    });

    it("allows dynamic mode change via setOptions", async () => {
      const form = createValidationForm();
      const runtime = new Runtime({ validator, mode: "onSubmit" });
      runtime.mount(form);

      const input = form.querySelector("input")!;
      input.value = "invalid";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
      expect(runtime.getFormState().errors.email).toBeUndefined();

      // Change to onChange mode dynamically
      runtime.setOptions({ mode: "onChange" });
      input.value = "still-invalid";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
      expect(runtime.getFormState().errors.email).toBe("Invalid email");
    });

    it("validates only the active field on keystroke and does not display premature errors on untouched fields", async () => {
      const form = createForm(`
        <input name="email" value="" />
        <input name="password" value="" />
        <input name="confirmPassword" value="" />
      `);

      const multiValidator = {
        validate(values: any) {
          const issues = [];
          if (!String(values.email ?? "").includes("@")) {
            issues.push({ name: "email", message: "Email required" });
          }
          if (String(values.password ?? "").length < 8) {
            issues.push({ name: "password", message: "Password too short" });
          }
          if (values.password !== values.confirmPassword) {
            issues.push({ name: "confirmPassword", message: "Passwords must match" });
          }
          return issues.length === 0
            ? { success: true, values }
            : { success: false, issues };
        },
      };

      const runtime = new Runtime({ validator: multiValidator, mode: "onChange" });
      runtime.mount(form);

      const emailInput = form.elements.namedItem("email") as HTMLInputElement;

      // Type invalid email
      emailInput.value = "notanemail";
      emailInput.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();

      // Email error should show
      expect(runtime.getFormState().errors.email).toBe("Email required");

      // Password and confirmPassword are untouched, so they MUST NOT have errors
      expect(runtime.getFormState().errors.password).toBeUndefined();
      expect(runtime.getFormState().errors.confirmPassword).toBeUndefined();

      // Submit form: now ALL invalid fields should be validated and show errors
      await runtime.submit();
      expect(runtime.getFormState().errors.email).toBe("Email required");
      expect(runtime.getFormState().errors.password).toBe("Password too short");
    });
  });

  describe("serializeFields()", () => {
    it("serializes form fields with typed values and coerced booleans", () => {
      const form = createForm(`
        <input type="number" name="age" value="30" />
        <input type="checkbox" name="terms" checked />
        <input type="checkbox" name="newsletter" />
        <input type="radio" name="plan" value="basic" />
        <input type="radio" name="plan" value="pro" checked />
      `);

      const runtime = new Runtime();
      runtime.mount(form);

      expect(runtime.serializeFields()).toEqual({
        age: 30,
        terms: true,
        newsletter: false,
        plan: "pro",
      });
    });

    it("respects custom serializers passed to runtime.serializeFields()", () => {
      const form = createForm(`
        <input type="text" name="tags" value="alpha,beta,gamma" />
      `);

      const runtime = new Runtime();
      runtime.mount(form);

      expect(
        runtime.serializeFields({
          customSerializers: {
            text: (el) => (el as HTMLInputElement).value.split(","),
          },
        }),
      ).toEqual({
        tags: ["alpha", "beta", "gamma"],
      });
    });

    it("returns empty object when unmounted", () => {
      const runtime = new Runtime();
      expect(runtime.serializeFields()).toEqual({});
    });
  });

  describe("Field array error lifecycle (NF-017)", () => {
    it("shifts errors when an array item is removed", () => {
      const form = createForm(`
        <input name="users.0.email" value="u0@example.com" />
        <input name="users.1.email" value="invalid1" />
        <input name="users.2.email" value="invalid2" />
      `);

      const runtime = new Runtime();
      runtime.mount(form);

      // Inject simulated errors on users.1 and users.2
      (runtime as any).errors = {
        "users.1.email": "Error 1",
        "users.2.email": "Error 2",
        "other.field": "Other Error",
      };

      // Remove item at index 1
      runtime.removeArrayItem("users", 1);

      expect(runtime.getFormState().errors).toEqual({
        "users.1.email": "Error 2", // shifted from 2 to 1
        "other.field": "Other Error", // untouched
      });
    });

    it("swaps error paths between two items", () => {
      const form = createForm(`
        <input name="items.0.name" value="a" />
        <input name="items.1.name" value="b" />
        <input name="items.2.name" value="c" />
      `);

      const runtime = new Runtime();
      runtime.mount(form);

      (runtime as any).errors = {
        "items.0.name": "Error A",
        "items.2.name": "Error C",
      };

      runtime.swapArrayItems("items", 0, 2);

      expect(runtime.getFormState().errors).toEqual({
        "items.0.name": "Error C",
        "items.2.name": "Error A",
      });
    });

    it("moves error paths correctly when an item is moved", () => {
      const form = createForm(`
        <input name="tasks.0.title" value="t0" />
        <input name="tasks.1.title" value="t1" />
        <input name="tasks.2.title" value="t2" />
      `);

      const runtime = new Runtime();
      runtime.mount(form);

      (runtime as any).errors = {
        "tasks.0.title": "Error Task 0",
        "tasks.1.title": "Error Task 1",
      };

      // Move task 0 to position 2 (0 -> 2): task 1 shifts left to 0, task 0 goes to 2
      runtime.moveArrayItem("tasks", 0, 2);

      expect(runtime.getFormState().errors).toEqual({
        "tasks.0.title": "Error Task 1",
        "tasks.2.title": "Error Task 0",
      });
    });

    it("shifts errors up when an item is inserted", () => {
      const form = createForm(`
        <input name="rows.0.value" value="r0" />
        <input name="rows.1.value" value="r1" />
      `);

      const runtime = new Runtime();
      runtime.mount(form);

      (runtime as any).errors = {
        "rows.0.value": "Error Row 0",
        "rows.1.value": "Error Row 1",
      };

      // Insert at position 1: rows.1 shifts to rows.2
      runtime.insertArrayItem("rows", 1);

      expect(runtime.getFormState().errors).toEqual({
        "rows.0.value": "Error Row 0",
        "rows.2.value": "Error Row 1",
      });
    });
  });

  describe("serializationMode (RFC 002)", () => {
    it("serializes strings in default native mode", () => {
      const form = createForm(`
        <input name="age" type="number" value="30" />
        <input name="terms" type="checkbox" checked />
        <input name="newsletter" type="checkbox" />
      `);

      const runtime = new Runtime();
      runtime.mount(form);

      expect(runtime.serializationMode).toBe("native");
      const state = runtime.getFormState();
      expect(state.values).toEqual({
        age: "30",
        terms: "on",
      });
      // Unchecked checkbox is omitted in native mode
      expect("newsletter" in state.values).toBe(false);
    });

    it("serializes typed primitives when serializationMode is typed", () => {
      const form = createForm(`
        <input name="age" type="number" value="30" />
        <input name="terms" type="checkbox" checked />
        <input name="newsletter" type="checkbox" />
      `);

      const runtime = new Runtime({ serializationMode: "typed" });
      runtime.mount(form);

      expect(runtime.serializationMode).toBe("typed");
      const state = runtime.getFormState();
      expect(state.values).toEqual({
        age: 30,
        terms: true,
        newsletter: false,
      });
    });

    it("passes typed values to onSubmit and validate when serializationMode is typed", async () => {
      const form = createForm(`
        <input name="count" type="number" value="42" />
        <input name="active" type="checkbox" checked />
      `);

      const onSubmit = vi.fn();
      let validatedValues: any;
      const validator = {
        validate(values: any) {
          validatedValues = values;
          return { success: true, values };
        },
      };

      const runtime = new Runtime({
        serializationMode: "typed",
        validator,
        onSubmit,
      });
      runtime.mount(form);

      const result = await runtime.validate();
      expect(result.success).toBe(true);
      expect(validatedValues).toEqual({
        count: 42,
        active: true,
      });

      await runtime.submit();
      expect(onSubmit).toHaveBeenCalledWith(
        {
          count: 42,
          active: true,
        },
        undefined,
      );
    });

    it("dynamically switches serializationMode via setOptions", () => {
      const form = createForm(`
        <input name="price" type="number" value="99" />
        <input name="discount" type="checkbox" />
      `);

      const runtime = new Runtime();
      runtime.mount(form);

      expect(runtime.getFormState().values).toEqual({
        price: "99",
      });

      runtime.setOptions({ serializationMode: "typed" });
      expect(runtime.serializationMode).toBe("typed");
      expect(runtime.getFormState().values).toEqual({
        price: 99,
        discount: false,
      });
    });
  });
});

function createForm(markup: string): HTMLFormElement {
  const form = document.createElement("form");

  form.innerHTML = markup;
  document.body.append(form);

  return form;
}
