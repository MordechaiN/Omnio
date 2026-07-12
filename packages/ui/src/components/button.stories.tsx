import type { Meta, StoryObj } from "@storybook/react-vite";
import { Download, Trash2 } from "lucide-react";
import { Button } from "./button.tsx";
import { Icon } from "./icon.tsx";

const meta = {
  title: "Primitives/Button",
  component: Button,
  args: { children: "Merge PDFs" },
  parameters: {
    docs: {
      description: {
        component:
          "Buttons are verbs. Primary is for the one main action per surface; everything else is secondary or ghost. Focus ring comes from the global :focus-visible style; loading blocks interaction and announces aria-busy.",
      },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">
        <Icon icon={Trash2} size={16} />
        Delete
      </Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button loading>Converting…</Button>
      <Button disabled>Disabled</Button>
      <Button variant="secondary">
        <Icon icon={Download} size={16} />
        With icon
      </Button>
    </div>
  ),
};
