import type { Meta, StoryObj } from "@storybook/react-vite";
import { Languages, Settings, SunMoon } from "lucide-react";
import { Button } from "./button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "./dropdown-menu.tsx";
import { Icon } from "./icon.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.tsx";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./sheet.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip.tsx";

const meta = {
  title: "Primitives/Overlays",
  component: Dialog,
  parameters: {
    docs: {
      description: {
        component:
          "Dialog, Sheet, Popover, Tooltip, DropdownMenu. Focus is trapped and restored by Radix; Esc closes the topmost layer. Sheet sides are logical — 'start' means right in RTL, and the slide animation flips with it.",
      },
    },
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DialogStory: Story = {
  name: "Dialog",
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">Delete file…</Button>
      </DialogTrigger>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Delete this file?</DialogTitle>
          <DialogDescription>
            “report-final.pdf” will be removed from your workspace. This can’t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary">Cancel</Button>
          <Button variant="danger">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const SheetStory: Story = {
  name: "Sheet",
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">Open navigation</Button>
      </SheetTrigger>
      <SheetContent side="start">
        <SheetTitle>Navigation</SheetTitle>
        <p className="mt-4 text-sm text-text-muted">
          Slides from the logical start — try the RTL toolbar toggle.
        </p>
      </SheetContent>
    </Sheet>
  ),
};

export const PopoverStory: Story = {
  name: "Popover",
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary">Share…</Button>
      </PopoverTrigger>
      <PopoverContent>
        <p className="text-sm text-text-secondary">
          Sharing arrives with the files module. This popover just proves the pattern.
        </p>
      </PopoverContent>
    </Popover>
  ),
};

export const TooltipStory: Story = {
  name: "Tooltip",
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost">
          <Icon icon={SunMoon} size={16} />
          Hover me
        </Button>
      </TooltipTrigger>
      <TooltipContent>Change theme</TooltipContent>
    </Tooltip>
  ),
};

export const MenuStory: Story = {
  name: "DropdownMenu",
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">
          <Icon icon={Settings} size={16} />
          Preferences
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Preferences</DropdownMenuLabel>
        <DropdownMenuItem>
          <Icon icon={SunMoon} size={16} />
          Theme
          <DropdownMenuShortcut>⌘T</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Icon icon={Languages} size={16} />
          Language
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>Advanced (soon)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
