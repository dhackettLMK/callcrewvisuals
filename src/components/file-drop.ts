"use client";

import { useState, type DragEvent } from "react";

const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes("Files");

/** Native (desktop) file drag-and-drop onto an element. */
export function useFileDrop(onFiles: (files: File[]) => void) {
  const [fileOver, setFileOver] = useState(false);
  return {
    fileOver,
    fileDropProps: {
      onDragOver: (e: DragEvent) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy";
        setFileOver(true);
      },
      onDragLeave: (e: DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setFileOver(false);
        }
      },
      onDrop: (e: DragEvent) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        e.stopPropagation();
        setFileOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      },
    },
  };
}
