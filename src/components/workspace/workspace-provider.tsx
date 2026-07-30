"use client"

import * as React from "react"

import { Spinner } from "@/components/ui/spinner"
import { useGameStore } from "@/stores/use-game-store"

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useGameStore((state) => state.hydrate)
  const hydrated = useGameStore((state) => state.hydrated)

  React.useEffect(() => {
    void hydrate()
  }, [hydrate])

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 text-sm text-muted-foreground">
        <Spinner />
        正在读取本地案例…
      </div>
    )
  }

  return children
}

