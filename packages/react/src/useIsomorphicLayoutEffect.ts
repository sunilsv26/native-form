import { useLayoutEffect } from "react";

/**
 * Custom hook to safely use useLayoutEffect on the client without triggering
 * SSR warnings on the server in Next.js, Remix, and Node environments.
 *
 * During server-side rendering (where window or document is undefined),
 * layout effects are a no-op since DOM elements do not exist on the server.
 * @internal
 */
export const useIsomorphicLayoutEffect: typeof useLayoutEffect = (
  effect,
  deps,
) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useLayoutEffect(effect, deps);
};
