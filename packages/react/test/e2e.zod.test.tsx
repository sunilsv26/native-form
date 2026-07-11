/* @vitest-environment jsdom */

import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

import { Form } from "../src";
import { renderReact } from "./testUtils";
import { zodResolver } from "@native-form/zod";

describe("Form end-to-end with zod schema", () => {
  it("submits valid zod-validated values through onSubmit", async () => {
    const schema = z.object({ user: z.object({ email: z.string().email() }) });
    const onSubmit = vi.fn();

    const view = await renderReact(
      <Form schema={zodResolver(schema)} onSubmit={onSubmit}>
        <input name="user.email" defaultValue="ok@example.com" />
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

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      { user: { email: "ok@example.com" } },
      expect.any(Object),
    );

    await view.cleanup();
  });

  it("reports invalid zod submit through onInvalid", async () => {
    const schema = z.object({
      user: z.object({ email: z.string().email("Invalid") }),
    });
    const onSubmit = vi.fn();
    const onInvalid = vi.fn();

    const view = await renderReact(
      <Form
        schema={zodResolver(schema)}
        onSubmit={onSubmit}
        onInvalid={onInvalid}
      >
        <input name="user.email" defaultValue="not-an-email" />
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
      { "user.email": "Invalid" },
      { "user.email": "not-an-email" },
      expect.any(Object),
    );

    await view.cleanup();
  });
});
