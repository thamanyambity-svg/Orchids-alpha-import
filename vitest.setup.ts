import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"
import type { ReactNode } from "react"

vi.mock("framer-motion", () => {
  const createMotion = (tag: string) =>
    ({ children, ...props }: { children: ReactNode; [key: string]: any }) =>
      require("react").createElement(tag, props, children)

  return {
    motion: new Proxy(
      {},
      {
        get: (_target, tag: string) => createMotion(tag),
      }
    ),
    AnimatePresence: ({ children }: { children: ReactNode }) =>
      require("react").createElement("div", { style: { display: "contents" } }, children),
    useScroll: () => ({
      scrollY: { get: () => 0, on: (_: string, fn: any) => { fn(0); return () => {} } },
      scrollYProgress: { get: () => 0, on: (_: string, fn: any) => { fn(0); return () => {} } },
    }),
    useTransform: (_value: any, _from: any, _to: any) => ({ get: () => 0, on: () => {} }),
    useMotionValue: (val: any) => ({ get: () => val, set: () => {} }),
    useSpring: (val: any) => ({ get: () => val, set: () => {} }),
    useInView: () => true,
  }
})
