/* @vitest-environment jsdom */

import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import { useForm } from "../src";
import { renderReact } from "./testUtils";

describe("useForm", () => {
  it("mounts and unmounts the runtime with the form element", async () => {
    const onRuntime = vi.fn();

    function Probe() {
      const form = useForm();

      useEffect(() => {
        onRuntime(form.runtime);

        return () => {
          onRuntime(null);
        };
      }, [form.runtime]);

      return (
        <form ref={form.formRef}>
          <input name="email" defaultValue="user@example.com" />
        </form>
      );
    }

    const view = await renderReact(<Probe />);

    expect(onRuntime).toHaveBeenCalled();
    expect(onRuntime.mock.calls.at(-1)?.[0]).not.toBeNull();

    await view.cleanup();

    expect(onRuntime.mock.calls.at(-1)?.[0]).toBeNull();
  });
});
