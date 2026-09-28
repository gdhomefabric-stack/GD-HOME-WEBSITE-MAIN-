"use client";

/** Where an uploaded photo should go. */
export type PhotoTarget = { kind: "new" } | { kind: "layer"; id: string } | { kind: "background" };

let picker: ((t: PhotoTarget) => void) | null = null;

export const registerPhotoPicker = (fn: ((t: PhotoTarget) => void) | null) => {
  picker = fn;
};

/** Open the file chooser (the studio owns the hidden input). */
export const requestPhoto = (t: PhotoTarget = { kind: "new" }) => picker?.(t);
