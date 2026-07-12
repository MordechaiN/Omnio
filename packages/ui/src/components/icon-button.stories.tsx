import type { Meta, StoryObj } from "@storybook/react-vite";
import { Copy, Settings, X } from "lucide-react";
import { IconButton } from "./icon-button.tsx";

const meta = {
  title: "Primitives/IconButton",
  component: IconButton,
  args: { icon: Settings, "aria-label": "Settings" },
  parameters: {
    docs: {
      description: {
        component:
          "Icon-only control. The aria-label prop is required by the type system — an unlabeled icon button cannot compile.",
      },
    },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ghost: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <IconButton icon={Settings} aria-label="Settings" />
      <IconButton icon={Copy} aria-label="Copy" variant="secondary" />
      <IconButton icon={X} aria-label="Close" variant="primary" />
      <IconButton icon={Settings} aria-label="Settings" size="sm" />
      <IconButton icon={Settings} aria-label="Settings" size="lg" />
    </div>
  ),
};
