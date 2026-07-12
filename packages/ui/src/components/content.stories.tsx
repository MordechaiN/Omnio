import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight, Check, Play, Reply } from "lucide-react";
import { Button } from "./button.tsx";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card.tsx";
import { Icon } from "./icon.tsx";
import { Kbd } from "./kbd.tsx";
import { Separator } from "./separator.tsx";

const meta = {
  title: "Primitives/Content",
  component: Card,
  parameters: {
    docs: {
      description: {
        component:
          "Cards, key caps, separators — and the Icon wrapper's RTL behavior: directional icons (arrows, reply) mirror when dir=rtl; symmetric icons (play, check) never do. Flip the Direction toolbar to see it.",
      },
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CardStory: Story = {
  name: "Card",
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Merge PDFs</CardTitle>
        <CardDescription>Combine several documents into one file.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary">
          Drop up to 50 PDFs. Order them, then merge — entirely in your browser.
        </p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Open tool</Button>
      </CardFooter>
    </Card>
  ),
};

export const Keys: Story = {
  render: () => (
    <p className="flex items-center gap-1.5 text-sm text-text-secondary">
      Press <Kbd>⌘</Kbd>
      <Kbd>K</Kbd> to open the palette, <Kbd>Esc</Kbd> to close.
    </p>
  ),
};

export const SeparatorStory: Story = {
  name: "Separator",
  render: () => (
    <div className="flex max-w-sm flex-col gap-3">
      <p className="text-sm">Above</p>
      <Separator />
      <div className="flex h-6 items-center gap-3 text-sm">
        <span>Start</span>
        <Separator orientation="vertical" />
        <span>End</span>
      </div>
    </div>
  ),
};

export const DirectionalIcons: Story = {
  render: () => (
    <div className="flex items-center gap-6 text-text-secondary">
      <span className="flex items-center gap-1.5 text-sm">
        <Icon icon={ArrowRight} size={16} /> mirrors
      </span>
      <span className="flex items-center gap-1.5 text-sm">
        <Icon icon={Reply} size={16} /> mirrors
      </span>
      <span className="flex items-center gap-1.5 text-sm">
        <Icon icon={Play} size={16} /> stays
      </span>
      <span className="flex items-center gap-1.5 text-sm">
        <Icon icon={Check} size={16} /> stays
      </span>
    </div>
  ),
};
