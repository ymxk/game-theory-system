"use client"

import * as React from "react"
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconCircleCheck,
  IconMathFunction,
  IconScale,
  IconTargetArrow,
} from "@tabler/icons-react"

import { analyzeGame, profileLabel } from "@/entities/game/solver"
import type { PureEquilibrium, StrategyProfile } from "@/entities/game/types"
import { useActiveCase } from "@/hooks/use-active-case"
import { useIsMobile } from "@/hooks/use-mobile"
import { formatNumber } from "@/lib/format"
import { useGameStore } from "@/stores/use-game-store"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AreaChartCard } from "./area-chart-card"
import { DashboardPage, PageSection } from "./dashboard-page"
import { MetricCards } from "./metric-cards"

export function AnalysisResults() {
  const game = useActiveCase()
  const isMobile = useIsMobile()
  const updateCase = useGameStore((state) => state.updateCase)
  const [selectedEquilibrium, setSelectedEquilibrium] =
    React.useState<PureEquilibrium | null>(null)
  const [selectedProfile, setSelectedProfile] =
    React.useState<StrategyProfile | null>(null)

  const result = React.useMemo(() => (game ? analyzeGame(game) : null), [game])

  React.useEffect(() => {
    if (game && result && result.warnings.length === 0 && game.status !== "analyzed") {
      void updateCase(game.id, (current) => ({ ...current, status: "analyzed" }))
    }
  }, [game, result, updateCase])

  if (!game || !result) return null

  const scenario =
    game.scenarios.find((item) => item.id === result.scenarioId) ??
    game.scenarios[0]
  const strictCount = result.pureEquilibria.filter(
    (item) => item.strength === "strict"
  ).length
  const participationFailures = result.pureEquilibria.filter(
    (item) => !item.participationSatisfied
  ).length
  const chartData = result.profiles.slice(0, 14).map((profile, index) => ({
    profile: `${index + 1}`,
    ...Object.fromEntries(
      game.players.map((player, playerIndex) => [
        player.id,
        profile.payoffs[playerIndex],
      ])
    ),
  }))

  return (
    <DashboardPage>
      <MetricCards
        items={[
          {
            label: "纯策略均衡",
            value: result.pureEquilibria.length,
            detail: `严格 ${strictCount} 个，弱均衡 ${result.pureEquilibria.length - strictCount} 个`,
            badge: result.pureEquilibria.length ? "已识别" : "未发现",
            icon: IconTargetArrow,
          },
          {
            label: "帕累托有效组合",
            value: result.paretoEfficientProfileKeys.length,
            detail: `共分析 ${result.profiles.length} 个策略组合`,
            badge: "逐项比较",
            icon: IconScale,
          },
          {
            label: "支配关系",
            value: result.dominance.length,
            detail: "严格或弱支配的成对策略",
            badge: "按参与方",
          },
          {
            label: "参与约束未满足",
            value: participationFailures,
            detail: "仅统计启用了保留收益的参与方",
            badge: participationFailures ? "需关注" : "通过",
            icon: participationFailures ? IconAlertTriangle : IconCheck,
          },
        ]}
      />

      <PageSection>
        <AreaChartCard
          title="策略组合收益分布"
          description={`当前为${scenario.name}；横轴编号对应下方组合明细`}
          data={chartData}
          xKey="profile"
          series={game.players.map((player, index) => ({
            key: player.id,
            label: player.name,
            color: `var(--chart-${(index % 5) + 1})`,
          }))}
          action={<Badge variant="outline">前 {chartData.length} 个组合</Badge>}
        />
      </PageSection>

      {result.warnings.length > 0 && (
        <PageSection>
          <Alert variant="destructive">
            <IconAlertTriangle />
            <AlertTitle>分析包含输入或边界警告</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {result.warnings.slice(0, 5).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
                {result.warnings.length > 5 && (
                  <li>另有 {result.warnings.length - 5} 项，请返回收益录入检查。</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        </PageSection>
      )}

      <PageSection>
        <Tabs defaultValue="equilibria">
          <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList>
              <TabsTrigger value="equilibria">均衡结果</TabsTrigger>
              <TabsTrigger value="profiles">全部组合</TabsTrigger>
              <TabsTrigger value="responses">最佳响应</TabsTrigger>
              <TabsTrigger value="dominance">支配策略</TabsTrigger>
            </TabsList>
            <Badge variant="secondary">生成于 {new Date(result.generatedAt).toLocaleTimeString("zh-CN")}</Badge>
          </div>

          <TabsContent value="equilibria">
            <Card>
              <CardHeader>
                <CardTitle>纳什均衡</CardTitle>
                <CardDescription>
                  均衡中任何参与方单独改变策略都不能提高自身收益。
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>策略组合</TableHead>
                      <TableHead>收益</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>偏离裕度</TableHead>
                      <TableHead>参与约束</TableHead>
                      <TableHead className="text-right">详情</TableHead>
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
                            {equilibrium.profile.payoffs
                              .map((value) => formatNumber(value))
                              .join(" / ")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                equilibrium.strength === "strict"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {equilibrium.strength === "strict"
                                ? "严格均衡"
                                : "弱均衡"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatNumber(equilibrium.margin)}</TableCell>
                          <TableCell>
                            {equilibrium.participationSatisfied ? "满足" : "未满足"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedEquilibrium(equilibrium)}
                            >
                              偏离证据
                              <IconArrowRight />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-28 text-center">
                          未发现纯策略均衡。若为 2×2 效用模型，请查看混合策略结果。
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {result.mixedEquilibrium && (
                  <div className="border-t p-6">
                    <div className="flex items-center gap-2">
                      <IconMathFunction className="size-5" />
                      <h3 className="font-semibold">2×2 混合策略均衡</h3>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {game.players.map((player, playerIndex) => {
                        const probabilities =
                          playerIndex === 0
                            ? result.mixedEquilibrium!.rowStrategyProbabilities
                            : result.mixedEquilibrium!.columnStrategyProbabilities
                        return (
                          <div key={player.id} className="rounded-lg border p-4">
                            <p className="font-medium">{player.name}</p>
                            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                              {Object.entries(probabilities).map(
                                ([strategyId, probability]) => (
                                  <li key={strategyId}>
                                    {
                                      game.strategies.find(
                                        (strategy) => strategy.id === strategyId
                                      )?.name
                                    }
                                    ：{(probability * 100).toFixed(1)}%
                                  </li>
                                )
                              )}
                              <li>
                                期望收益：
                                {formatNumber(
                                  result.mixedEquilibrium!.expectedPayoffs[player.id]
                                )}
                              </li>
                            </ul>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profiles">
            <Card>
              <CardHeader>
                <CardTitle>全部策略组合</CardTitle>
                <CardDescription>
                  帕累托有效只表示没有其他组合能让所有参与方不差且至少一方更好。
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>策略组合</TableHead>
                      <TableHead>各方收益</TableHead>
                      {game.sameComparableScale && <TableHead>总收益</TableHead>}
                      <TableHead>帕累托有效</TableHead>
                      <TableHead className="text-right">说明</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.profiles.map((profile, index) => (
                      <TableRow key={profile.key}>
                        <TableCell className="text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {profile.strategyNames.join(" / ")}
                        </TableCell>
                        <TableCell>{profile.payoffs.join(" / ")}</TableCell>
                        {game.sameComparableScale && (
                          <TableCell>
                            {formatNumber(result.totalPayoffs?.[profile.key] ?? 0)}
                          </TableCell>
                        )}
                        <TableCell>
                          {result.paretoEfficientProfileKeys.includes(profile.key) ? (
                            <Badge variant="outline">
                              <IconCircleCheck />
                              是
                            </Badge>
                          ) : (
                            "否"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedProfile(profile)}
                          >
                            查看组合
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="responses">
            <Card>
              <CardHeader>
                <CardTitle>最佳响应</CardTitle>
                <CardDescription>
                  固定其他参与方策略时，各参与方可获得最高收益的策略。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {result.bestResponses.map((response, index) => (
                  <div
                    key={`${response.playerId}-${response.opponentStrategyIds.join("-")}-${index}`}
                    className="grid gap-2 rounded-lg border p-4 md:grid-cols-[180px_1fr_1fr_100px]"
                  >
                    <span className="font-medium">{response.playerName}</span>
                    <span className="text-sm text-muted-foreground">
                      对方组合：
                      {profileLabel(game, response.opponentStrategyIds)}
                    </span>
                    <span className="text-sm">
                      最佳：
                      {response.strategyIds
                        .map(
                          (id) =>
                            game.strategies.find((strategy) => strategy.id === id)
                              ?.name
                        )
                        .join("、")}
                    </span>
                    <span className="text-sm tabular-nums">
                      收益 {formatNumber(response.payoff)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dominance">
            <Card>
              <CardHeader>
                <CardTitle>策略支配关系</CardTitle>
                <CardDescription>
                  严格支配在所有对手组合下收益都更高；弱支配则不低且至少一次更高。
                </CardDescription>
              </CardHeader>
              <CardContent>
                {result.dominance.length ? (
                  <div className="grid gap-3">
                    {result.dominance.map((item) => (
                      <div
                        key={`${item.playerId}-${item.dominantStrategyId}-${item.dominatedStrategyId}`}
                        className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center"
                      >
                        <Badge variant="outline">{item.playerName}</Badge>
                        <span className="font-medium">{item.dominantStrategyName}</span>
                        <IconArrowRight className="size-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          支配 {item.dominatedStrategyName}
                        </span>
                        <Badge variant="secondary" className="sm:ml-auto">
                          {item.strength === "strict" ? "严格支配" : "弱支配"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    当前未识别出严格或弱支配策略。
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageSection>

      <Drawer
        direction={isMobile ? "bottom" : "right"}
        open={Boolean(selectedEquilibrium)}
        onOpenChange={(open) => !open && setSelectedEquilibrium(null)}
      >
        <DrawerContent className="sm:max-w-2xl">
          <div className="mx-auto w-full max-w-3xl">
            <DrawerHeader>
              <DrawerTitle>
                {selectedEquilibrium?.profile.strategyNames.join(" / ")}
              </DrawerTitle>
              <DrawerDescription>
                对每个参与方逐一检查单边偏离后的收益变化。
              </DrawerDescription>
            </DrawerHeader>
            <div className="max-h-[50vh] overflow-auto px-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>参与方</TableHead>
                    <TableHead>策略变化</TableHead>
                    <TableHead>收益变化</TableHead>
                    <TableHead>增益</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedEquilibrium?.deviations.map((deviation) => (
                    <TableRow
                      key={`${deviation.playerId}-${deviation.toStrategyId}`}
                    >
                      <TableCell>{deviation.playerName}</TableCell>
                      <TableCell>
                        {deviation.fromStrategyName} → {deviation.toStrategyName}
                      </TableCell>
                      <TableCell>
                        {formatNumber(deviation.currentPayoff)} →{" "}
                        {formatNumber(deviation.deviationPayoff)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={deviation.gain > 0 ? "destructive" : "outline"}
                        >
                          {deviation.gain > 0 ? "+" : ""}
                          {formatNumber(deviation.gain)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DrawerFooter className="sm:flex-row sm:justify-end">
              <DrawerClose asChild>
                <Button variant="outline">关闭</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        direction={isMobile ? "bottom" : "right"}
        open={Boolean(selectedProfile)}
        onOpenChange={(open) => !open && setSelectedProfile(null)}
      >
        <DrawerContent className="sm:max-w-lg">
          <div className="mx-auto w-full max-w-2xl">
            <DrawerHeader>
              <DrawerTitle>{selectedProfile?.strategyNames.join(" / ")}</DrawerTitle>
              <DrawerDescription>策略组合与各参与方收益详情</DrawerDescription>
            </DrawerHeader>
            <div className="grid gap-3 px-4 sm:grid-cols-2">
              {game.players.map((player, index) => (
                <div key={player.id} className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">{player.name}</p>
                  <p className="mt-1 text-lg font-semibold">
                    {selectedProfile?.strategyNames[index]}
                  </p>
                  <p className="mt-2 text-sm">
                    收益：{selectedProfile?.payoffs[index]}
                  </p>
                </div>
              ))}
            </div>
            <DrawerFooter className="sm:flex-row sm:justify-end">
              <DrawerClose asChild>
                <Button variant="outline">关闭</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </DashboardPage>
  )
}
