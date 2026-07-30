"use client"

import * as React from "react"
import {
  IconArchive,
  IconDownload,
  IconHistory,
  IconRestore,
  IconUpload,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { useActiveCase } from "@/hooks/use-active-case"
import { formatDate } from "@/lib/format"
import { exportBackup, parseBackup } from "@/services/export/game-export"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

export function BackupCenter() {
  const game = useActiveCase()
  const cases = useGameStore((state) => state.cases)
  const importCases = useGameStore((state) => state.importCases)
  const updateCase = useGameStore((state) => state.updateCase)
  const fileInput = React.useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = React.useState<
    Awaited<ReturnType<typeof parseBackup>> | null
  >(null)

  if (!game) return null

  return (
    <DashboardPage>
      <MetricCards
        items={[
          {
            label: "本地案例",
            value: cases.length,
            detail: "保存在当前浏览器 IndexedDB",
            badge: "不上传",
            icon: IconArchive,
          },
          {
            label: "当前版本",
            value: `V${game.version}`,
            detail: game.title,
            badge: "活动案例",
          },
          {
            label: "版本快照",
            value: game.versions.length,
            detail: "最多保留最近 20 个结构化快照",
            badge: "可恢复",
            icon: IconHistory,
          },
          {
            label: "最近更新",
            value: formatDate(game.updatedAt),
            detail: "建议重大调整前导出 JSON 备份",
            badge: "手动备份",
          },
        ]}
      />

      <PageSection className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>完整备份</CardTitle>
            <CardDescription>
              导出全部案例、场景、收益和版本信息为 JSON 文件。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => exportBackup(cases)}>
              <IconDownload />
              导出全部案例备份
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>从备份恢复</CardTitle>
            <CardDescription>
              系统会先校验文件结构，再由你选择合并或完全替换。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInput.current?.click()}
            >
              <IconUpload />
              选择 JSON 备份文件
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) return
                try {
                  setPendingImport(await parseBackup(file))
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "备份文件校验失败"
                  )
                } finally {
                  event.target.value = ""
                }
              }}
            />
          </CardContent>
        </Card>
      </PageSection>

      <PageSection>
        <Card>
          <CardHeader>
            <CardTitle>当前案例版本历史</CardTitle>
            <CardDescription>
              每次保存关键建模内容会生成快照；恢复操作也会保留当前版本。
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>版本</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead>变更摘要</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...game.versions].reverse().map((version) => (
                  <TableRow key={version.id}>
                    <TableCell>
                      <Badge variant="outline">V{version.version}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(version.createdAt)}</TableCell>
                    <TableCell>{version.summary}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await updateCase(
                            game.id,
                            (current) => ({
                              ...structuredClone(version.snapshot),
                              versions: current.versions,
                            }),
                            { snapshotSummary: `恢复前快照 V${currentVersion(game)}` }
                          )
                          toast.success(`已恢复到 V${version.version} 的内容`)
                        }}
                      >
                        <IconRestore />
                        恢复
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {game.versions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      暂无版本快照。保存模型、策略或收益后会自动生成。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection>
        <Alert>
          <IconArchive />
          <AlertTitle>浏览器数据不等于长期备份</AlertTitle>
          <AlertDescription>
            清理站点数据、更换浏览器或设备可能导致本地案例丢失。建议在关键节点导出 JSON 并保存到受控位置。
          </AlertDescription>
        </Alert>
      </PageSection>

      <Dialog
        open={Boolean(pendingImport)}
        onOpenChange={(open) => !open && setPendingImport(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认恢复 {pendingImport?.length ?? 0} 个案例</DialogTitle>
            <DialogDescription>
              “合并”会保留现有案例；ID 相同的案例以备份文件为准。“完全替换”会清空当前浏览器中的全部案例。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <Button
              variant="destructive"
              onClick={async () => {
                await importCases(pendingImport ?? [], true)
                setPendingImport(null)
                toast.success("已用备份完全替换本地案例")
              }}
            >
              完全替换
            </Button>
            <Button
              onClick={async () => {
                await importCases(pendingImport ?? [], false)
                setPendingImport(null)
                toast.success("备份案例已合并")
              }}
            >
              合并案例
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardPage>
  )
}

function currentVersion(game: { version: number }) {
  return game.version
}

