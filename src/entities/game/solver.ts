import type {
  AnalysisResult,
  BestResponse,
  DeviationEvidence,
  DominanceResult,
  GameCase,
  MixedEquilibrium,
  Scenario,
  ScenarioComparison,
  Strategy,
  StrategyProfile,
} from "./types"

const EPSILON = 1e-9
export const MAX_STRATEGY_PROFILES = 625

export function profileKey(strategyIds: string[]) {
  return strategyIds.join("::")
}

export function getPlayerStrategies(game: GameCase, playerId: string) {
  return game.strategies.filter((strategy) => strategy.playerId === playerId)
}

export function strategyProfileCount(game: Pick<GameCase, "players" | "strategies">) {
  return game.players.reduce(
    (total, player) =>
      total *
      game.strategies.filter((strategy) => strategy.playerId === player.id).length,
    1
  )
}

export function validateGame(game: GameCase, scenario: Scenario) {
  const errors: string[] = []
  if (game.players.length < 2 || game.players.length > 4) {
    errors.push("参与方数量必须为 2–4 个。")
  }
  for (const player of game.players) {
    const count = getPlayerStrategies(game, player.id).length
    if (count < 2 || count > 5) {
      errors.push(`${player.name} 的策略数量必须为 2–5 个。`)
    }
  }
  const count = strategyProfileCount(game)
  if (count > MAX_STRATEGY_PROFILES) {
    errors.push(`策略组合共 ${count} 个，超过 625 个上限。`)
  }
  const profiles = generateStrategyIdCombinations(game)
  for (const strategyIds of profiles) {
    const cell = scenario.payoffs[profileKey(strategyIds)]
    if (!cell) {
      errors.push(`组合“${profileLabel(game, strategyIds)}”尚未录入收益。`)
      continue
    }
    for (const player of game.players) {
      if (cell.utilities[player.id] === null || cell.utilities[player.id] === undefined) {
        errors.push(`组合“${profileLabel(game, strategyIds)}”缺少 ${player.name} 的收益。`)
      }
    }
  }
  return errors
}

export function generateStrategyIdCombinations(
  game: Pick<GameCase, "players" | "strategies">
) {
  return game.players.reduce<string[][]>(
    (profiles, player) => {
      const strategies = game.strategies.filter(
        (strategy) => strategy.playerId === player.id
      )
      return profiles.flatMap((profile) =>
        strategies.map((strategy) => [...profile, strategy.id])
      )
    },
    [[]]
  )
}

export function createProfile(
  game: GameCase,
  scenario: Scenario,
  strategyIds: string[]
): StrategyProfile {
  const key = profileKey(strategyIds)
  const cell = scenario.payoffs[key]
  return {
    key,
    strategyIds,
    strategyNames: strategyIds.map(
      (id) => game.strategies.find((strategy) => strategy.id === id)?.name ?? id
    ),
    payoffs: game.players.map((player) => cell?.utilities[player.id] ?? 0),
  }
}

export function analyzeGame(game: GameCase, scenarioId = game.currentScenarioId): AnalysisResult {
  const scenario =
    game.scenarios.find((item) => item.id === scenarioId) ?? game.scenarios[0]
  const errors = validateGame(game, scenario)
  const warnings: string[] = [...errors]

  if (!game.staticApproximationConfirmed) {
    warnings.unshift("尚未确认静态近似假设，结果仅供结构检查。")
  }

  const profiles = generateStrategyIdCombinations(game).map((ids) =>
    createProfile(game, scenario, ids)
  )

  if (errors.length > 0) {
    return {
      generatedAt: new Date().toISOString(),
      scenarioId: scenario.id,
      profiles,
      pureEquilibria: [],
      bestResponses: [],
      dominance: [],
      paretoEfficientProfileKeys: [],
      mixedEquilibrium: null,
      totalPayoffs: null,
      warnings,
    }
  }

  const bestResponses = findBestResponses(game, profiles)
  const pureEquilibria = profiles.flatMap((profile) => {
    const deviations = collectDeviations(game, scenario, profile)
    const profitable = deviations.some((deviation) => deviation.gain > EPSILON)
    if (profitable) return []
    const margin = Math.min(...deviations.map((deviation) => -deviation.gain))
    const participationSatisfied = game.players.every((player, index) => {
      if (!player.participationConstraintEnabled) return true
      return profile.payoffs[index] + EPSILON >= player.reservationPayoff
    })
    return [
      {
        profile,
        strength: margin > EPSILON ? ("strict" as const) : ("weak" as const),
        margin: Math.abs(margin) < EPSILON ? 0 : margin,
        deviations,
        participationSatisfied,
      },
    ]
  })

  const totalPayoffs = game.sameComparableScale
    ? Object.fromEntries(
        profiles.map((profile) => [
          profile.key,
          profile.payoffs.reduce((total, value) => total + value, 0),
        ])
      )
    : null

  if (!game.sameComparableScale) {
    warnings.push("各方收益未确认处于同一可比尺度，已隐藏总收益。")
  }

  return {
    generatedAt: new Date().toISOString(),
    scenarioId: scenario.id,
    profiles,
    pureEquilibria,
    bestResponses,
    dominance: findDominance(game, profiles),
    paretoEfficientProfileKeys: findParetoEfficientProfiles(profiles),
    mixedEquilibrium: findMixedEquilibrium(game, profiles),
    totalPayoffs,
    warnings,
  }
}

function collectDeviations(
  game: GameCase,
  scenario: Scenario,
  profile: StrategyProfile
): DeviationEvidence[] {
  return game.players.flatMap((player, playerIndex) => {
    const currentStrategyId = profile.strategyIds[playerIndex]
    const currentStrategy = game.strategies.find(
      (strategy) => strategy.id === currentStrategyId
    )
    return getPlayerStrategies(game, player.id)
      .filter((strategy) => strategy.id !== currentStrategyId)
      .map((strategy) => {
        const deviatedIds = [...profile.strategyIds]
        deviatedIds[playerIndex] = strategy.id
        const deviationPayoff =
          scenario.payoffs[profileKey(deviatedIds)]?.utilities[player.id] ?? 0
        const currentPayoff = profile.payoffs[playerIndex]
        return {
          playerId: player.id,
          playerName: player.name,
          fromStrategyId: currentStrategyId,
          fromStrategyName: currentStrategy?.name ?? currentStrategyId,
          toStrategyId: strategy.id,
          toStrategyName: strategy.name,
          currentPayoff,
          deviationPayoff,
          gain: deviationPayoff - currentPayoff,
        }
      })
  })
}

function findBestResponses(game: GameCase, profiles: StrategyProfile[]): BestResponse[] {
  const responses: BestResponse[] = []
  for (const [playerIndex, player] of game.players.entries()) {
    const groups = new Map<string, StrategyProfile[]>()
    for (const profile of profiles) {
      const opponents = profile.strategyIds.filter((_, index) => index !== playerIndex)
      const key = profileKey(opponents)
      groups.set(key, [...(groups.get(key) ?? []), profile])
    }
    for (const [opponentKey, candidates] of groups) {
      const payoff = Math.max(...candidates.map((profile) => profile.payoffs[playerIndex]))
      responses.push({
        playerId: player.id,
        playerName: player.name,
        opponentStrategyIds: opponentKey ? opponentKey.split("::") : [],
        strategyIds: candidates
          .filter(
            (profile) => Math.abs(profile.payoffs[playerIndex] - payoff) < EPSILON
          )
          .map((profile) => profile.strategyIds[playerIndex]),
        payoff,
      })
    }
  }
  return responses
}

function findDominance(game: GameCase, profiles: StrategyProfile[]): DominanceResult[] {
  const results: DominanceResult[] = []
  for (const [playerIndex, player] of game.players.entries()) {
    const strategies = getPlayerStrategies(game, player.id)
    for (const candidate of strategies) {
      for (const compared of strategies) {
        if (candidate.id === compared.id) continue
        const comparisons = profiles
          .filter((profile) => profile.strategyIds[playerIndex] === candidate.id)
          .map((candidateProfile) => {
            const comparedIds = [...candidateProfile.strategyIds]
            comparedIds[playerIndex] = compared.id
            const comparedProfile = profiles.find(
              (profile) => profile.key === profileKey(comparedIds)
            )
            return candidateProfile.payoffs[playerIndex] -
              (comparedProfile?.payoffs[playerIndex] ?? 0)
          })
        const strict = comparisons.every((difference) => difference > EPSILON)
        const weak =
          comparisons.every((difference) => difference >= -EPSILON) &&
          comparisons.some((difference) => difference > EPSILON)
        if (strict || weak) {
          results.push({
            playerId: player.id,
            playerName: player.name,
            dominantStrategyId: candidate.id,
            dominantStrategyName: candidate.name,
            dominatedStrategyId: compared.id,
            dominatedStrategyName: compared.name,
            strength: strict ? "strict" : "weak",
          })
        }
      }
    }
  }
  return results
}

function findParetoEfficientProfiles(profiles: StrategyProfile[]) {
  return profiles
    .filter(
      (candidate) =>
        !profiles.some(
          (other) =>
            other.key !== candidate.key &&
            other.payoffs.every(
              (payoff, index) => payoff >= candidate.payoffs[index] - EPSILON
            ) &&
            other.payoffs.some(
              (payoff, index) => payoff > candidate.payoffs[index] + EPSILON
            )
        )
    )
    .map((profile) => profile.key)
}

function findMixedEquilibrium(
  game: GameCase,
  profiles: StrategyProfile[]
): MixedEquilibrium | null {
  if (game.payoffMode !== "utility" || game.players.length !== 2) return null
  const rowStrategies = getPlayerStrategies(game, game.players[0].id)
  const columnStrategies = getPlayerStrategies(game, game.players[1].id)
  if (rowStrategies.length !== 2 || columnStrategies.length !== 2) return null

  const payoff = (row: Strategy, column: Strategy, playerIndex: number) =>
    profiles.find(
      (profile) => profile.key === profileKey([row.id, column.id])
    )?.payoffs[playerIndex] ?? 0

  const [r0, r1] = rowStrategies
  const [c0, c1] = columnStrategies
  const a = payoff(r0, c0, 0)
  const b = payoff(r0, c1, 0)
  const c = payoff(r1, c0, 0)
  const d = payoff(r1, c1, 0)
  const e = payoff(r0, c0, 1)
  const f = payoff(r0, c1, 1)
  const g = payoff(r1, c0, 1)
  const h = payoff(r1, c1, 1)

  const rowDenominator = e - f - g + h
  const columnDenominator = a - b - c + d
  if (
    Math.abs(rowDenominator) < EPSILON ||
    Math.abs(columnDenominator) < EPSILON
  ) {
    return null
  }
  const rowProbability = (h - g) / rowDenominator
  const columnProbability = (d - b) / columnDenominator
  if (
    rowProbability <= EPSILON ||
    rowProbability >= 1 - EPSILON ||
    columnProbability <= EPSILON ||
    columnProbability >= 1 - EPSILON
  ) {
    return null
  }

  const rowExpected =
    columnProbability * a + (1 - columnProbability) * b
  const columnExpected = rowProbability * e + (1 - rowProbability) * g
  return {
    rowPlayerId: game.players[0].id,
    columnPlayerId: game.players[1].id,
    rowStrategyProbabilities: {
      [r0.id]: rowProbability,
      [r1.id]: 1 - rowProbability,
    },
    columnStrategyProbabilities: {
      [c0.id]: columnProbability,
      [c1.id]: 1 - columnProbability,
    },
    expectedPayoffs: {
      [game.players[0].id]: rowExpected,
      [game.players[1].id]: columnExpected,
    },
  }
}

export function compareScenarios(game: GameCase): ScenarioComparison[] {
  return game.scenarios.map((scenario) => {
    const result = analyzeGame(game, scenario.id)
    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      scenarioType: scenario.type,
      equilibriumProfileKeys: result.pureEquilibria.map(
        (equilibrium) => equilibrium.profile.key
      ),
      equilibriumLabels: result.pureEquilibria.map((equilibrium) =>
        equilibrium.profile.strategyNames.join(" / ")
      ),
      strongestMargin:
        result.pureEquilibria.length > 0
          ? Math.max(...result.pureEquilibria.map((item) => item.margin))
          : null,
      warnings: result.warnings,
    }
  })
}

export function getRobustEquilibriumKeys(comparisons: ScenarioComparison[]) {
  if (comparisons.length === 0) return []
  return comparisons[0].equilibriumProfileKeys.filter((key) =>
    comparisons.every((comparison) => comparison.equilibriumProfileKeys.includes(key))
  )
}

export function profileLabel(game: GameCase, strategyIds: string[]) {
  return strategyIds
    .map((id) => game.strategies.find((strategy) => strategy.id === id)?.name ?? id)
    .join(" / ")
}

