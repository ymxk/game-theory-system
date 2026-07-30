"use client"

import {
  IconAlertTriangle,
  IconDownload,
  IconPrinter,
  IconReportAnalytics,
  IconShieldCheck,
} from "@tabler/icons-react"

import {
  analyzeGame,
  compareScenarios,
  getRobustEquilibriumKeys,
  profileLabel,
} from "@/entities/game/solver"
import { useActiveCase } from "@/hooks/use-active-case"
import { formatDate, formatNumber } from "@/lib/format"
import { exportMarkdownReport } from "@/services/export/game-export"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DashboardPage, PageSection } from "./dashboard-page"
import { MetricCards } from "./metric-cards"

export function ReportPreview() {
  const game = useActiveCase()
  if (!game) return null
  const result = analyzeGame(game)
  const comparisons = compareScenarios(game)
  const robustKeys = getRobustEquilibriumKeys(comparisons)
  const scenario =
    game.scenarios.find((item) => item.id === game.currentScenarioId) ??
    game.scenarios[0]

  return (
    <DashboardPage>
      <MetricCards
        items={[
          {
            label: "报告版本",
            value: `V${game.version}`,
            detail: `最近更新 ${formatDate(game.updatedAt)}`,
            badge: "本地版本",
          },
          {
            label: "当前场景",
            value: scenario.name,
            detail: "报告正文以当前场景为主",
            badge: `${game.scenarios.length} 个场景`,
          },
          {
            label: "均衡结论",
            value: result.pureEquilibria.length,
            detail: "当前场景纯策略纳什均衡",
            badge: robustKeys.length ? `${robustKeys.length} 个稳健` : "无稳健均衡",
          },
          {
            label: "边界警告",
            value: result.warnings.length,
            detail: "输入完整性和模型假设提醒",
            badge: result.warnings.length ? "需披露" : "无",
          },
        ]}
      />

      <PageSection>
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">报告预览</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              可导出 Markdown 继续编辑，或使用浏览器打印为 PDF。
            </p>
          </div>
          <div className="flex gap-2" data-print-hidden>
            <Button variant="outline" onClick={() => window.print()}>
              <IconPrinter />
              打印 / PDF
            </Button>
            <Button onClick={() => exportMarkdownReport(game)}>
              <IconDownload />
              导出 Markdown
            </Button>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <article className="mx-auto max-w-5xl rounded-xl border bg-card shadow-sm">
          <header className="border-b px-6 py-8 sm:px-10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IconReportAnalytics className="size-4" />
              博弈决策分析报告
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">{game.title}</h1>
            <p className="mt-3 max-w-3xl text-muted-foreground">{game.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge variant="secondary">{scenario.name}</Badge>
              <Badge variant="outline">{game.players.length} 个参与方</Badge>
              <Badge variant="outline">{result.profiles.length} 个策略组合</Badge>
              <Badge variant="outline">版本 V{game.version}</Badge>
            </div>
          </header>

          <div className="grid gap-10 px-6 py-8 sm:px-10">
            <section>
              <h2 className="text-xl font-semibold">一、决策摘要</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">当前均衡</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {result.pureEquilibria.length}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">跨场景稳健均衡</p>
                  <p className="mt-2 text-2xl font-semibold">{robustKeys.length}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">帕累托有效组合</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {result.paretoEfficientProfileKeys.length}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                本报告仅描述用户录入收益假设下的结构性结果。纳什均衡表示没有参与方愿意单独偏离，
                不等于该结果公平、合规、可执行或对关注方最优。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">二、参与方与策略</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {game.players.map((player) => (
                  <div key={player.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium">{player.name}</h3>
                        <p className="text-sm text-muted-foreground">{player.role}</p>
                      </div>
                      {player.id === game.focusPlayerId && (
                        <Badge variant="secondary">关注方</Badge>
                      )}
                    </div>
                    <ul className="mt-4 space-y-2 text-sm">
                      {game.strategies
                        .filter((strategy) => strategy.playerId === player.id)
                        .map((strategy) => (
                          <li key={strategy.id}>
                            <span className="font-medium">{strategy.name}</span>
                            {strategy.description && (
                              <span className="text-muted-foreground">
                                {" "}
                                — {strategy.description}
                              </span>
                            )}
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold">三、均衡结果</h2>
              <div className="mt-4 overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>策略组合</TableHead>
                      <TableHead>各方收益</TableHead>
                      <TableHead>均衡类型</TableHead>
                      <TableHead>偏离裕度</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.pureEquilibria.length ? (
                      result.pureEquilibria.map((equilibrium) => (
                        <TableRow key={equilibrium.profile.key}>
                          <TableCell className="font-medium">
                            {equilibrium.profile.strategyNames.join(" / ")}
                          </TableCell>
                          <TableCell>
                            {equilibrium.profile.payoffs.join(" / ")}
                          </TableCell>
                          <TableCell>
                            {equilibrium.strength === "strict" ? "严格" : "弱"}
                          </TableCell>
                          <TableCell>{formatNumber(equilibrium.margin)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          当前未发现纯策略均衡。
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {result.mixedEquilibrium && (
                <Alert className="mt-4">
                  <IconShieldCheck />
                  <AlertTitle>存在非退化 2×2 混合策略均衡</AlertTitle>
                  <AlertDescription>
                    具体概率与期望收益请在“分析结果”页面查看。
                  </AlertDescription>
                </Alert>
              )}
            </section>

            <section>
              <h2 className="text-xl font-semibold">四、场景稳健性</h2>
              <div className="mt-4 grid gap-4">
                {robustKeys.length ? (
                  robustKeys.map((key) => (
                    <div key={key} className="flex items-center gap-3 rounded-lg border p-4">
                      <IconShieldCheck className="size-5 text-emerald-600" />
                      <div>
                        <p className="font-medium">
                          {profileLabel(game, key.split("::"))}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          在全部 {comparisons.length} 个场景中均为纳什均衡。
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <Alert>
                    <IconAlertTriangle />
                    <AlertTitle>没有跨全部场景成立的纯策略均衡</AlertTitle>
                    <AlertDescription>
                      决策建议需要显式绑定场景条件，并优先补强低置信度收益依据。
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold">五、模型边界与风险</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
                <li>
                  静态近似：
                  {game.staticApproximationConfirmed
                    ? "用户已确认将决策过程近似为一次同时选择。"
                    : "尚未确认，结果只能用于结构检查。"}
                </li>
                <li>
                  收益尺度：
                  {game.sameComparableScale
                    ? "用户已确认各方收益处于同一可比尺度，可展示总收益。"
                    : "未确认跨参与方可比，报告不汇总总收益。"}
                </li>
                <li>收益值、依据和置信度均由用户录入，系统不自动估计现实结果。</li>
                <li>均衡分析不替代法律、合规、财务与交付可行性审查。</li>
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </section>
          </div>

          <footer className="border-t px-6 py-5 text-xs text-muted-foreground sm:px-10">
            生成时间：{new Date(result.generatedAt).toLocaleString("zh-CN")} ·
            数据仅保存在当前浏览器本地
          </footer>
        </article>
      </PageSection>
    </DashboardPage>
  )
}
