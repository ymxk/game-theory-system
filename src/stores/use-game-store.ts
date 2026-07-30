"use client"

import { create } from "zustand"

import { gameCaseSchema } from "@/entities/game/schema"
import { createCaseFromTemplate, createSampleCase } from "@/entities/game/templates"
import type { CaseType, GameCase } from "@/entities/game/types"
import {
  deleteCase as deleteStoredCase,
  listCases,
  replaceAllCases,
  saveCase,
} from "@/services/storage/case-repository"

type GameState = {
  cases: GameCase[]
  activeCaseId: string | null
  hydrated: boolean
  hydrate: () => Promise<void>
  setActiveCase: (caseId: string) => void
  createCase: (type?: CaseType) => Promise<GameCase>
  updateCase: (
    caseId: string,
    recipe: (current: GameCase) => GameCase,
    options?: { snapshotSummary?: string }
  ) => Promise<void>
  duplicateCase: (caseId: string) => Promise<GameCase | null>
  deleteCase: (caseId: string) => Promise<void>
  importCases: (cases: GameCase[], replace?: boolean) => Promise<void>
}

function withVersionSnapshot(game: GameCase, summary: string): GameCase {
  const { versions, ...snapshot } = game
  void versions
  return {
    ...game,
    versions: [
      ...game.versions,
      {
        id: crypto.randomUUID(),
        version: game.version,
        createdAt: new Date().toISOString(),
        summary,
        snapshot,
      },
    ].slice(-20),
  }
}

export const useGameStore = create<GameState>((set, get) => ({
  cases: [],
  activeCaseId: null,
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return
    let cases = await listCases()
    if (cases.length === 0) {
      const sample = createSampleCase()
      await saveCase(sample)
      cases = [sample]
    }
    set({
      cases,
      activeCaseId: cases[0]?.id ?? null,
      hydrated: true,
    })
  },
  setActiveCase: (activeCaseId) => set({ activeCaseId }),
  createCase: async (type = "cooperation") => {
    const game = createCaseFromTemplate(type)
    await saveCase(game)
    set((state) => ({
      cases: [game, ...state.cases],
      activeCaseId: game.id,
    }))
    return game
  },
  updateCase: async (caseId, recipe, options) => {
    const current = get().cases.find((game) => game.id === caseId)
    if (!current) return
    const base = options?.snapshotSummary
      ? withVersionSnapshot(current, options.snapshotSummary)
      : current
    const next = gameCaseSchema.parse({
      ...recipe(structuredClone(base)),
      id: current.id,
      updatedAt: new Date().toISOString(),
      version: options?.snapshotSummary ? current.version + 1 : current.version,
    }) as GameCase
    await saveCase(next)
    set((state) => ({
      cases: state.cases
        .map((game) => (game.id === caseId ? next : game))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    }))
  },
  duplicateCase: async (caseId) => {
    const current = get().cases.find((game) => game.id === caseId)
    if (!current) return null
    const now = new Date().toISOString()
    const duplicate: GameCase = {
      ...structuredClone(current),
      id: crypto.randomUUID(),
      title: `${current.title}（副本）`,
      createdAt: now,
      updatedAt: now,
      version: 1,
      isSample: false,
      versions: [],
    }
    await saveCase(duplicate)
    set((state) => ({
      cases: [duplicate, ...state.cases],
      activeCaseId: duplicate.id,
    }))
    return duplicate
  },
  deleteCase: async (caseId) => {
    await deleteStoredCase(caseId)
    set((state) => {
      const cases = state.cases.filter((game) => game.id !== caseId)
      return {
        cases,
        activeCaseId:
          state.activeCaseId === caseId ? (cases[0]?.id ?? null) : state.activeCaseId,
      }
    })
  },
  importCases: async (imported, replace = false) => {
    if (replace) {
      await replaceAllCases(imported)
      set({ cases: imported, activeCaseId: imported[0]?.id ?? null })
      return
    }
    const merged = [
      ...imported,
      ...get().cases.filter(
        (existing) => !imported.some((item) => item.id === existing.id)
      ),
    ]
    await replaceAllCases(merged)
    set({ cases: merged, activeCaseId: imported[0]?.id ?? get().activeCaseId })
  },
}))
