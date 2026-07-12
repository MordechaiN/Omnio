import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileText, Image, Search } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion.tsx";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "./command.tsx";
import { Icon } from "./icon.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs.tsx";

const meta = {
  title: "Primitives/Navigation",
  component: Tabs,
  parameters: {
    docs: {
      description: {
        component:
          "Tabs, Accordion, Select and the Command palette primitives. All arrow-key navigable; the accordion animates to measured height and collapses instantly under reduced motion.",
      },
    },
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TabsStory: Story = {
  name: "Tabs",
  render: () => (
    <Tabs defaultValue="preview" className="max-w-md">
      <TabsList>
        <TabsTrigger value="preview">Preview</TabsTrigger>
        <TabsTrigger value="metadata">Metadata</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      <TabsContent value="preview">The file preview renders here.</TabsContent>
      <TabsContent value="metadata">EXIF, dimensions, size.</TabsContent>
      <TabsContent value="history">Recent actions on this file.</TabsContent>
    </Tabs>
  ),
};

export const AccordionStory: Story = {
  name: "Accordion",
  render: () => (
    <Accordion type="single" collapsible className="max-w-md">
      <AccordionItem value="a">
        <AccordionTrigger>Is my data private?</AccordionTrigger>
        <AccordionContent>
          Browser-tier tools never upload your files — processing happens on your device.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionTrigger>What do I need to run Omnio?</AccordionTrigger>
        <AccordionContent>
          Docker and Docker Compose. One command brings up the stack.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const SelectStory: Story = {
  name: "Select",
  render: () => (
    <div className="max-w-48">
      <Select defaultValue="png">
        <SelectTrigger aria-label="Output format">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="png">PNG</SelectItem>
          <SelectItem value="jpg">JPEG</SelectItem>
          <SelectItem value="webp">WebP</SelectItem>
          <SelectItem value="avif">AVIF</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const CommandStory: Story = {
  name: "Command (inline)",
  render: () => (
    <div className="max-w-md rounded-lg border border-border-subtle bg-overlay shadow-2">
      <Command>
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Tools">
            <CommandItem>
              <Icon icon={FileText} size={16} />
              Merge PDFs
              <CommandShortcut>PDF</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <Icon icon={Image} size={16} />
              Resize image
              <CommandShortcut>Images</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <Icon icon={Search} size={16} />
              Search everything
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  ),
};
