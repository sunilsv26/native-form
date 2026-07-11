import type { ReactElement } from "react";

import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

declare global {
  interface Window {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
}

window.IS_REACT_ACT_ENVIRONMENT = true;

export interface RenderResult {
  container: HTMLDivElement;
  root: Root;
  cleanup: () => Promise<void>;
}

export async function renderReact(
  element: ReactElement,
): Promise<RenderResult> {
  const container = document.createElement("div");
  document.body.append(container);

  const root = createRoot(container);

  await act(async () => {
    root.render(element);
    await Promise.resolve();
  });

  return {
    container,
    root,
    cleanup: async () => {
      await act(async () => {
        root.unmount();
        await Promise.resolve();
      });

      container.remove();
    },
  };
}

export async function typeInto(
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  text: string,
) {
  await act(async () => {
    input.focus();

    // simulate typing character by character
    for (let i = 0; i < text.length; i++) {
      const next = text.slice(0, i + 1);
      input.value = next as any;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await Promise.resolve();
    }

    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.blur();

    await Promise.resolve();
  });
}
