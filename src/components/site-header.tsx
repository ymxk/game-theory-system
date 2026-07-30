"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import {
  IconChevronRight,
  IconFileImport,
  IconPlus,
  IconRefresh,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useGameStore } from "@/stores/use-game-store"

const pageTitles: Record<string, string> = {
  "/cases": "案例库",
  "/model": "模型适用性",
  "/strategies": "参与方与策略",
  "/payoffs": "收益录入",
  "/results": "分析结果",
  "/scenarios": "场景比较",
  "/report": "报告预览",
  "/backup": "备份与恢复",
  "/help": "使用说明",
}

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const activeCaseId = useGameStore((state) => state.activeCaseId)
  const game = useGameStore((state) =>
    state.cases.find((item) => item.id === activeCaseId)
  )
  const createCase = useGameStore((state) => state.createCase)
  const title = pageTitles[pathname] ?? "博弈决策台"

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full min-w-0 items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex min-w-0 items-center gap-1 text-sm">
          <Link
            href="/cases"
            className="hidden truncate text-muted-foreground hover:text-foreground sm:block"
          >
            {game?.title ?? "未选择案例"}
          </Link>
          <IconChevronRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
          <h1 className="truncate font-medium">{title}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {game?.isSample && (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              演示案例
            </Badge>
          )}
          {pathname === "/cases" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="hidden sm:inline-flex"
              >
                <Link href="/backup">
                  <IconFileImport />
                  导入备份
                </Link>
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  await createCase("cooperation")
                  router.push("/model")
                }}
              >
                <IconPlus />
                新建案例
              </Button>
            </>
          ) : (
            <>
              {pathname === "/results" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={() => window.location.reload()}
                >
                  <IconRefresh />
                  重新计算
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link href="/report">查看报告</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
