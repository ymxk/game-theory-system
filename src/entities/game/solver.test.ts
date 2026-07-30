import { describe, expect, it } from "vitest"

import {
  analyzeGame,
  compareScenarios,
  generateStrategyIdCombinations,
  getRobustEquilibriumKeys,
  profileKey,
  strategyProfileCount,
} from "./solver"
import type { GameCase, PayoffCell, Scenario } from "./types"

function cell(game: GameCase, values: number[]): PayoffCell {
  return {
    utilities: Object.fromEntries(
      game.players.map((player, index) => [player.id, values[index]])
    ),
    confidence: "high",
    evidence: "test",
    note: "",
  }
}

function buildTwoPlayerGame(
  matrix: number[][][],
  options: Partial<GameCase> = {}
): GameCase {
  const game: GameCase = {
    id: "game",
    title: "测试博弈",
    description: "",
    type: "custom",
    status: "modeled",
    payoffMode: "utility",
    sameComparableScale: true,
    staticApproximationConfirmed: true,
    focusPlayerId: "row",
    currentScenarioId: "baseline",
    createdAt: "2026-07-24T00:00:00.000Z",
    updatedAt: "2026-07-24T00:00:00.000Z",
    version: 1,
    isSample: false,
    players: [
      {
        id: "row",
        name: "行方",
        role: "",
        reservationPayoff: 0,
        participationConstraintEnabled: false,
      },
      {
        id: "column",
        name: "列方",
        role: "",
        reservationPayoff: 0,
        participationConstraintEnabled: false,
      },
    ],
    strategies: [
      { id: "r0", playerId: "row", name: "R0", description: "" },
      { id: "r1", playerId: "row", name: "R1", description: "" },
      { id: "c0", playerId: "column", name: "C0", description: "" },
      { id: "c1", playerId: "column", name: "C1", description: "" },
    ],
    scenarios: [],
    suitability: {
      interactionIsStrategic: true,
      participantsAreIdentifiable: true,
      strategiesAreEnumerable: true,
      payoffsAreComparable: true,
      rulesAreStable: true,
    },
    versions: [],
    ...options,
  }
  const payoffs: Record<string, PayoffCell> = {}
  for (const [rowIndex, rowId] of ["r0", "r1"].entries()) {
    for (const [columnIndex, columnId] of ["c0", "c1"].entries()) {
      payoffs[profileKey([rowId, columnId])] = cell(
        game,
        matrix[rowIndex][columnIndex]
      )
    }
  }
  game.scenarios = [
    {
      id: "baseline",
      name: "基准",
      type: "baseline",
      description: "",
      probability: null,
      payoffs,
    },
  ]
  return game
}

describe("pure strategy analysis", () => {
  it("finds the unique strict equilibrium and dominance in prisoner dilemma", () => {
    const game = buildTwoPlayerGame([
      [
        [3, 3],
        [0, 5],
      ],
      [
        [5, 0],
        [1, 1],
      ],
    ])
    const result = analyzeGame(game)

    expect(result.pureEquilibria).toHaveLength(1)
    expect(result.pureEquilibria[0].profile.key).toBe("r1::c1")
    expect(result.pureEquilibria[0].strength).toBe("strict")
    expect(result.dominance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: "row",
          dominantStrategyId: "r1",
          dominatedStrategyId: "r0",
          strength: "strict",
        }),
        expect.objectContaining({
          playerId: "column",
          dominantStrategyId: "c1",
          dominatedStrategyId: "c0",
          strength: "strict",
        }),
      ])
    )
    expect(result.paretoEfficientProfileKeys).not.toContain("r1::c1")
  })

  it("finds both strict equilibria in a coordination game", () => {
    const game = buildTwoPlayerGame([
      [
        [4, 4],
        [0, 0],
      ],
      [
        [0, 0],
        [3, 3],
      ],
    ])
    const result = analyzeGame(game)
    expect(result.pureEquilibria.map((item) => item.profile.key)).toEqual([
      "r0::c0",
      "r1::c1",
    ])
    expect(result.pureEquilibria.every((item) => item.strength === "strict")).toBe(
      true
    )
  })

  it("marks all profiles as weak equilibria when every payoff is tied", () => {
    const game = buildTwoPlayerGame([
      [
        [1, 1],
        [1, 1],
      ],
      [
        [1, 1],
        [1, 1],
      ],
    ])
    const result = analyzeGame(game)
    expect(result.pureEquilibria).toHaveLength(4)
    expect(result.pureEquilibria.every((item) => item.strength === "weak")).toBe(
      true
    )
    expect(result.dominance).toHaveLength(0)
  })
})

describe("mixed strategy analysis", () => {
  it("finds the 50/50 mixed equilibrium in matching pennies", () => {
    const game = buildTwoPlayerGame([
      [
        [1, -1],
        [-1, 1],
      ],
      [
        [-1, 1],
        [1, -1],
      ],
    ])
    const result = analyzeGame(game)
    expect(result.pureEquilibria).toHaveLength(0)
    expect(result.mixedEquilibrium).not.toBeNull()
    expect(result.mixedEquilibrium?.rowStrategyProbabilities.r0).toBeCloseTo(0.5)
    expect(result.mixedEquilibrium?.columnStrategyProbabilities.c0).toBeCloseTo(
      0.5
    )
    expect(result.mixedEquilibrium?.expectedPayoffs.row).toBeCloseTo(0)
  })

  it("does not calculate mixed equilibrium in amount mode", () => {
    const game = buildTwoPlayerGame(
      [
        [
          [1, -1],
          [-1, 1],
        ],
        [
          [-1, 1],
          [1, -1],
        ],
      ],
      { payoffMode: "amount" }
    )
    expect(analyzeGame(game).mixedEquilibrium).toBeNull()
  })
})

describe("multi-player and scenario boundaries", () => {
  it("enumerates and solves a three-player game", () => {
    const game = buildTwoPlayerGame([
      [
        [0, 0],
        [0, 0],
      ],
      [
        [0, 0],
        [0, 0],
      ],
    ])
    game.players.push({
      id: "third",
      name: "第三方",
      role: "",
      reservationPayoff: 0,
      participationConstraintEnabled: false,
    })
    game.strategies.push(
      { id: "t0", playerId: "third", name: "T0", description: "" },
      { id: "t1", playerId: "third", name: "T1", description: "" }
    )
    game.scenarios[0].payoffs = Object.fromEntries(
      generateStrategyIdCombinations(game).map((ids) => [
        profileKey(ids),
        cell(
          game,
          ids.map((id) => (id.endsWith("0") ? 1 : 0))
        ),
      ])
    )
    const result = analyzeGame(game)
    expect(strategyProfileCount(game)).toBe(8)
    expect(result.pureEquilibria).toHaveLength(1)
    expect(result.pureEquilibria[0].profile.key).toBe("r0::c0::t0")
    expect(result.mixedEquilibrium).toBeNull()
  })

  it("checks participation constraints", () => {
    const game = buildTwoPlayerGame([
      [
        [3, 3],
        [0, 5],
      ],
      [
        [5, 0],
        [1, 1],
      ],
    ])
    game.players[0].participationConstraintEnabled = true
    game.players[0].reservationPayoff = 2
    expect(analyzeGame(game).pureEquilibria[0].participationSatisfied).toBe(false)
  })

  it("identifies robust equilibria across scenarios", () => {
    const game = buildTwoPlayerGame([
      [
        [3, 3],
        [0, 5],
      ],
      [
        [5, 0],
        [1, 1],
      ],
    ])
    const copied: Scenario = {
      ...structuredClone(game.scenarios[0]),
      id: "conservative",
      name: "保守",
      type: "conservative",
    }
    game.scenarios.push(copied)
    const comparisons = compareScenarios(game)
    expect(getRobustEquilibriumKeys(comparisons)).toEqual(["r1::c1"])
  })
})

