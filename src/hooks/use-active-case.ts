"use client"

import { useGameStore } from "@/stores/use-game-store"

export function useActiveCase() {
  const activeCaseId = useGameStore((state) => state.activeCaseId)
  const game = useGameStore((state) =>
    state.cases.find((item) => item.id === activeCaseId)
  )
  return game
}

