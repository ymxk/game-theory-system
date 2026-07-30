"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconDownload,
  IconEdit,
  IconPlus,
  IconUpload,
} from "@tabler/icons-react"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  type ColumnDef,
  useReactTable,
} from "@tanstack/react-table"
import { toast } from "sonner"

import {
  generateStrategyIdCombinations,
  profileKey,
  validateGame,
} from "@/entities/game/solver"
import type {
  ConfidenceLevel,
  GameCase,
  PayoffCell,
  Scenario,
  StrategyProfile,
} from "@/entities/game/types"
import { useActiveCase } from "@/hooks/use-active-case"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  exportPayoffCsv,
  importPayoffCsv,
} from "@/services/export/game-export"
import { useGameStore } from "@/stores/use-game-store"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { AreaChartCard } from "./area-chart-card"
import { DashboardPage, PageSection } from "./dashboard-page"
import { MetricCards } from "./metric-cards"

type PayoffRow = StrategyProfile & { cell: PayoffCell }

export function PayoffEditor() {
  const game = useActiveCase()
  if (!game) return null
  return <PayoffEditorForm key={`${game.id}-${game.updatedAt}`} game={game} />
}

function PayoffEditorForm({ game }: { game: GameCase }) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const updateCase = useGameStore((state) => state.updateCase)
  const [draft, setDraft] = React.useState<GameCase>(() => structuredClone(game))
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null)
  const [scenarioOpen, setScenarioOpen] = React.useState(false)
  const [scenarioName, setScenarioName] = React.useState("自定义场景")
  const fileInput = React.useRef<HTMLInputElement>(null)

  const scenario = draft?.scenarios.find(
    (item) => item.id === draft.currentScenarioId
  )

  const rows = React.useMemo<PayoffRow[]>(() => {
    if (!draft || !scenario) return []
    return generateStrategyIdCombinations(draft).map((strategyIds) => {
      const key = profileKey(strategyIds)
      return {
        key,
        strategyIds,
        strategyNames: strategyIds.map(
          (id) =>
            draft.strategies.find((strategy) => strategy.id === id)?.name ?? id
        ),
        payoffs: draft.players.map(
          (player) => scenario.payoffs[key]?.utilities[player.id] ?? 0
        ),
        cell: scenario.payoffs[key],
      }
    })
  }, [draft, scenario])

  const updatePayoff = React.useCallback(
    (key: string, updater: (current: PayoffCell) => PayoffCell) => {
      setDraft((current) => ({
        ...current,
        scenarios: current.scenarios.map((item) =>
          item.id === current.currentScenarioId
            ? {
                ...item,
                payoffs: {
                  ...item.payoffs,
                  [key]: updater(item.payoffs[key]),
                },
              }
            : item
        ),
      }))
    },
    []
  )

  const columns = React.useMemo<ColumnDef<PayoffRow>[]>(() => {
    if (!draft) return []
    return [
      {
        id: "profile",
        header: "策略组合",
        cell: ({ row }) => (
          <button
            className="min-w-[180px] text-left font-medium hover:underline"
            onClick={() => setSelectedKey(row.original.key)}
          >
            {row.original.strategyNames.join(" / ")}
          </button>
        ),
      },
      ...draft.players.map(
        (player): ColumnDef<PayoffRow> => ({
          id: player.id,
          header: `${player.name}收益`,
          cell: ({ row }) => {
            const value = row.original.cell.utilities[player.id]
            return (
              <Input
                type="number"
                step="any"
                className="h-8 min-w-24"
                aria-label={`${row.original.strategyNames.join("/")} ${player.name}收益`}
                value={value ?? ""}
                onChange={(event) =>
                  updatePayoff(row.original.key, (cell) => ({
                    ...cell,
                    utilities: {
                      ...cell.utilities,
                      [player.id]:
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                    },
                  }))
                }
              />
            )
          },
        })
      ),
      {
        id: "confidence",
        header: "置信度",
        cell: ({ row }) => (
          <Select
            value={row.original.cell.confidence}
            onValueChange={(confidence) =>
              updatePayoff(row.original.key, (cell) => ({
                ...cell,
                confidence: confidence as ConfidenceLevel,
              }))
            }
          >
            <SelectTrigger className="h-8 w-[96px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">高</SelectItem>
              <SelectItem value="medium">中</SelectItem>
              <SelectItem value="low">低</SelectItem>
            </SelectContent>
          </Select>
        ),
      },
      {
        id: "detail",
        header: () => <span className="sr-only">详情</span>,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setSelectedKey(row.original.key)}
          >
            <IconEdit />
            <span className="sr-only">编辑依据与备注</span>
          </Button>
        ),
      },
    ]
  }, [draft, updatePayoff])

  // TanStack Table exposes imperative helpers; React Compiler intentionally skips this hook.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25, pageIndex: 0 } },
  })

  if (!scenario) return null

  const totalValues = rows.length * draft.players.length
  const completedValues = rows.reduce(
    (total, row) =>
      total +
      draft.players.filter(
        (player) =>
          row.cell.utilities[player.id] !== null &&
          row.cell.utilities[player.id] !== undefined
      ).length,
    0
  )
  const completion = totalValues
    ? Math.round((completedValues / totalValues) * 100)
    : 0
  const confidenceData = ["high", "medium", "low"].map((confidence) => ({
    confidence:
      confidence === "high" ? "高置信" : confidence === "medium" ? "中置信" : "低置信",
    combinations: rows.filter((row) => row.cell.confidence === confidence).length,
  }))
  const selectedRow = rows.find((row) => row.key === selectedKey)

  async function save() {
    await updateCase(
      draft.id,
      () => ({
        ...draft,
        status: completion === 100 ? "modeled" : draft.status,
      }),
      { snapshotSummary: `更新${scenario!.name}收益矩阵` }
    )
    toast.success("收益矩阵已保存")
  }

  function addScenario() {
    const id = crypto.randomUUID()
    const clone: Scenario = {
      ...structuredClone(scenario!),
      id,
      name: scenarioName.trim() || "自定义场景",
      type: "custom",
      description: `基于${scenario!.name}复制，可独立调整收益假设`,
    }
    setDraft({
      ...draft,
      currentScenarioId: id,
      scenarios: [...draft.scenarios, clone],
    })
    setScenarioOpen(false)
    toast.success("已创建场景副本")
  }

  return (
    <DashboardPage>
      <MetricCards
        items={[
          {
            label: "当前场景",
            value: scenario.name,
            detail: scenario.description || "未填写场景说明",
            badge: "可切换",
          },
          {
            label: "策略组合",
            value: rows.length,
            detail: "需要为每个组合录入各方收益",
            badge:
              draft.payoffMode === "utility"
                ? "效用值"
                : rows.length <= 625
                  ? "金额"
                  : "超限",
          },
          {
            label: "录入完成度",
            value: `${completion}%`,
            detail: `${completedValues} / ${totalValues} 个收益值`,
            badge: completion === 100 ? "完整" : "待补充",
          },
          {
            label: "场景数量",
            value: draft.scenarios.length,
            detail: "基准、保守、乐观或自定义场景",
            badge: "独立收益表",
          },
        ]}
      />

      <PageSection>
        <AreaChartCard
          title="收益置信度分布"
          description="按当前场景的策略组合统计"
          data={confidenceData}
          xKey="confidence"
          series={[
            {
              key: "combinations",
              label: "策略组合",
              color: "var(--chart-1)",
            },
          ]}
          action={
            <Select
              value={draft.currentScenarioId}
              onValueChange={(currentScenarioId) =>
                setDraft({ ...draft, currentScenarioId })
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {draft.scenarios.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      </PageSection>

      <PageSection>
        <Card>
          <CardHeader className="border-b">
            <div>
              <CardTitle>收益矩阵</CardTitle>
              <CardDescription>
                点击组合名称补充依据和备注；空值会阻止正式分析。
              </CardDescription>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setScenarioOpen(true)}>
                <IconPlus />
                复制为新场景
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportPayoffCsv(draft)}>
                <IconDownload />
                导出 CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInput.current?.click()}
              >
                <IconUpload />
                导入 CSV
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  try {
                    const imported = await importPayoffCsv(draft, file)
                    setDraft(imported)
                    toast.success("CSV 收益已导入，请核对后保存")
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "CSV 导入失败"
                    )
                  } finally {
                    event.target.value = ""
                  }
                }}
              />
              <Button size="sm" onClick={save}>
                保存收益
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-muted-foreground">
                第 {table.getState().pagination.pageIndex + 1} /{" "}
                {Math.max(table.getPageCount(), 1)} 页，共 {rows.length} 个组合
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                >
                  下一页
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    await save()
                    const errors = validateGame(draft, scenario)
                    if (errors.length) {
                      toast.warning(`仍有 ${errors.length} 项数据问题`)
                    }
                    router.push("/results")
                  }}
                >
                  运行分析
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      <Dialog open={scenarioOpen} onOpenChange={setScenarioOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>复制当前场景</DialogTitle>
            <DialogDescription>
              新场景将继承当前全部收益，之后可独立调整。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="scenario-name">场景名称</Label>
            <Input
              id="scenario-name"
              value={scenarioName}
              onChange={(event) => setScenarioName(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={addScenario}>创建场景</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Drawer
        direction={isMobile ? "bottom" : "right"}
        open={Boolean(selectedRow)}
        onOpenChange={(open) => !open && setSelectedKey(null)}
      >
        <DrawerContent className="sm:max-w-lg">
          <div className="mx-auto w-full max-w-2xl">
            <DrawerHeader>
              <DrawerTitle>{selectedRow?.strategyNames.join(" / ")}</DrawerTitle>
              <DrawerDescription>
                补充收益估计依据、置信度与特殊说明。
              </DrawerDescription>
            </DrawerHeader>
            {selectedRow && (
              <div className="grid gap-5 px-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {draft.players.map((player) => (
                    <div key={player.id} className="grid gap-2">
                      <Label htmlFor={`drawer-${player.id}`}>
                        {player.name}收益
                      </Label>
                      <Input
                        id={`drawer-${player.id}`}
                        type="number"
                        value={selectedRow.cell.utilities[player.id] ?? ""}
                        onChange={(event) =>
                          updatePayoff(selectedRow.key, (cell) => ({
                            ...cell,
                            utilities: {
                              ...cell.utilities,
                              [player.id]:
                                event.target.value === ""
                                  ? null
                                  : Number(event.target.value),
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="evidence">估计依据</Label>
                  <Textarea
                    id="evidence"
                    value={selectedRow.cell.evidence}
                    onChange={(event) =>
                      updatePayoff(selectedRow.key, (cell) => ({
                        ...cell,
                        evidence: event.target.value,
                      }))
                    }
                    placeholder="合同条款、历史经验、业务访谈或明确假设"
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="payoff-note">备注</Label>
                  <Textarea
                    id="payoff-note"
                    value={selectedRow.cell.note}
                    onChange={(event) =>
                      updatePayoff(selectedRow.key, (cell) => ({
                        ...cell,
                        note: event.target.value,
                      }))
                    }
                    rows={2}
                  />
                </div>
              </div>
            )}
            <DrawerFooter className="sm:flex-row sm:justify-end">
              <DrawerClose asChild>
                <Button variant="outline">完成</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </DashboardPage>
  )
}
