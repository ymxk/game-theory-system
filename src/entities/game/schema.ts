import { z } from "zod"

const confidenceSchema = z.enum(["high", "medium", "low"])

export const playerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string(),
  reservationPayoff: z.number(),
  participationConstraintEnabled: z.boolean(),
})

export const strategySchema = z.object({
  id: z.string().min(1),
  playerId: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
})

export const payoffCellSchema = z.object({
  utilities: z.record(z.string(), z.number().nullable()),
  confidence: confidenceSchema,
  evidence: z.string(),
  note: z.string(),
})

export const scenarioSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["baseline", "conservative", "optimistic", "custom"]),
  description: z.string(),
  probability: z.number().min(0).max(1).nullable(),
  payoffs: z.record(z.string(), payoffCellSchema),
})

const suitabilitySchema = z.object({
  interactionIsStrategic: z.boolean().nullable(),
  participantsAreIdentifiable: z.boolean().nullable(),
  strategiesAreEnumerable: z.boolean().nullable(),
  payoffsAreComparable: z.boolean().nullable(),
  rulesAreStable: z.boolean().nullable(),
})

const versionSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  createdAt: z.string(),
  summary: z.string(),
  snapshot: z.unknown(),
})

export const gameCaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  type: z.enum([
    "bidding",
    "negotiation",
    "cooperation",
    "supervision",
    "compliance",
    "custom",
  ]),
  status: z.enum(["draft", "modeled", "analyzed"]),
  payoffMode: z.enum(["utility", "amount"]),
  sameComparableScale: z.boolean(),
  staticApproximationConfirmed: z.boolean(),
  focusPlayerId: z.string(),
  currentScenarioId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int().positive(),
  isSample: z.boolean(),
  players: z.array(playerSchema).min(2).max(4),
  strategies: z.array(strategySchema).min(4).max(20),
  scenarios: z.array(scenarioSchema).min(1),
  suitability: suitabilitySchema,
  versions: z.array(versionSchema),
})

export const backupSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  cases: z.array(gameCaseSchema),
})

export type GameCaseInput = z.infer<typeof gameCaseSchema>

