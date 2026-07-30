import { openDB, type DBSchema } from "idb"

import type { GameCase } from "@/entities/game/types"

interface DecisionConsoleDB extends DBSchema {
  cases: {
    key: string
    value: GameCase
    indexes: {
      "by-updated-at": string
    }
  }
}

const DATABASE_NAME = "game-theory-decision-console"
const DATABASE_VERSION = 1

function getDatabase() {
  return openDB<DecisionConsoleDB>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains("cases")) {
        const store = database.createObjectStore("cases", { keyPath: "id" })
        store.createIndex("by-updated-at", "updatedAt")
      }
    },
  })
}

export async function listCases() {
  const database = await getDatabase()
  const cases = await database.getAllFromIndex("cases", "by-updated-at")
  return cases.reverse()
}

export async function saveCase(game: GameCase) {
  const database = await getDatabase()
  await database.put("cases", game)
}

export async function saveCases(cases: GameCase[]) {
  const database = await getDatabase()
  const transaction = database.transaction("cases", "readwrite")
  for (const game of cases) {
    await transaction.store.put(game)
  }
  await transaction.done
}

export async function deleteCase(caseId: string) {
  const database = await getDatabase()
  await database.delete("cases", caseId)
}

export async function replaceAllCases(cases: GameCase[]) {
  const database = await getDatabase()
  const transaction = database.transaction("cases", "readwrite")
  await transaction.store.clear()
  for (const game of cases) {
    await transaction.store.put(game)
  }
  await transaction.done
}

