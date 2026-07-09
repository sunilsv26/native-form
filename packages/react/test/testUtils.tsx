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
