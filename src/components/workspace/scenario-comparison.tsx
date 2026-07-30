"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconAlertTriangle,
  IconCheck,
  IconCopy,
  IconEdit,
  IconScale,
  IconShieldCheck,
  IconTrash,
} from "@tabler/icons-react"
import { toast } from "sonner"

import {
  compareScenarios,
  getRobustEquilibriumKeys,
  profileLabel,
} from "@/entities/game/solver"
import {
  SCENARIO_TYPE_LABELS,
  type Scenario,
  type ScenarioComparison as ScenarioComparisonType,
  type ScenarioType,
} from "@/entities/game/types"
import { useActiveCase } from "@/hooks/use-active-case"
import { useIsMobile } from "@/hooks/use-mobile"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AreaChartCard } from "./area-chart-card"
import { DashboardPage, PageSection } from "./dashboard-page"
import { MetricCards } from "./metric-cards"

export function ScenarioComparison() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const game = useActiveCase()
  const updateCase = useGameStore((state) => state.updateCase)
  const [selected, setSelected] =
    React.useState<ScenarioComparisonType | null>(null)

  const comparisons = React.useMemo(
    () => (game ? compareScenarios(game) : []),
    [game]
  )
  const robustKeys = React.useMemo(
    () => getRobustEquilibriumKeys(comparisons),
    [comparisons]
  )

  if (!game) return null

  const allEquilibriumKeys = new Set(
    comparisons.flatMap((comparison) => comparison.equilibriumProfileKeys)
  )
  const conditionalKeys = [...allEquilibriumKeys].filter(
    (key) => !robustKeys.includes(key)
  )
  const chartData = comparisons.map((comparison) => ({
    scenario: comparison.scenarioName,
    equilibria: comparison.equilibriumProfileKeys.length,
    margin: comparison.strongestMargin ?? 0,
  }))

  async function duplicateScenario(source: Scenario, type: ScenarioType) {
    const id = crypto.randomUUID()
    const labels: Record<ScenarioType, string> = {
      baseline: "基准场景",
      conservative: "保守场景",
      optimistic: "乐观场景",
      custom: `${source.name}副本`,
    }
    await updateCase(
      game!.id,
      (current) => ({
        ...current,
        currentScenarioId: id,
        scenarios: [
          ...current.scenarios,
          {
            ...structuredClone(source),
            id,
            type,
            name: labels[type],
            description: `基于${source.name}复制，请在收益录入中调整假设`,
          },
        ],
      }),
      { snapshotSummary: `新增${labels[type]}` }
    )
    toast.success(`${labels[type]}已创建`)
  }

  async function deleteScenario(scenarioId: string) {
    if (game!.scenarios.length <= 1) return
    const next = game!.scenarios.filter((scenario) => scenario.id !== scenarioId)
    await updateCase(
      game!.id,
      (current) => ({
        ...current,
        currentScenarioId:
          current.currentScenarioId === scenarioId
            ? next[0].id
            : current.currentScenarioId,
        scenarios: next,
      }),
      { snapshotSummary: "删除场景" }
    )
    toast.success("场景已删除")
  }

  return (
    <DashboardPage>
      <MetricCards
        items={[
          {
            label: "场景数量",
            value: comparisons.length,
            detail: "每个场景拥有独立收益矩阵",
            badge: "可横向比较",
            icon: IconScale,
          },
          {
            label: "稳健均衡",
            value: robustKeys.length,
            detail: "在全部已建场景中都成立",
            badge: robustKeys.length ? "跨场景成立" : "未发现",
            icon: IconShieldCheck,
          },
          {
            label: "条件均衡",
            value: conditionalKeys.length,
            detail: "仅在部分场景假设下成立",
            badge: conditionalKeys.length ? "依赖假设" : "无",
            icon: IconAlertTriangle,
          },
          {
            label: "输入警告",
            value: comparisons.filter((item) => item.warnings.length > 0).length,
            detail: "存在缺失收益或模型边界提醒的场景",
            badge: comparisons.every((item) => item.warnings.length === 0)
              ? "全部完整"
              : "需检查",
          },
        ]}
      />

      <PageSection>
        <AreaChartCard
          title="场景均衡与偏离裕度"
          description="均衡数量用于识别多解，裕度用于判断稳定程度"
          data={chartData}
          xKey="scenario"
          series={[
            { key: "equilibria", label: "均衡数量", color: "var(--chart-1)" },
            { key: "margin", label: "最强偏离裕度", color: "var(--chart-2)" },
          ]}
          action={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <IconCopy />
                  新增场景
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(["conservative", "optimistic", "custom"] as const).map((type) => (
                  <DropdownMenuItem
                    key={type}
                    onSelect={() =>
                      duplicateScenario(
                        game.scenarios.find(
                          (scenario) => scenario.id === game.currentScenarioId
                        ) ?? game.scenarios[0],
                        type
                      )
                    }
                  >
                    {SCENARIO_TYPE_LABELS[type]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
      </PageSection>

      <PageSection className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <Card>
          <CardHeader>
            <CardTitle>场景比较明细</CardTitle>
            <CardDescription>
              结果相同不代表收益完全相同，点击详情查看每个场景的均衡。
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>场景</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>均衡数量</TableHead>
                  <TableHead>最强裕度</TableHead>
                  <TableHead>完整性</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisons.map((comparison) => {
                  const scenario = game.scenarios.find(
                    (item) => item.id === comparison.scenarioId
                  )!
                  return (
                    <TableRow key={comparison.scenarioId}>
                      <TableCell className="font-medium">
                        {comparison.scenarioName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {SCENARIO_TYPE_LABELS[comparison.scenarioType]}
                        </Badge>
                      </TableCell>
                      <TableCell>{comparison.equilibriumProfileKeys.length}</TableCell>
                      <TableCell>
                        {comparison.strongestMargin === null
                          ? "—"
                          : comparison.strongestMargin.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {comparison.warnings.length ? (
                          <Badge variant="destructive">有警告</Badge>
                        ) : (
                          <Badge variant="secondary">
                            <IconCheck />
                            完整
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              操作
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setSelected(comparison)}>
                              查看结果
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={async () => {
                                await updateCase(game.id, (current) => ({
                                  ...current,
                                  currentScenarioId: scenario.id,
                                }))
                                router.push("/payoffs")
                              }}
                            >
                              <IconEdit />
                              编辑收益
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => duplicateScenario(scenario, "custom")}
                            >
                              <IconCopy />
                              创建副本
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={game.scenarios.length <= 1}
                              onSelect={() => deleteScenario(scenario.id)}
                            >
                              <IconTrash />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>稳健性结论</CardTitle>
            <CardDescription>
              对结果按“跨场景成立”和“依赖特定假设”分类。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div>
              <div className="flex items-center gap-2">
                <IconShieldCheck className="size-5 text-emerald-600" />
                <h3 className="font-medium">稳健均衡</h3>
              </div>
              <div className="mt-3 grid gap-2">
                {robustKeys.length ? (
                  robustKeys.map((key) => (
                    <div key={key} className="rounded-lg border bg-muted/30 p-3 text-sm">
                      {profileLabel(game, key.split("::"))}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    暂无在所有场景中都成立的纯策略均衡。
                  </p>
                )}
              </div>
            </div>
            <div className="border-t pt-5">
              <div className="flex items-center gap-2">
                <IconAlertTriangle className="size-5 text-amber-600" />
                <h3 className="font-medium">条件均衡</h3>
              </div>
              <div className="mt-3 grid gap-2">
                {conditionalKeys.length ? (
                  conditionalKeys.map((key) => (
                    <div key={key} className="rounded-lg border bg-muted/30 p-3 text-sm">
                      {profileLabel(game, key.split("::"))}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    当前没有仅在部分场景成立的均衡。
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      {comparisons.length < 3 && (
        <PageSection>
          <Alert>
            <IconAlertTriangle />
            <AlertTitle>建议至少建立基准、保守和乐观三个场景</AlertTitle>
            <AlertDescription>
              当前可完成单场景分析，但不足以判断结论对关键假设变化是否稳健。
            </AlertDescription>
          </Alert>
        </PageSection>
      )}

      <Drawer
        direction={isMobile ? "bottom" : "right"}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DrawerContent className="sm:max-w-lg">
          <div className="mx-auto w-full max-w-2xl">
            <DrawerHeader>
              <DrawerTitle>{selected?.scenarioName}</DrawerTitle>
              <DrawerDescription>该场景下识别出的全部纯策略均衡</DrawerDescription>
            </DrawerHeader>
            <div className="grid gap-3 px-4">
              {selected?.equilibriumLabels.length ? (
                selected.equilibriumLabels.map((label, index) => (
                  <div key={label} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{label}</span>
                      <Badge variant="outline">均衡 {index + 1}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                  当前没有纯策略均衡，或收益数据尚不完整。
                </div>
              )}
              {selected?.warnings.map((warning) => (
                <Alert key={warning} variant="destructive">
                  <IconAlertTriangle />
                  <AlertDescription>{warning}</AlertDescription>
                </Alert>
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
