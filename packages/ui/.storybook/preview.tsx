import type { Decorator, Preview } from "@storybook/react-vite";
import { TooltipProvider } from "../src/components/tooltip.tsx";
import "../src/fonts.ts";
import "./storybook.css";

/**
 * Every story renders under the full theme × direction × contrast matrix
 * via toolbar globals — the same axes the app supports
 * (docs/architecture/05-design-system.md §5).
 */

const withPlatformAxes: Decorator = (Story, context) => {
  const { theme, direction, contrast } = context.globals as {
    theme: string;
    direction: "ltr" | "rtl";
    contrast: string;
  };

  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.setAttribute("dir", direction);
  if (contrast === "high") {
    document.documentElement.setAttribute("data-contrast", "high");
  } else {
    document.documentElement.removeAttribute("data-contrast");
  }
  document.body.style.background = "var(--bg)";

  return (
    <TooltipProvider delayDuration={200}>
      <div dir={direction} className="p-6 text-text">
        <Story />
      </div>
    </TooltipProvider>
  );
};

const preview: Preview = {
  decorators: [withPlatformAxes],
  globalTypes: {
    theme: {
      description: "Color theme",
      toolbar: {
        title: "Theme",
        icon: "sun",
        items: ["light", "dark"],
        dynamicTitle: true,
      },
    },
    direction: {
      description: "Writing direction",
      toolbar: {
        title: "Direction",
        icon: "transfer",
        items: ["ltr", "rtl"],
        dynamicTitle: true,
      },
    },
    contrast: {
      description: "Contrast mode",
      toolbar: {
        title: "Contrast",
        icon: "contrast",
        items: ["normal", "high"],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "light",
    direction: "ltr",
    contrast: "normal",
  },
  parameters: {
    layout: "fullscreen",
    a11y: { test: "error" },
  },
};

export default preview;
