/* @vitest-environment jsdom */

import { act } from "react";
import { describe, expect, it, vi } from "vitest";

import { useField, useForm } from "../src";
import { renderReact } from "./testUtils";

describe("useField", () => {
  it("keeps value, error, and invalid state in sync with runtime formState", async () => {
    const validator = {
      validate(values: { email?: string }) {
        const email = String(values.email ?? "");

        if (!email.includes("@")) {
          return {
            success: false as const,
            issues: [{ name: "email", message: "Invalid email" }],
          };
        }

        return {
          success: true as const,
          values: { email },
        };
      },
    };

    function Probe() {
      const form = useForm({ validator });
      const email = useField({ form, name: "email" });

      return (
        <form ref={form.formRef} noValidate>
          <input name="email" defaultValue="" />
          <button type="submit">Submit</button>
          <p data-testid="value">{String(email.value ?? "")}</p>
          <p data-testid="error">{email.error ?? ""}</p>
          <p data-testid="invalid">{String(email.invalid)}</p>
        </form>
      );
    }

    const view = await renderReact(<Probe />);

    const form = view.container.querySelector("form");
    const input = view.container.querySelector(
      "input[name='email']",
    ) as HTMLInputElement;
    const error = () =>
      view.container.querySelector("[data-testid='error']")?.textContent ?? "";
    const invalid = () =>
      view.container.querySelector("[data-testid='invalid']")?.textContent ??
      "";
    const value = () =>
      view.container.querySelector("[data-testid='value']")?.textContent ?? "";

    expect(value()).toBe("");

    await act(async () => {
      form?.dispatchEvent(
        new Event("submit", {
          bubbles: true,
          cancelable: true,
        }),
      );
      await Promise.resolve();
    });

    expect(error()).toBe("Invalid email");
    expect(invalid()).toBe("true");

    input.value = "user@example.com";
    await act(async () => {
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    });

    expect(value()).toBe("user@example.com");

    await act(async () => {
      form?.dispatchEvent(
        new Event("submit", {
          bubbles: true,
          cancelable: true,
        }),
      );
      await Promise.resolve();
    });

    expect(error()).toBe("");
    expect(invalid()).toBe("false");
    await view.cleanup();
  });
  it("interoperates seamlessly between bracket notation in DOM and dot notation in useField", async () => {
    const validator = {
      validate() {
        return {
          success: false as const,
          issues: [{ name: "user.email", message: "Nested invalid email" }],
        };
      },
    };

    function BracketProbe() {
      const form = useForm({ validator });
      const email = useField({ form, name: "user.email" });

      return (
        <form ref={form.formRef} noValidate>
          <input name="user[email]" defaultValue="bad" />
          <button type="submit">Submit</button>
          <p data-testid="error">{email.error ?? ""}</p>
          <p data-testid="invalid">{String(email.invalid)}</p>
        </form>
      );
    }

    const view = await renderReact(<BracketProbe />);
    const form = view.container.querySelector("form");

    await act(async () => {
      form?.dispatchEvent(
        new Event("submit", {
          bubbles: true,
          cancelable: true,
        }),
      );
      await Promise.resolve();
    });

    const error = () =>
      view.container.querySelector("[data-testid='error']")?.textContent ?? "";
    const invalid = () =>
      view.container.querySelector("[data-testid='invalid']")?.textContent ?? "";

    expect(error()).toBe("Nested invalid email");
    expect(invalid()).toBe("true");
    await view.cleanup();
  });
  it("tracks field.validating in React during async server validation", async () => {
    let resolveValidation!: (err?: string) => void;
    const asyncCheck = vi.fn(
      () =>
        new Promise<string | undefined>((resolve) => {
          resolveValidation = resolve;
        }),
    );

    function AsyncProbe() {
      const form = useForm({
        mode: "onChange",
        debounceMs: 0,
        asyncValidators: {
          username: asyncCheck,
        },
      });
      const username = useField({ form, name: "username" });

      return (
        <form ref={form.formRef} noValidate>
          <input name="username" defaultValue="" />
          <p data-testid="validating">{String(username.validating)}</p>
          <p data-testid="error">{username.error ?? ""}</p>
        </form>
      );
    }

    const view = await renderReact(<AsyncProbe />);
    const input = view.container.querySelector("input")!;
    const validating = () =>
      view.container.querySelector("[data-testid='validating']")?.textContent ?? "";
    const error = () =>
      view.container.querySelector("[data-testid='error']")?.textContent ?? "";

    expect(validating()).toBe("false");

    await act(async () => {
      input.value = "john";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(validating()).toBe("true");

    await act(async () => {
      resolveValidation("Username already taken");
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(validating()).toBe("false");
    expect(error()).toBe("Username already taken");

    await view.cleanup();
  });
});