/* @vitest-environment node */

import React from "react";
import ReactDOMServer from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { useForm } from "../src";

describe("Server-Side Rendering (Node.js / Next.js SSR / Remix)", () => {
  it("renders pure HTML with renderToString without window or document", () => {
    // Assert we are in a genuine Node SSR environment
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    function SsrPage() {
      const { formRef, formState } = useForm({
        defaultValues: {
          title: "Server Rendered Post",
          category: "engineering",
        },
      });

      return (
        <form ref={formRef} action="/api/posts" method="POST">
          <div>
            <label htmlFor="title">Title</label>
            <input id="title" name="title" defaultValue="Server Rendered Post" />
            {formState.errors.title && <span className="error">{formState.errors.title}</span>}
          </div>
          <div>
            <label htmlFor="category">Category</label>
            <input id="category" name="category" defaultValue="engineering" />
          </div>
          <button type="submit" disabled={formState.submitting}>
            Publish
          </button>
        </form>
      );
    }

    // Execute standard React SSR
    const htmlString = ReactDOMServer.renderToString(<SsrPage />);

    // Assertions on the server-rendered HTML string
    expect(htmlString).toContain('action="/api/posts"');
    expect(htmlString).toContain('name="title"');
    expect(htmlString).toContain('value="Server Rendered Post"');
    expect(htmlString).toContain('name="category"');
    expect(htmlString).toContain('value="engineering"');
    expect(htmlString).toContain("Publish");

    // Zero useLayoutEffect SSR warnings!
    for (const call of consoleWarnSpy.mock.calls) {
      expect(call[0]).not.toMatch(/useLayoutEffect does nothing on the server/);
    }
    for (const call of consoleErrorSpy.mock.calls) {
      expect(call[0]).not.toMatch(/useLayoutEffect does nothing on the server/);
    }
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
});

