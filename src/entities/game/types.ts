export type CaseType =
  | "bidding"
  | "negotiation"
  | "cooperation"
  | "supervision"
  | "compliance"
  | "custom"

export type CaseStatus = "draft" | "modeled" | "analyzed"
export type PayoffMode = "utility" | "amount"
export type ScenarioType = "baseline" | "conservative" | "optimistic" | "custom"
export type ConfidenceLevel = "high" | "medium" | "low"

export interface Player {
  id: string
  name: string
  role: string
  reservationPayoff: number
  participationConstraintEnabled: boolean
}

export interface Strategy {
  id: string
  playerId: string
  name: string
  description: string
}

export interface PayoffCell {
  utilities: Record<string, number | null>
  confidence: ConfidenceLevel
  evidence: string
  note: string
}

export interface Scenario {
  id: string
  name: string
  type: ScenarioType
  description: string
  probability: number | null
  payoffs: Record<string, PayoffCell>
}

export interface SuitabilityAssessment {
  interactionIsStrategic: boolean | null
  participantsAreIdentifiable: boolean | null
  strategiesAreEnumerable: boolean | null
  payoffsAreComparable: boolean | null
  rulesAreStable: boolean | null
}

export interface CaseVersion {
  id: string
  version: number
  createdAt: string
  summary: string
  snapshot: Omit<GameCase, "versions">
}

export interface GameCase {
  id: string
  title: string
  description: string
  type: CaseType
  status: CaseStatus
  payoffMode: PayoffMode
  sameComparableScale: boolean
  staticApproximationConfirmed: boolean
  focusPlayerId: string
  currentScenarioId: string
  createdAt: string
  updatedAt: string
  version: number
  isSample: boolean
  players: Player[]
  strategies: Strategy[]
  scenarios: Scenario[]
  suitability: SuitabilityAssessment
  versions: CaseVersion[]
}

export interface StrategyProfile {
  key: string
  strategyIds: string[]
  strategyNames: string[]
  payoffs: number[]
}

export interface DeviationEvidence {
  playerId: string
  playerName: string
  fromStrategyId: string
  fromStrategyName: string
  toStrategyId: string
  toStrategyName: string
  currentPayoff: number
  deviationPayoff: number
  gain: number
}

export interface PureEquilibrium {
  profile: StrategyProfile
  strength: "strict" | "weak"
  margin: number
  deviations: DeviationEvidence[]
  participationSatisfied: boolean
}

export interface BestResponse {
  playerId: string
  playerName: string
  opponentStrategyIds: string[]
  strategyIds: string[]
  payoff: number
}

export interface DominanceResult {
  playerId: string
  playerName: string
  dominantStrategyId: string
  dominantStrategyName: string
  dominatedStrategyId: string
  dominatedStrategyName: string
  strength: "strict" | "weak"
}

export interface MixedEquilibrium {
  rowPlayerId: string
  columnPlayerId: string
  rowStrategyProbabilities: Record<string, number>
  columnStrategyProbabilities: Record<string, number>
  expectedPayoffs: Record<string, number>
}

export interface AnalysisResult {
  generatedAt: string
  scenarioId: string
  profiles: StrategyProfile[]
  pureEquilibria: PureEquilibrium[]
  bestResponses: BestResponse[]
  dominance: DominanceResult[]
  paretoEfficientProfileKeys: string[]
  mixedEquilibrium: MixedEquilibrium | null
  totalPayoffs: Record<string, number> | null
  warnings: string[]
}

export interface ScenarioComparison {
  scenarioId: string
  scenarioName: string
  scenarioType: ScenarioType
  equilibriumProfileKeys: string[]
  equilibriumLabels: string[]
  strongestMargin: number | null
  warnings: string[]
}

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  bidding: "投标竞价",
  negotiation: "商务谈判",
  cooperation: "合作分配",
  supervision: "监督激励",
  compliance: "合规博弈",
  custom: "自定义",
}

export const SCENARIO_TYPE_LABELS: Record<ScenarioType, string> = {
  baseline: "基准",
  conservative: "保守",
  optimistic: "乐观",
  custom: "自定义",
}

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  draft: "草稿",
  modeled: "已建模",
  analyzed: "已分析",
}

