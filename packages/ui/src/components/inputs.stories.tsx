import type { Meta, StoryObj } from "@storybook/react-vite";
import { Search } from "lucide-react";
import { Icon } from "./icon.tsx";
import { Input } from "./input.tsx";
import { Kbd } from "./kbd.tsx";
import { Label } from "./label.tsx";
import { Textarea } from "./textarea.tsx";

const meta = {
  title: "Primitives/Input",
  component: Input,
  parameters: {
    docs: {
      description: {
        component:
          "Text fields. Adornments sit at the logical start/end, so they swap sides in RTL automatically. Invalid state binds to aria-invalid — style follows semantics, never the other way.",
      },
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithLabel: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-1.5">
      <Label htmlFor="name">File name</Label>
      <Input id="name" placeholder="invoice-2026.pdf" />
    </div>
  ),
};

export const Adornments: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-3">
      <Input
        placeholder="Search tools…"
        startAdornment={<Icon icon={Search} size={16} />}
        endAdornment={<Kbd>/</Kbd>}
        aria-label="Search"
      />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-3">
      <Input placeholder="Default" aria-label="Default" />
      <Input placeholder="Invalid" aria-label="Invalid" aria-invalid />
      <Input placeholder="Disabled" aria-label="Disabled" disabled />
    </div>
  ),
};

export const TextareaStory: Story = {
  name: "Textarea",
  render: () => (
    <div className="flex max-w-sm flex-col gap-1.5">
      <Label htmlFor="notes">Notes</Label>
      <Textarea id="notes" placeholder="Anything worth remembering about this file…" />
    </div>
  ),
};
