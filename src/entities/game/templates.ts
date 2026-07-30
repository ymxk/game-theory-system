import { generateStrategyIdCombinations, profileKey } from "./solver"
import type {
  CaseType,
  ConfidenceLevel,
  GameCase,
  PayoffCell,
  Player,
  Scenario,
  Strategy,
} from "./types"

type TemplateDefinition = {
  type: CaseType
  title: string
  description: string
  players: Array<{
    name: string
    role: string
    strategies: Array<{ name: string; description: string }>
  }>
}

export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    type: "bidding",
    title: "投标竞价",
    description: "用于分析报价强度、竞争响应与中标收益之间的取舍。",
    players: [
      {
        name: "我方",
        role: "投标方",
        strategies: [
          { name: "价值报价", description: "保持合理利润与交付边界" },
          { name: "进攻报价", description: "降低价格以提高中标概率" },
        ],
      },
      {
        name: "竞争方",
        role: "竞争投标方",
        strategies: [
          { name: "价值报价", description: "维持市场价格" },
          { name: "进攻报价", description: "主动压价竞争" },
        ],
      },
    ],
  },
  {
    type: "negotiation",
    title: "商务谈判",
    description: "用于分析坚持、让步与对方回应形成的谈判结果。",
    players: [
      {
        name: "我方",
        role: "谈判方",
        strategies: [
          { name: "坚持条件", description: "维持核心商务条件" },
          { name: "有限让步", description: "在边界内交换确定性" },
        ],
      },
      {
        name: "对方",
        role: "谈判对手",
        strategies: [
          { name: "接受", description: "接受当前方案" },
          { name: "继续施压", description: "要求进一步让步" },
        ],
      },
    ],
  },
  {
    type: "cooperation",
    title: "合作分配",
    description: "用于分析投入、搭便车与合作收益分配的稳定性。",
    players: [
      {
        name: "参与方 A",
        role: "合作成员",
        strategies: [
          { name: "充分投入", description: "按约承担资源与责任" },
          { name: "有限投入", description: "降低自身投入" },
        ],
      },
      {
        name: "参与方 B",
        role: "合作成员",
        strategies: [
          { name: "充分投入", description: "按约承担资源与责任" },
          { name: "有限投入", description: "降低自身投入" },
        ],
      },
    ],
  },
  {
    type: "supervision",
    title: "监督激励",
    description: "用于分析监督强度、执行选择与激励相容性。",
    players: [
      {
        name: "管理方",
        role: "监督者",
        strategies: [
          { name: "加强监督", description: "提高检查与反馈频率" },
          { name: "常规监督", description: "维持标准管理投入" },
        ],
      },
      {
        name: "执行方",
        role: "被监督者",
        strategies: [
          { name: "充分执行", description: "完整履行约定责任" },
          { name: "机会主义", description: "降低执行投入" },
        ],
      },
    ],
  },
  {
    type: "compliance",
    title: "合规博弈",
    description: "用于分析合规投入、违规收益与查处概率的影响。",
    players: [
      {
        name: "监管方",
        role: "监管者",
        strategies: [
          { name: "严格检查", description: "维持高强度合规检查" },
          { name: "抽样检查", description: "采用风险抽样方式" },
        ],
      },
      {
        name: "业务方",
        role: "被监管者",
        strategies: [
          { name: "合规执行", description: "按要求投入合规成本" },
          { name: "规避执行", description: "承担风险以节省成本" },
        ],
      },
    ],
  },
]

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

function createPlayersAndStrategies(definition: TemplateDefinition) {
  const players: Player[] = definition.players.map((item) => ({
    id: makeId("player"),
    name: item.name,
    role: item.role,
    reservationPayoff: 0,
    participationConstraintEnabled: false,
  }))
  const strategies: Strategy[] = definition.players.flatMap((item, playerIndex) =>
    item.strategies.map((strategy) => ({
      id: makeId("strategy"),
      playerId: players[playerIndex].id,
      name: strategy.name,
      description: strategy.description,
    }))
  )
  return { players, strategies }
}

export function createCaseFromTemplate(type: CaseType = "cooperation"): GameCase {
  const definition =
    TEMPLATE_DEFINITIONS.find((template) => template.type === type) ??
    TEMPLATE_DEFINITIONS[2]
  const { players, strategies } = createPlayersAndStrategies(definition)
  const now = new Date().toISOString()
  const scenarioId = makeId("scenario")
  const game: GameCase = {
    id: makeId("case"),
    title: `${definition.title}（未命名）`,
    description: definition.description,
    type: definition.type,
    status: "draft",
    payoffMode: "utility",
    sameComparableScale: false,
    staticApproximationConfirmed: false,
    focusPlayerId: players[0].id,
    currentScenarioId: scenarioId,
    createdAt: now,
    updatedAt: now,
    version: 1,
    isSample: false,
    players,
    strategies,
    suitability: {
      interactionIsStrategic: null,
      participantsAreIdentifiable: null,
      strategiesAreEnumerable: null,
      payoffsAreComparable: null,
      rulesAreStable: null,
    },
    scenarios: [
      createBlankScenario(
        {
          players,
          strategies,
        },
        {
          id: scenarioId,
          name: "基准场景",
          type: "baseline",
          description: "当前最可能发生的条件",
        }
      ),
    ],
    versions: [],
  }
  return game
}

export function createBlankScenario(
  game: Pick<GameCase, "players" | "strategies">,
  details: Pick<Scenario, "id" | "name" | "type" | "description">
): Scenario {
  const payoffs = Object.fromEntries(
    generateStrategyIdCombinations(game).map((strategyIds) => [
      profileKey(strategyIds),
      {
        utilities: Object.fromEntries(game.players.map((player) => [player.id, null])),
        confidence: "medium" as ConfidenceLevel,
        evidence: "",
        note: "",
      } satisfies PayoffCell,
    ])
  )
  return {
    ...details,
    probability: null,
    payoffs,
  }
}

function createSampleScenario(
  game: Pick<GameCase, "players" | "strategies">,
  details: Pick<Scenario, "id" | "name" | "type" | "description">,
  matrix: number[][][]
): Scenario {
  const [rowPlayer, columnPlayer] = game.players
  const rowStrategies = game.strategies.filter(
    (strategy) => strategy.playerId === rowPlayer.id
  )
  const columnStrategies = game.strategies.filter(
    (strategy) => strategy.playerId === columnPlayer.id
  )
  const payoffs: Record<string, PayoffCell> = {}
  for (const [rowIndex, rowStrategy] of rowStrategies.entries()) {
    for (const [columnIndex, columnStrategy] of columnStrategies.entries()) {
      const [rowPayoff, columnPayoff] = matrix[rowIndex][columnIndex]
      payoffs[profileKey([rowStrategy.id, columnStrategy.id])] = {
        utilities: {
          [rowPlayer.id]: rowPayoff,
          [columnPlayer.id]: columnPayoff,
        },
        confidence: "medium",
        evidence: "示例数据，仅用于演示功能",
        note: "",
      }
    }
  }
  return { ...details, probability: null, payoffs }
}

export function createSampleCase(): GameCase {
  const game = createCaseFromTemplate("cooperation")
  const baselineId = makeId("scenario")
  const conservativeId = makeId("scenario")
  const optimisticId = makeId("scenario")
  game.id = "sample-cooperation"
  game.title = "渠道联合推广决策（示例）"
  game.description =
    "评估两家渠道伙伴在联合推广中的投入选择及合作稳定性。全部数值为演示数据。"
  game.status = "analyzed"
  game.isSample = true
  game.staticApproximationConfirmed = true
  game.sameComparableScale = true
  game.suitability = {
    interactionIsStrategic: true,
    participantsAreIdentifiable: true,
    strategiesAreEnumerable: true,
    payoffsAreComparable: true,
    rulesAreStable: true,
  }
  game.currentScenarioId = baselineId
  game.scenarios = [
    createSampleScenario(
      game,
      {
        id: baselineId,
        name: "基准场景",
        type: "baseline",
        description: "双方按当前预期评估合作收益",
      },
      [
        [
          [8, 8],
          [2, 10],
        ],
        [
          [10, 2],
          [4, 4],
        ],
      ]
    ),
    createSampleScenario(
      game,
      {
        id: conservativeId,
        name: "保守场景",
        type: "conservative",
        description: "联合投入的转化效果低于预期",
      },
      [
        [
          [5, 5],
          [1, 8],
        ],
        [
          [8, 1],
          [4, 4],
        ],
      ]
    ),
    createSampleScenario(
      game,
      {
        id: optimisticId,
        name: "乐观场景",
        type: "optimistic",
        description: "联合投入形成明显协同效应",
      },
      [
        [
          [12, 12],
          [3, 10],
        ],
        [
          [10, 3],
          [4, 4],
        ],
      ]
    ),
  ]
  return game
}

