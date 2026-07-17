"use client";

import { useEffect, useRef, useState } from "react";
import { DropOverlay } from "./drop-overlay";
import { FileActionSheet } from "./file-action-sheet";
import { FileViewer } from "./file-viewer";

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

/**
 * Global file-drop experience: drag a file anywhere → an inviting overlay →
 * an action sheet (View + tools that accept the type) → the universal viewer.
 * Everything is in-memory and on-device; nothing is uploaded.
 */
export function FileDropProvider({ children }: { children: React.ReactNode }) {
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<File | null>(null);
  const [viewing, setViewing] = useState<File | null>(null);
  const depth = useRef(0);

  useEffect(() => {
    function onDragEnter(event: DragEvent) {
      if (!hasFiles(event)) return;
      depth.current += 1;
      setDragging(true);
    }
    function onDragOver(event: DragEvent) {
      if (hasFiles(event)) event.preventDefault();
    }
    function onDragLeave() {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    }
    function onDrop(event: DragEvent) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth.current = 0;
      setDragging(false);
      const file = event.dataTransfer?.files?.[0];
      if (file) {
        setViewing(null);
        setPending(file);
      }
    }

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  return (
    <>
      {children}
      {dragging ? <DropOverlay /> : null}
      <FileActionSheet
        file={pending}
        onView={() => {
          setViewing(pending);
          setPending(null);
        }}
        onClose={() => setPending(null)}
      />
      <FileViewer file={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
