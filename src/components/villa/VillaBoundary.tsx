"use client";

import { Component, type ReactNode } from "react";

/**
 * Catches anything the 3D engine throws (a model or texture that fails to
 * download, a GPU that refuses a shader, a lost context) so the visitor gets
 * the room gallery instead of a crashed page.
 */
export class VillaBoundary extends Component<{ onFail: (reason: string) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error("[villa] 3D experience failed, switching to the room gallery:", error);
    this.props.onFail(reason);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
