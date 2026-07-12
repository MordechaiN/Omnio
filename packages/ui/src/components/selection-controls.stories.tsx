import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "./checkbox.tsx";
import { Label } from "./label.tsx";
import { RadioGroup, RadioGroupItem } from "./radio-group.tsx";
import { Switch } from "./switch.tsx";

const meta = {
  title: "Primitives/Selection controls",
  component: Checkbox,
  parameters: {
    docs: {
      description: {
        component:
          "Checkbox, Switch and RadioGroup over Radix — full keyboard support (space toggles, arrows move within a radio group). The switch thumb travels logically, so it mirrors in RTL.",
      },
    },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CheckboxStory: Story = {
  name: "Checkbox",
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Checkbox id="c1" defaultChecked />
        <Label htmlFor="c1">Keep original file</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="c2" />
        <Label htmlFor="c2">Strip metadata</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="c3" disabled />
        <Label htmlFor="c3">Unavailable option</Label>
      </div>
    </div>
  ),
};

export const SwitchStory: Story = {
  name: "Switch",
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="s1" defaultChecked />
      <Label htmlFor="s1">High contrast</Label>
    </div>
  ),
};

export const RadioStory: Story = {
  name: "RadioGroup",
  render: () => (
    <RadioGroup defaultValue="medium" aria-label="Compression level">
      {(["low", "medium", "high"] as const).map((level) => (
        <div key={level} className="flex items-center gap-2">
          <RadioGroupItem value={level} id={`r-${level}`} />
          <Label htmlFor={`r-${level}`} className="capitalize">
            {level}
          </Label>
        </div>
      ))}
    </RadioGroup>
  ),
};
