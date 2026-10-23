/* @vitest-environment jsdom */

import { act } from "react";
import { describe, expect, it, vi } from "vitest";

import { useField, useForm, UseFormResult, useWatch } from "../src";
import { renderReact, typeInto } from "./testUtils";

describe("watch and selector ergonomics (NF-018)", () => {
  it("watches a single field and re-renders only the subscriber when that field changes", async () => {
    const renderCountA = vi.fn();
    const renderCountB = vi.fn();

    function FieldWatcherA({ form }: { form: UseFormResult }) {
      const email = useWatch({ form, name: "email" });
      renderCountA(email);
      return <span data-testid="watcher-a">{String(email ?? "")}</span>;
    }

    function FieldWatcherB({ form }: { form: UseFormResult }) {
      const password = useWatch({ form, name: "password" });
      renderCountB(password);
      return <span data-testid="watcher-b">{String(password ?? "")}</span>;
    }

    function FormApp() {
      const form = useForm({ subscribe: false });

      return (
        <form ref={form.formRef}>
          <input name="email" defaultValue="" />
          <input name="password" defaultValue="" />
          <FieldWatcherA form={form} />
          <FieldWatcherB form={form} />
        </form>
      );
    }

    const view = await renderReact(<FormApp />);

    const emailInput = view.container.querySelector(
      "input[name='email']",
    ) as HTMLInputElement;
    const passwordInput = view.container.querySelector(
      "input[name='password']",
    ) as HTMLInputElement;

    const initialCallsA = renderCountA.mock.calls.length;
    const initialCallsB = renderCountB.mock.calls.length;

    // Type into email
    await typeInto(emailInput, "test@example.com");

    expect(
      view.container.querySelector("[data-testid='watcher-a']")?.textContent,
    ).toBe("test@example.com");

    // Watcher A should have re-rendered
    expect(renderCountA.mock.calls.length).toBeGreaterThan(initialCallsA);

    // Watcher B should NOT have re-rendered
    expect(renderCountB.mock.calls.length).toBe(initialCallsB);

    // Now type into password
    await typeInto(passwordInput, "secret123");

    expect(
      view.container.querySelector("[data-testid='watcher-b']")?.textContent,
    ).toBe("secret123");

    // Watcher B should have re-rendered
    expect(renderCountB.mock.calls.length).toBeGreaterThan(initialCallsB);

    await view.cleanup();
  });

  it("watches multiple fields using names array", async () => {
    const renderCount = vi.fn();

    function MultiWatcher({ form }: { form: UseFormResult }) {
      const watched = useWatch({
        form,
        names: ["firstName", "lastName"] as const,
      });
      renderCount();
      return (
        <span data-testid="full-name">
          {String(watched.firstName ?? "")} {String(watched.lastName ?? "")}
        </span>
      );
    }

    function FormApp() {
      const form = useForm({ subscribe: false });

      return (
        <form ref={form.formRef}>
          <input name="firstName" defaultValue="" />
          <input name="lastName" defaultValue="" />
          <input name="unrelated" defaultValue="" />
          <MultiWatcher form={form} />
        </form>
      );
    }

    const view = await renderReact(<FormApp />);

    const firstInput = view.container.querySelector(
      "input[name='firstName']",
    ) as HTMLInputElement;
    const unrelatedInput = view.container.querySelector(
      "input[name='unrelated']",
    ) as HTMLInputElement;

    const initialCalls = renderCount.mock.calls.length;

    // Type into unrelated
    await typeInto(unrelatedInput, "ignored");
    expect(renderCount.mock.calls.length).toBe(initialCalls);

    // Type into firstName
    await typeInto(firstInput, "John");
    expect(renderCount.mock.calls.length).toBeGreaterThan(initialCalls);
    expect(
      view.container.querySelector("[data-testid='full-name']")?.textContent,
    ).toBe("John ");

    await view.cleanup();
  });

  it("watches state slice with custom selector", async () => {
    const renderCount = vi.fn();

    const validator = {
      validate(values: { email?: string }) {
        const email = String(values.email ?? "");
        if (!email.includes("@")) {
          return {
            success: false as const,
            issues: [{ name: "email", message: "Invalid email" }],
          };
        }
        return { success: true as const, values: { email } };
      },
    };

    function ValidityWatcher({ form }: { form: UseFormResult }) {
      const isValid = useWatch({
        form,
        selector: (state) => state.valid,
      });
      renderCount(isValid);
      return <span data-testid="is-valid">{String(isValid)}</span>;
    }

    function FormApp() {
      const form = useForm({ validator, subscribe: false });

      return (
        <form ref={form.formRef} noValidate>
          <input name="email" defaultValue="" />
          <ValidityWatcher form={form} />
          <button type="submit">Submit</button>
        </form>
      );
    }

    const view = await renderReact(<FormApp />);

    const form = view.container.querySelector("form");
    const input = view.container.querySelector(
      "input[name='email']",
    ) as HTMLInputElement;

    expect(
      view.container.querySelector("[data-testid='is-valid']")?.textContent,
    ).toBe("true");

    // Trigger invalid submit
    await act(async () => {
      form?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(
      view.container.querySelector("[data-testid='is-valid']")?.textContent,
    ).toBe("false");

    // Type valid email and submit
    input.value = "user@example.com";
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
      form?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(
      view.container.querySelector("[data-testid='is-valid']")?.textContent,
    ).toBe("true");

    await view.cleanup();
  });

  it("supports defaultValue for fields not yet interacted with", async () => {
    function DefaultWatcher({ form }: { form: UseFormResult }) {
      const role = useWatch({
        form,
        name: "role",
        defaultValue: "member",
      });
      return <span data-testid="role-watcher">{String(role ?? "")}</span>;
    }

    function FormApp() {
      const form = useForm();
      return (
        <form ref={form.formRef}>
          <input name="role" defaultValue="" />
          <DefaultWatcher form={form} />
        </form>
      );
    }

    const view = await renderReact(<FormApp />);

    expect(
      view.container.querySelector("[data-testid='role-watcher']")?.textContent,
    ).toBe("member");

    await view.cleanup();
  });

  it("supports selector in useField for fine-grained field slice subscriptions", async () => {
    const errorRenderCount = vi.fn();

    const validator = {
      validate(values: { email?: string }) {
        const email = String(values.email ?? "");
        if (!email.includes("@")) {
          return {
            success: false as const,
            issues: [{ name: "email", message: "Email required" }],
          };
        }
        return { success: true as const, values: { email } };
      },
    };

    function ErrorOnlyDisplay({ form }: { form: UseFormResult }) {
      const error = useField({
        form,
        name: "email",
        selector: (f) => f.error,
      });
      errorRenderCount(error);
      return <span data-testid="field-error">{error ?? ""}</span>;
    }

    function FormApp() {
      const form = useForm({ validator, subscribe: false });

      return (
        <form ref={form.formRef} noValidate>
          <input name="email" defaultValue="" />
          <ErrorOnlyDisplay form={form} />
          <button type="submit">Submit</button>
        </form>
      );
    }

    const view = await renderReact(<FormApp />);

    const form = view.container.querySelector("form");
    const input = view.container.querySelector(
      "input[name='email']",
    ) as HTMLInputElement;

    // Submit invalid
    await act(async () => {
      form?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await Promise.resolve();
    });

    expect(
      view.container.querySelector("[data-testid='field-error']")?.textContent,
    ).toBe("Email required");

    await view.cleanup();
  });

  it("provides synchronous form.watch helper on useForm result", async () => {
    let capturedForm!: UseFormResult;

    function FormApp() {
      const form = useForm();
      capturedForm = form;

      return (
        <form ref={form.formRef}>
          <input name="email" defaultValue="user@example.com" />
          <input name="role" defaultValue="admin" />
        </form>
      );
    }

    const view = await renderReact(<FormApp />);

    expect(capturedForm.watch("email")).toBe("user@example.com");
    expect(capturedForm.watch(["email", "role"])).toEqual({
      email: "user@example.com",
      role: "admin",
    });
    expect(capturedForm.watch((s) => s.valid)).toBe(true);
    expect(capturedForm.watch()).toEqual({
      email: "user@example.com",
      role: "admin",
    });

    await view.cleanup();
  });

  it("supports useForm selector to selectively re-render form component", async () => {
    const parentRenderCount = vi.fn();

    function SelectiveFormApp() {
      parentRenderCount();
      const form = useForm({
        selector: (state) => state.submitting,
      });

      return (
        <form ref={form.formRef}>
          <input name="email" defaultValue="" />
          <input name="bio" defaultValue="" />
        </form>
      );
    }

    const view = await renderReact(<SelectiveFormApp />);

    const bioInput = view.container.querySelector(
      "input[name='bio']",
    ) as HTMLInputElement;

    const initialParentRenders = parentRenderCount.mock.calls.length;

    // Type into bio
    await typeInto(bioInput, "Hello world");

    // Parent selected slice (submitting) never changed (remained false),
    // so parent should NOT have re-rendered on keystrokes
    expect(parentRenderCount.mock.calls.length).toBe(initialParentRenders);

    await view.cleanup();
  });

  it("fast-paths form.watch(name) via runtime.getFieldValue without full state reconstruction", async () => {
    let formRef: UseFormResult | undefined;

    function TestApp() {
      const form = useForm({ subscribe: false });
      formRef = form;
      return (
        <form ref={form.formRef}>
          <input name="fastField" defaultValue="lightning" />
        </form>
      );
    }

    const view = await renderReact(<TestApp />);
    expect(formRef?.runtime).toBeTruthy();

    const getFieldValueSpy = vi.spyOn(formRef!.runtime!, "getFieldValue");
    const getFormStateSpy = vi.spyOn(formRef!.runtime!, "getFormState");

    const val = formRef!.watch("fastField");
    expect(val).toBe("lightning");
    expect(getFieldValueSpy).toHaveBeenCalledWith("fastField");
    expect(getFormStateSpy).not.toHaveBeenCalled();

    await view.cleanup();
  });
});

