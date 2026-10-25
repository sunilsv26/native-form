/* @vitest-environment jsdom */

import { act, useEffect } from "react";
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

  it("populates formState.values and form.watch() with typed primitives when serializationMode is typed", async () => {
    let capturedForm!: ReturnType<typeof useForm>;
    const onSubmit = vi.fn();

    function TypedFormApp() {
      const form = useForm({
        serializationMode: "typed",
        onSubmit,
      });
      capturedForm = form;

      return (
        <form ref={form.formRef}>
          <input name="age" type="number" defaultValue="25" />
          <input name="accepted" type="checkbox" defaultChecked />
          <input name="newsletter" type="checkbox" />
          <button type="submit">Submit</button>
        </form>
      );
    }

    const view = await renderReact(<TypedFormApp />);

    expect(capturedForm.formState.values).toEqual({
      age: 25,
      accepted: true,
      newsletter: false,
    });

    expect(capturedForm.watch()).toEqual({
      age: 25,
      accepted: true,
      newsletter: false,
    });
    expect(capturedForm.watch("age")).toBe(25);
    expect(capturedForm.watch("accepted")).toBe(true);
    expect(capturedForm.watch("newsletter")).toBe(false);

    const button = view.container.querySelector("button")!;
    await act(async () => {
      button.click();
      await Promise.resolve();
    });

    expect(onSubmit).toHaveBeenCalledWith(
      {
        age: 25,
        accepted: true,
        newsletter: false,
      },
      expect.anything(),
    );

    await view.cleanup();
  });

  it("populates formState.values, onSubmit, and watch with nested object/array structures when nesting is nested", async () => {
    let capturedForm!: ReturnType<typeof useForm>;
    const onSubmit = vi.fn();

    function NestedFormApp() {
      const form = useForm({
        nesting: "nested",
        onSubmit,
      });
      capturedForm = form;

      return (
        <form ref={form.formRef}>
          <input name="user.name" defaultValue="Alice" />
          <input name="user.contact[email]" defaultValue="alice@example.com" />
          <input name="items[0].title" defaultValue="Item 1" />
          <input name="items[1].title" defaultValue="Item 2" />
          <button type="submit">Submit</button>
        </form>
      );
    }

    const view = await renderReact(<NestedFormApp />);

    expect(capturedForm.formState.values).toEqual({
      user: {
        name: "Alice",
        contact: {
          email: "alice@example.com",
        },
      },
      items: [
        { title: "Item 1" },
        { title: "Item 2" },
      ],
    });

    expect(capturedForm.watch()).toEqual({
      user: {
        name: "Alice",
        contact: {
          email: "alice@example.com",
        },
      },
      items: [
        { title: "Item 1" },
        { title: "Item 2" },
      ],
    });

    const button = view.container.querySelector("button")!;
    await act(async () => {
      button.click();
      await Promise.resolve();
    });

    expect(onSubmit).toHaveBeenCalledWith(
      {
        user: {
          name: "Alice",
          contact: {
            email: "alice@example.com",
          },
        },
        items: [
          { title: "Item 1" },
          { title: "Item 2" },
        ],
      },
      expect.anything(),
    );

    await view.cleanup();
  });
});
