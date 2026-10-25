/* @vitest-environment jsdom */

import { act } from "react";
import { describe, expect, it } from "vitest";

import { useFieldArray, useForm } from "../src";
import { renderReact } from "./testUtils";

describe("useFieldArray", () => {
  it("initializes with defaultValue and generates stable IDs", async () => {
    let arrayApi!: ReturnType<typeof useFieldArray>;

    function TestComponent() {
      const form = useForm();
      arrayApi = useFieldArray({
        form,
        name: "users",
        defaultValue: [{ name: "Alice" }, { name: "Bob" }],
      });

      return (
        <form ref={form.formRef}>
          {arrayApi.fields.map((f, i) => (
            <input key={f.id} name={`users.${i}.name`} defaultValue={String(f.name ?? "")} />
          ))}
        </form>
      );
    }

    const view = await renderReact(<TestComponent />);

    expect(arrayApi.fields).toHaveLength(2);
    expect(arrayApi.fields[0].id).toBeDefined();
    expect(arrayApi.fields[1].id).toBeDefined();
    expect(arrayApi.fields[0].id).not.toBe(arrayApi.fields[1].id);

    const inputs = view.container.querySelectorAll("input");
    expect(inputs).toHaveLength(2);
    expect((inputs[0] as HTMLInputElement).value).toBe("Alice");
    expect((inputs[1] as HTMLInputElement).value).toBe("Bob");

    await view.cleanup();
  });

  it("appends items with append()", async () => {
    let arrayApi!: ReturnType<typeof useFieldArray>;

    function TestComponent() {
      const form = useForm();
      arrayApi = useFieldArray({
        form,
        name: "items",
      });

      return (
        <form ref={form.formRef}>
          {arrayApi.fields.map((f, i) => (
            <input key={f.id} name={`items.${i}.val`} defaultValue={String(f.val ?? "")} />
          ))}
        </form>
      );
    }

    const view = await renderReact(<TestComponent />);
    expect(arrayApi.fields).toHaveLength(0);

    await act(async () => {
      arrayApi.append({ val: "first" });
    });

    expect(arrayApi.fields).toHaveLength(1);
    expect(arrayApi.fields[0].val).toBe("first");

    await act(async () => {
      arrayApi.append({ val: "second" });
    });

    expect(arrayApi.fields).toHaveLength(2);
    expect(arrayApi.fields[1].val).toBe("second");

    await view.cleanup();
  });

  it("prepends items with prepend()", async () => {
    let arrayApi!: ReturnType<typeof useFieldArray>;

    function TestComponent() {
      const form = useForm();
      arrayApi = useFieldArray({
        form,
        name: "items",
        defaultValue: [{ val: "existing" }],
      });

      return <form ref={form.formRef} />;
    }

    const view = await renderReact(<TestComponent />);

    await act(async () => {
      arrayApi.prepend({ val: "prepended" });
    });

    expect(arrayApi.fields).toHaveLength(2);
    expect(arrayApi.fields[0].val).toBe("prepended");
    expect(arrayApi.fields[1].val).toBe("existing");

    await view.cleanup();
  });

  it("inserts items at specific index with insert()", async () => {
    let arrayApi!: ReturnType<typeof useFieldArray>;

    function TestComponent() {
      const form = useForm();
      arrayApi = useFieldArray({
        form,
        name: "items",
        defaultValue: [{ val: "0" }, { val: "2" }],
      });

      return <form ref={form.formRef} />;
    }

    const view = await renderReact(<TestComponent />);

    await act(async () => {
      arrayApi.insert(1, { val: "1" });
    });

    expect(arrayApi.fields).toHaveLength(3);
    expect(arrayApi.fields[0].val).toBe("0");
    expect(arrayApi.fields[1].val).toBe("1");
    expect(arrayApi.fields[2].val).toBe("2");

    await view.cleanup();
  });

  it("removes items and updates runtime error indexes with remove()", async () => {
    let arrayApi!: ReturnType<typeof useFieldArray>;
    let formRef!: ReturnType<typeof useForm>;

    function TestComponent() {
      const form = useForm();
      formRef = form;
      arrayApi = useFieldArray({
        form,
        name: "teammates",
        defaultValue: [{ email: "a@test.com" }, { email: "b@test.com" }, { email: "c@test.com" }],
      });

      return (
        <form ref={form.formRef}>
          {arrayApi.fields.map((f, i) => (
            <input key={f.id} name={`teammates.${i}.email`} defaultValue={String(f.email ?? "")} />
          ))}
        </form>
      );
    }

    const view = await renderReact(<TestComponent />);

    // Simulate errors on index 1 and 2
    if (formRef.runtime) {
      (formRef.runtime as any).errors = {
        "teammates.1.email": "Invalid B",
        "teammates.2.email": "Invalid C",
      };
    }

    // Remove index 1
    await act(async () => {
      arrayApi.remove(1);
    });

    expect(arrayApi.fields).toHaveLength(2);
    expect(arrayApi.fields[0].email).toBe("a@test.com");
    expect(arrayApi.fields[1].email).toBe("c@test.com");

    // teammates.1 error dropped, teammates.2 shifted to teammates.1
    expect(formRef.runtime?.getFormState().errors).toEqual({
      "teammates.1.email": "Invalid C",
    });

    await view.cleanup();
  });

  it("swaps items and swaps error paths with swap()", async () => {
    let arrayApi!: ReturnType<typeof useFieldArray>;
    let formRef!: ReturnType<typeof useForm>;

    function TestComponent() {
      const form = useForm();
      formRef = form;
      arrayApi = useFieldArray({
        form,
        name: "tags",
        defaultValue: [{ tag: "alpha" }, { tag: "beta" }, { tag: "gamma" }],
      });

      return <form ref={form.formRef} />;
    }

    const view = await renderReact(<TestComponent />);

    if (formRef.runtime) {
      (formRef.runtime as any).errors = {
        "tags.0.tag": "Tag 0 error",
        "tags.2.tag": "Tag 2 error",
      };
    }

    await act(async () => {
      arrayApi.swap(0, 2);
    });

    expect(arrayApi.fields[0].tag).toBe("gamma");
    expect(arrayApi.fields[2].tag).toBe("alpha");

    expect(formRef.runtime?.getFormState().errors).toEqual({
      "tags.0.tag": "Tag 2 error",
      "tags.2.tag": "Tag 0 error",
    });

    await view.cleanup();
  });

  it("moves items and error paths with move()", async () => {
    let arrayApi!: ReturnType<typeof useFieldArray>;
    let formRef!: ReturnType<typeof useForm>;

    function TestComponent() {
      const form = useForm();
      formRef = form;
      arrayApi = useFieldArray({
        form,
        name: "steps",
        defaultValue: [{ step: "one" }, { step: "two" }, { step: "three" }],
      });

      return <form ref={form.formRef} />;
    }

    const view = await renderReact(<TestComponent />);

    if (formRef.runtime) {
      (formRef.runtime as any).errors = {
        "steps.0.step": "Step 0 error",
        "steps.1.step": "Step 1 error",
      };
    }

    // Move step 0 to step 2: 0 -> 2
    await act(async () => {
      arrayApi.move(0, 2);
    });

    expect(arrayApi.fields.map((f) => f.step)).toEqual(["two", "three", "one"]);

    expect(formRef.runtime?.getFormState().errors).toEqual({
      "steps.0.step": "Step 1 error",
      "steps.2.step": "Step 0 error",
    });

    await view.cleanup();
  });

  it("replaces entire array with replace()", async () => {
    let arrayApi!: ReturnType<typeof useFieldArray>;

    function TestComponent() {
      const form = useForm();
      arrayApi = useFieldArray({
        form,
        name: "list",
        defaultValue: [{ val: "old1" }, { val: "old2" }],
      });

      return <form ref={form.formRef} />;
    }

    const view = await renderReact(<TestComponent />);

    await act(async () => {
      arrayApi.replace([{ val: "new1" }, { val: "new2" }, { val: "new3" }]);
    });

    expect(arrayApi.fields).toHaveLength(3);
    expect(arrayApi.fields.map((f) => f.val)).toEqual(["new1", "new2", "new3"]);

    await view.cleanup();
  });

  it("supports custom keyName option", async () => {
    let arrayApi!: ReturnType<typeof useFieldArray<any, "_uid">>;

    function TestComponent() {
      const form = useForm();
      arrayApi = useFieldArray({
        form,
        name: "customKeys",
        keyName: "_uid",
        defaultValue: [{ title: "Item" }],
      });

      return <form ref={form.formRef} />;
    }

    const view = await renderReact(<TestComponent />);

    expect(arrayApi.fields[0]._uid).toBeDefined();
    expect(typeof arrayApi.fields[0]._uid).toBe("string");

    await view.cleanup();
  });
});

