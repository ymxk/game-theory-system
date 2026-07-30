import { generateStrategyIdCombinations, profileKey } from "./solver"
import type { GameCase, PayoffCell } from "./types"

export function reconcileScenarioPayoffs(game: GameCase): GameCase {
  const keys = generateStrategyIdCombinations(game)
  return {
    ...game,
    scenarios: game.scenarios.map((scenario) => ({
      ...scenario,
      payoffs: Object.fromEntries(
        keys.map((strategyIds) => {
          const key = profileKey(strategyIds)
          const existing = scenario.payoffs[key]
          const fallback: PayoffCell = {
            utilities: Object.fromEntries(
              game.players.map((player) => [player.id, null])
            ),
            confidence: "medium",
            evidence: "",
            note: "",
          }
          return [
            key,
            existing
              ? {
                  ...existing,
                  utilities: Object.fromEntries(
                    game.players.map((player) => [
                      player.id,
                      existing.utilities[player.id] ?? null,
                    ])
                  ),
                }
              : fallback,
          ]
        })
      ),
    })),
  }
}

