import { backupSchema, gameCaseSchema } from "@/entities/game/schema"
import {
  analyzeGame,
  generateStrategyIdCombinations,
  profileKey,
  profileLabel,
} from "@/entities/game/solver"
import type { ConfidenceLevel, GameCase } from "@/entities/game/types"

function downloadFile(filename: string, type: string, content: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportBackup(cases: GameCase[]) {
  const content = JSON.stringify(
    {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      cases,
    },
    null,
    2
  )
  downloadFile(
    `博弈决策台备份-${new Date().toISOString().slice(0, 10)}.json`,
    "application/json",
    content
  )
}

export async function parseBackup(file: File) {
  const value: unknown = JSON.parse(await file.text())
  return backupSchema.parse(value).cases as GameCase[]
}

function escapeCsv(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export function exportPayoffCsv(game: GameCase) {
  const scenario =
    game.scenarios.find((item) => item.id === game.currentScenarioId) ??
    game.scenarios[0]
  const rows = [
    [
      ...game.players.map((player) => `${player.name}策略`),
      ...game.players.map((player) => `${player.name}收益`),
      "置信度",
      "依据",
      "备注",
    ],
    ...generateStrategyIdCombinations(game).map((strategyIds) => {
      const cell = scenario.payoffs[profileKey(strategyIds)]
      return [
        ...strategyIds.map(
          (id) => game.strategies.find((strategy) => strategy.id === id)?.name ?? id
        ),
        ...game.players.map((player) => cell?.utilities[player.id] ?? null),
        cell?.confidence ?? "medium",
        cell?.evidence ?? "",
        cell?.note ?? "",
      ]
    }),
  ]
  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n")
  downloadFile(`${game.title}-${scenario.name}-收益表.csv`, "text/csv;charset=utf-8", `\ufeff${csv}`)
}

function parseCsvLine(line: string) {
  const values: string[] = []
  let current = ""
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (char === "," && !quoted) {
      values.push(current)
      current = ""
    } else {
      current += char
    }
  }
  values.push(current)
  return values
}

export async function importPayoffCsv(game: GameCase, file: File) {
  const text = (await file.text()).replace(/^\ufeff/, "")
  const rows = text.split(/\r?\n/).filter(Boolean).map(parseCsvLine)
  const expectedColumns = game.players.length * 2 + 3
  if (rows.length < 2 || rows[0].length !== expectedColumns) {
    throw new Error(`CSV 应包含 ${expectedColumns} 列，并至少有一行收益数据。`)
  }
  const strategyMaps = game.players.map((player) =>
    new Map(
      game.strategies
        .filter((strategy) => strategy.playerId === player.id)
        .map((strategy) => [strategy.name, strategy.id])
    )
  )
  const scenario =
    game.scenarios.find((item) => item.id === game.currentScenarioId) ??
    game.scenarios[0]
  const payoffs = { ...scenario.payoffs }
  for (const [rowIndex, row] of rows.slice(1).entries()) {
    const strategyIds = row
      .slice(0, game.players.length)
      .map((name, playerIndex) => strategyMaps[playerIndex].get(name))
    if (strategyIds.some((id) => !id)) {
      throw new Error(`第 ${rowIndex + 2} 行包含未知策略名称。`)
    }
    const utilities = Object.fromEntries(
      game.players.map((player, playerIndex) => {
        const raw = row[game.players.length + playerIndex]
        const value = Number(raw)
        if (!Number.isFinite(value)) {
          throw new Error(`第 ${rowIndex + 2} 行的收益不是有效数字。`)
        }
        return [player.id, value]
      })
    )
    payoffs[profileKey(strategyIds as string[])] = {
      utilities,
      confidence: (
        row[game.players.length * 2] === "high" ||
        row[game.players.length * 2] === "low"
          ? row[game.players.length * 2]
          : "medium"
      ) as ConfidenceLevel,
      evidence: row[game.players.length * 2 + 1] ?? "",
      note: row[game.players.length * 2 + 2] ?? "",
    }
  }
  return gameCaseSchema.parse({
    ...game,
    updatedAt: new Date().toISOString(),
    scenarios: game.scenarios.map((item) =>
      item.id === scenario.id ? { ...item, payoffs } : item
    ),
  }) as GameCase
}

export function createMarkdownReport(game: GameCase) {
  const scenario =
    game.scenarios.find((item) => item.id === game.currentScenarioId) ??
    game.scenarios[0]
  const result = analyzeGame(game, scenario.id)
  const lines = [
    `# ${game.title}`,
    "",
    `> 本报告由博弈决策台基于用户录入数据生成。结果取决于输入假设，不构成自动决策。`,
    "",
    "## 决策摘要",
    "",
    `- 分析场景：${scenario.name}`,
    `- 参与方：${game.players.map((player) => player.name).join("、")}`,
    `- 策略组合：${result.profiles.length} 个`,
    `- 纯策略纳什均衡：${result.pureEquilibria.length} 个`,
    "",
    "## 模型边界",
    "",
    `- 静态近似：${game.staticApproximationConfirmed ? "已确认" : "未确认"}`,
    `- 收益可比尺度：${game.sameComparableScale ? "已确认" : "未确认"}`,
    `- 收益口径：${game.payoffMode === "utility" ? "效用值" : "金额"}`,
    "",
    "## 均衡结果",
    "",
    ...(result.pureEquilibria.length
      ? result.pureEquilibria.map(
          (item, index) =>
            `${index + 1}. **${item.profile.strategyNames.join(" / ")}**（${
              item.strength === "strict" ? "严格均衡" : "弱均衡"
            }，偏离裕度 ${item.margin.toFixed(2)}）`
        )
      : ["未发现纯策略纳什均衡。"]),
    "",
    "## 组合明细",
    "",
    "| 策略组合 | 收益 | 帕累托有效 |",
    "| --- | --- | --- |",
    ...result.profiles.map(
      (profile) =>
        `| ${profileLabel(game, profile.strategyIds)} | ${profile.payoffs.join(
          " / "
        )} | ${
          result.paretoEfficientProfileKeys.includes(profile.key) ? "是" : "否"
        } |`
    ),
    "",
    "## 风险与限制",
    "",
    ...(result.warnings.length
      ? result.warnings.map((warning) => `- ${warning}`)
      : ["- 当前未发现输入完整性警告。"]),
    "",
    `生成时间：${new Date(result.generatedAt).toLocaleString("zh-CN")}`,
  ]
  return lines.join("\n")
}

export function exportMarkdownReport(game: GameCase) {
  downloadFile(`${game.title}-分析报告.md`, "text/markdown;charset=utf-8", createMarkdownReport(game))
}
