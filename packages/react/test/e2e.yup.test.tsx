/* @vitest-environment jsdom */

import { describe, it, expect, vi } from "vitest";
import * as yup from "yup";

import { Form } from "../src";
import { renderReact } from "./testUtils";
import { yupResolver } from "@native-form/yup";

describe("Form end-to-end with yup schema", () => {
  it("submits valid yup-validated values through onSubmit", async () => {
    const schema = yup.object({
      user: yup.object({ email: yup.string().email().required() }),
    });
    const onSubmit = vi.fn();

    const view = await renderReact(
      <Form schema={yupResolver(schema)} onSubmit={onSubmit}>
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
          input.value = "ok@example.com";
          input.dispatchEvent(new Event("input", { bubbles: true }));
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

  it("reports invalid yup submit through onInvalid", async () => {
    const schema = yup.object({
      user: yup.object({ email: yup.string().email("Invalid").required() }),
    });
    const onSubmit = vi.fn();
    const onInvalid = vi.fn();

    const view = await renderReact(
      <Form
        schema={yupResolver(schema)}
        onSubmit={onSubmit}
        onInvalid={onInvalid}
      >
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
          input.value = "not-an-email";
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }

        form?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
        await Promise.resolve();
      }),
    );

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(onInvalid).toHaveBeenCalledWith(
      { "user.email": "Invalid" },
      { "user.email": "not-an-email" },
      expect.any(Object),
    );

    await view.cleanup();
  });
});
