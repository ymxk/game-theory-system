"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconArrowUpRight,
  IconChartDots3,
  IconCopy,
  IconDotsVertical,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { toast } from "sonner"

import { CASE_STATUS_LABELS, CASE_TYPE_LABELS, type GameCase } from "@/entities/game/types"
import { formatDate } from "@/lib/format"
import { useIsMobile } from "@/hooks/use-mobile"
import { useGameStore } from "@/stores/use-game-store"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { AreaChartCard } from "./area-chart-card"
import { DashboardPage, PageSection } from "./dashboard-page"
import { MetricCards } from "./metric-cards"

const templates = [
  { value: "bidding", label: "投标竞价" },
  { value: "negotiation", label: "商务谈判" },
  { value: "cooperation", label: "合作分配" },
  { value: "supervision", label: "监督激励" },
  { value: "compliance", label: "合规博弈" },
] as const

export function CaseLibrary() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const cases = useGameStore((state) => state.cases)
  const setActiveCase = useGameStore((state) => state.setActiveCase)
  const createCase = useGameStore((state) => state.createCase)
  const duplicateCase = useGameStore((state) => state.duplicateCase)
  const deleteCase = useGameStore((state) => state.deleteCase)
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "updatedAt", desc: true },
  ])
  const [query, setQuery] = React.useState("")
  const [status, setStatus] = React.useState("all")
  const [template, setTemplate] =
    React.useState<(typeof templates)[number]["value"]>("cooperation")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<GameCase | null>(null)

  const openGame = React.useCallback(
    (game: GameCase, destination = "/model") => {
      setActiveCase(game.id)
      router.push(destination)
    },
    [router, setActiveCase]
  )

  const columns = React.useMemo<ColumnDef<GameCase>[]>(
    () => [
      {
        accessorKey: "title",
        header: "案例",
        cell: ({ row }) => (
          <button
            className="max-w-[320px] text-left"
            onClick={() => setSelected(row.original)}
          >
            <span className="block truncate font-medium">{row.original.title}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {row.original.description}
            </span>
          </button>
        ),
      },
      {
        accessorKey: "type",
        header: "类型",
        cell: ({ row }) => (
          <Badge variant="outline">{CASE_TYPE_LABELS[row.original.type]}</Badge>
        ),
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => (
          <Badge variant={row.original.status === "analyzed" ? "default" : "secondary"}>
            {CASE_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        id: "scale",
        header: "模型规模",
        cell: ({ row }) =>
          `${row.original.players.length} 方 / ${row.original.strategies.length} 策略`,
      },
      {
        accessorKey: "updatedAt",
        header: "最近更新",
        cell: ({ row }) => formatDate(row.original.updatedAt),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">操作</span>,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <IconDotsVertical />
                <span className="sr-only">打开操作菜单</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => openGame(row.original)}>
                <IconEdit />
                继续编辑
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openGame(row.original, "/results")}>
                <IconChartDots3 />
                查看结果
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={async () => {
                  await duplicateCase(row.original.id)
                  toast.success("已创建案例副本")
                }}
              >
                <IconCopy />
                创建副本
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={cases.length === 1}
                onSelect={async () => {
                  await deleteCase(row.original.id)
                  toast.success("案例已从本地删除")
                }}
              >
                <IconTrash />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [cases.length, deleteCase, duplicateCase, openGame]
  )

  const filtered = React.useMemo(
    () =>
      cases.filter(
        (game) =>
          (status === "all" || game.status === status) &&
          `${game.title} ${game.description}`
            .toLowerCase()
            .includes(query.trim().toLowerCase())
      ),
    [cases, query, status]
  )

  // TanStack Table exposes imperative helpers; React Compiler intentionally skips this hook.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const analyzedCount = cases.filter((game) => game.status === "analyzed").length
  const totalProfiles = cases.reduce(
    (total, game) =>
      total +
      game.players.reduce(
        (value, player) =>
          value *
          game.strategies.filter((strategy) => strategy.playerId === player.id).length,
        1
      ),
    0
  )
  const chartData = Array.from({ length: 6 }, (_, index) => {
    const month = new Date()
    month.setMonth(month.getMonth() - (5 - index))
    const count = cases.filter(
      (game) => new Date(game.updatedAt) <= new Date(month.getFullYear(), month.getMonth() + 1)
    ).length
    return {
      month: `${month.getMonth() + 1}月`,
      cases: Math.max(count, index === 5 ? cases.length : 0),
      analyzed:
        index === 5
          ? analyzedCount
          : Math.min(analyzedCount, Math.max(0, count - 1)),
    }
  })

  return (
    <DashboardPage>
      <MetricCards
        items={[
          { label: "案例总数", value: cases.length, detail: "本机保存的全部分析案例", badge: "本地" },
          { label: "已完成分析", value: analyzedCount, detail: "已有可查看均衡结果的案例", badge: `${Math.round((analyzedCount / Math.max(cases.length, 1)) * 100)}%` },
          { label: "策略组合", value: totalProfiles, detail: "当前案例库覆盖的组合总数", badge: "≤ 625/案例" },
          { label: "最新版本", value: `V${Math.max(...cases.map((game) => game.version), 1)}`, detail: "案例修改可保留版本快照", badge: "自动保存" },
        ]}
      />

      <PageSection>
        <AreaChartCard
          title="案例分析进度"
          description="最近六个月累计案例与已分析案例"
          data={chartData}
          xKey="month"
          series={[
            { key: "cases", label: "全部案例", color: "var(--chart-1)" },
            { key: "analyzed", label: "已分析", color: "var(--chart-2)" },
          ]}
          action={
            <Badge variant="outline">
              <IconArrowUpRight />
              当前工作台
            </Badge>
          }
        />
      </PageSection>

      <PageSection>
        <Card>
          <CardHeader className="border-b">
            <div>
              <CardTitle>案例列表</CardTitle>
              <CardDescription>筛选、打开或复制本地案例</CardDescription>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:max-w-sm">
                <IconSearch className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索案例"
                  className="pl-8"
                />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="modeled">已建模</SelectItem>
                  <SelectItem value="analyzed">已分析</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <IconPlus />
                    新建案例
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>选择建模模板</DialogTitle>
                    <DialogDescription>
                      模板仅创建参与方与策略结构，不会自动生成真实业务收益。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-2">
                    <Label htmlFor="template">案例类型</Label>
                    <Select
                      value={template}
                      onValueChange={(value) =>
                        setTemplate(value as (typeof templates)[number]["value"])
                      }
                    >
                      <SelectTrigger id="template" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={async () => {
                        await createCase(template)
                        setCreateOpen(false)
                        router.push("/model")
                      }}
                    >
                      创建并开始建模
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="px-0">
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
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      没有符合条件的案例
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-sm text-muted-foreground">
                共 {filtered.length} 个案例
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  下一页
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      <Drawer
        direction={isMobile ? "bottom" : "right"}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DrawerContent className="sm:max-w-md">
          <div className="mx-auto w-full max-w-2xl">
            <DrawerHeader>
              <DrawerTitle>{selected?.title}</DrawerTitle>
              <DrawerDescription>{selected?.description}</DrawerDescription>
            </DrawerHeader>
            {selected && (
              <div className="grid gap-4 px-4 text-sm sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground">参与方</p>
                  <p className="mt-1 text-lg font-semibold">{selected.players.length}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground">策略数量</p>
                  <p className="mt-1 text-lg font-semibold">{selected.strategies.length}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground">模型版本</p>
                  <p className="mt-1 text-lg font-semibold">V{selected.version}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground">场景数量</p>
                  <p className="mt-1 text-lg font-semibold">{selected.scenarios.length}</p>
                </div>
              </div>
            )}
            <DrawerFooter className="sm:flex-row sm:justify-end">
              <DrawerClose asChild>
                <Button variant="outline">关闭</Button>
              </DrawerClose>
              {selected && (
                <Button onClick={() => openGame(selected)}>
                  打开案例
                  <IconArrowUpRight />
                </Button>
              )}
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </DashboardPage>
  )
}
