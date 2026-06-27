/* @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";

import { Runtime } from "../src/Runtime";
import { StandardSchemaV1, Validator } from "../src/Validation";
import { ValidationPipeline } from "../src/ValidationPipeline";

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
});

function createForm(markup: string): HTMLFormElement {
  const form = document.createElement("form");

  form.innerHTML = markup;
  document.body.append(form);

  return form;
}
