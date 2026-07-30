"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  IconAdjustments,
  IconArchive,
  IconBinaryTree,
  IconBrandDatabricks,
  IconChartDots3,
  IconFileAnalytics,
  IconHelpCircle,
  IconLayoutDashboard,
  IconPlus,
  IconReportAnalytics,
  IconScale,
  IconTable,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useGameStore } from "@/stores/use-game-store"

const primaryNavigation = [
  { title: "案例库", href: "/cases", icon: IconLayoutDashboard },
  { title: "模型适用性", href: "/model", icon: IconAdjustments },
  { title: "参与方与策略", href: "/strategies", icon: IconBinaryTree },
  { title: "收益录入", href: "/payoffs", icon: IconTable },
  { title: "分析结果", href: "/results", icon: IconChartDots3 },
  { title: "场景比较", href: "/scenarios", icon: IconScale },
  { title: "报告预览", href: "/report", icon: IconReportAnalytics },
]

const supportNavigation = [
  { title: "备份与恢复", href: "/backup", icon: IconArchive },
  { title: "使用说明", href: "/help", icon: IconHelpCircle },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const cases = useGameStore((state) => state.cases)
  const activeCaseId = useGameStore((state) => state.activeCaseId)
  const setActiveCase = useGameStore((state) => state.setActiveCase)
  const createCase = useGameStore((state) => state.createCase)

  async function handleCreate() {
    await createCase("cooperation")
    router.push("/model")
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="gap-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/cases">
                <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <IconBrandDatabricks />
                </span>
                <span className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">博弈决策台</span>
                  <span className="truncate text-xs text-muted-foreground">
                    本地分析工作台
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Button className="w-full justify-start" size="sm" onClick={handleCreate}>
          <IconPlus />
          新建案例
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>当前案例</SidebarGroupLabel>
          <SidebarGroupContent>
            <label className="sr-only" htmlFor="active-case">
              选择当前案例
            </label>
            <select
              id="active-case"
              value={activeCaseId ?? ""}
              onChange={(event) => setActiveCase(event.target.value)}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              {cases.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.title}
                </option>
              ))}
            </select>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>决策工作流</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryNavigation.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {supportNavigation.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
          <IconFileAnalytics className="size-4" />
          数据仅保存在本机
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

