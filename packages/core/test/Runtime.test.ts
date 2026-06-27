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
});

function createForm(markup: string): HTMLFormElement {
  const form = document.createElement("form");

  form.innerHTML = markup;
  document.body.append(form);

  return form;
}
