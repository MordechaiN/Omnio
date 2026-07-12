import type { Meta, StoryObj } from "@storybook/react-vite";
import { FolderOpen } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./alert.tsx";
import { Badge } from "./badge.tsx";
import { Button } from "./button.tsx";
import { EmptyState } from "./empty-state.tsx";
import { Progress } from "./progress.tsx";
import { Skeleton } from "./skeleton.tsx";
import { Spinner } from "./spinner.tsx";

const meta = {
  title: "Primitives/Feedback",
  component: Alert,
  parameters: {
    docs: {
      description: {
        component:
          "Status communication. Alerts carry role=status (info/success) or role=alert (warning/danger). Progress fills from the logical start, so it mirrors in RTL. Skeletons are aria-hidden.",
      },
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Alerts: Story = {
  render: () => (
    <div className="flex max-w-lg flex-col gap-3">
      <Alert variant="info">
        <AlertTitle>Runs on your device</AlertTitle>
        <AlertDescription>This tool never uploads your file.</AlertDescription>
      </Alert>
      <Alert variant="success">
        <AlertTitle>Conversion finished</AlertTitle>
        <AlertDescription>12 pages written to output.pdf.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <AlertTitle>Large file</AlertTitle>
        <AlertDescription>Files over 200 MB may take a while.</AlertDescription>
      </Alert>
      <Alert variant="danger">
        <AlertTitle>Processing failed</AlertTitle>
        <AlertDescription>The file appears to be corrupted.</AlertDescription>
      </Alert>
    </div>
  ),
};

export const Badges: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>Neutral</Badge>
      <Badge variant="accent">In progress</Badge>
      <Badge variant="success">Done</Badge>
      <Badge variant="warning">Beta</Badge>
      <Badge variant="danger">Deprecated</Badge>
      <Badge variant="info">New</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

export const ProgressStory: Story = {
  name: "Progress",
  render: () => (
    <div className="flex max-w-sm flex-col gap-4">
      <Progress value={62} aria-label="Upload progress" />
      <Progress aria-label="Processing" />
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-4">
      <div className="flex items-center gap-3">
        <Spinner label="Loading" />
        <Spinner size={24} />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  ),
};

export const EmptyStateStory: Story = {
  name: "EmptyState",
  render: () => (
    <EmptyState
      icon={FolderOpen}
      title="No files yet"
      description="Drop a file anywhere, or press ⌘K and search for a tool."
      action={<Button>Choose a file</Button>}
      className="max-w-lg"
    />
  ),
};
