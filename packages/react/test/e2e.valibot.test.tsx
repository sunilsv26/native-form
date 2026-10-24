/* @vitest-environment jsdom */

import { describe, it, expect, vi } from "vitest";
import * as v from "valibot";

import { Form } from "../src";
import { renderReact, typeInto } from "./testUtils";
import { valibotResolver } from "@native-form/valibot";

describe("Form end-to-end with valibot schema", () => {
  it("submits valid valibot-validated values through onSubmit", async () => {
    const schema = v.object({
      user: v.object({ email: v.pipe(v.string(), v.email()) }),
    });
    const onSubmit = vi.fn();

    const view = await renderReact(
      <Form schema={valibotResolver(schema)} onSubmit={onSubmit}>
        <input name="user.email" />
        <button type="submit">Submit</button>
      </Form>,
    );

    const form = view.container.querySelector("form");
    const input = view.container.querySelector(
      'input[name="user.email"]',
    ) as HTMLInputElement | null;
    expect(form).not.toBeNull();
    expect(input).not.toBeNull();

    await import("react").then(({ act }) =>
      act(async () => {
        if (input) {
          await typeInto(input, "ok@example.com");
        }

        form?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );

        await Promise.resolve();
      }),
    );

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      { user: { email: "ok@example.com" } },
      expect.any(Object),
    );

    await view.cleanup();
  });

  it("reports invalid valibot submit through onInvalid", async () => {
    const schema = v.object({
      user: v.object({
        email: v.pipe(v.string(), v.email("Invalid email address")),
      }),
    });
    const onSubmit = vi.fn();
    const onInvalid = vi.fn();

    const view = await renderReact(
      <Form
        schema={valibotResolver(schema)}
        onSubmit={onSubmit}
        onInvalid={onInvalid}
      >
        <input name="user.email" defaultValue="bad-email" />
        <button type="submit">Submit</button>
      </Form>,
    );

    const form = view.container.querySelector("form");
    expect(form).not.toBeNull();

    await import("react").then(({ act }) =>
      act(async () => {
        form?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
        await Promise.resolve();
      }),
    );

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(onInvalid).toHaveBeenCalledWith(
      { "user.email": "Invalid email address" },
      { "user.email": "bad-email" },
      expect.any(Object),
    );

    await view.cleanup();
  });
});
