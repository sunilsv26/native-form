/* @vitest-environment jsdom */

import { describe, expect, it } from "vitest";

import { Discovery } from "../src/Discovery";
import { FieldRegistry } from "../src/FieldRegistry";

describe("Discovery", () => {
  it("registers only named native controls", () => {
    const form = document.createElement("form");

    const namedInput = document.createElement("input");
    namedInput.name = "email";
    const unnamedInput = document.createElement("input");
    const button = document.createElement("button");

    form.append(namedInput, unnamedInput, button);

    const discovery = new Discovery();
    const registry = new FieldRegistry();

    discovery.discover(form, registry);

    expect(registry.values().map((field) => field.name)).toEqual(["email"]);
  });

  it("replaces an existing field node when same name points to a new element", () => {
    const form = document.createElement("form");
    const first = document.createElement("input");
    first.name = "email";
    form.append(first);

    const discovery = new Discovery();
    const registry = new FieldRegistry();

    discovery.discover(form, registry);

    const initialNode = registry.get("email");
    expect(initialNode?.element).toBe(first);

    first.remove();
    const second = document.createElement("input");
    second.name = "email";
    form.append(second);

    discovery.discover(form, registry);

    const replacedNode = registry.get("email");
    expect(replacedNode).toBeDefined();
    expect(replacedNode).not.toBe(initialNode);
    expect(replacedNode?.element).toBe(second);
  });

  it("unregisters fields removed from the DOM", () => {
    const form = document.createElement("form");
    const email = document.createElement("input");
    email.name = "email";
    const password = document.createElement("input");
    password.name = "password";

    form.append(email, password);

    const discovery = new Discovery();
    const registry = new FieldRegistry();

    discovery.discover(form, registry);
    expect(registry.values().map((field) => field.name)).toEqual([
      "email",
      "password",
    ]);

    password.remove();
    discovery.discover(form, registry);

    expect(registry.values().map((field) => field.name)).toEqual(["email"]);
    expect(registry.get("password")).toBeUndefined();
  });
});
