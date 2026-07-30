"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  IconAlertTriangle,
  IconDeviceFloppy,
  IconGripVertical,
  IconPlus,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { reconcileScenarioPayoffs } from "@/entities/game/mutations"
import { strategyProfileCount } from "@/entities/game/solver"
import type { GameCase, Player, Strategy } from "@/entities/game/types"
import { useActiveCase } from "@/hooks/use-active-case"
import { useGameStore } from "@/stores/use-game-store"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DashboardPage, PageSection } from "./dashboard-page"
import { MetricCards } from "./metric-cards"

function makePlayer(index: number): Player {
  return {
    id: crypto.randomUUID(),
    name: `参与方 ${index + 1}`,
    role: "",
    reservationPayoff: 0,
    participationConstraintEnabled: false,
  }
}

function makeStrategy(playerId: string, index: number): Strategy {
  return {
    id: crypto.randomUUID(),
    playerId,
    name: `策略 ${index + 1}`,
    description: "",
  }
}

function SortableStrategyRow({
  player,
  strategy,
  index,
  strategyCount,
  onUpdate,
  onRemove,
}: {
  player: Player
  strategy: Strategy
  index: number
  strategyCount: number
  onUpdate: (strategyId: string, patch: Partial<Strategy>) => void
  onRemove: (playerId: string, strategyId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: strategy.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-[24px_minmax(160px,0.45fr)_minmax(220px,1fr)_36px] md:items-center"
      data-dragging={isDragging || undefined}
    >
      <button
        type="button"
        aria-label={`拖动排序：${strategy.name}`}
        className="hidden touch-none text-muted-foreground hover:text-foreground md:block"
        {...attributes}
        {...listeners}
      >
        <IconGripVertical className="size-4" />
      </button>
      <Input
        aria-label={`${player.name}策略 ${index + 1} 名称`}
        value={strategy.name}
        onChange={(event) =>
          onUpdate(strategy.id, {
            name: event.target.value,
          })
        }
      />
      <Textarea
        aria-label={`${player.name}策略 ${index + 1} 说明`}
        value={strategy.description}
        onChange={(event) =>
          onUpdate(strategy.id, {
            description: event.target.value,
          })
        }
        placeholder="写明行动含义与边界"
        className="min-h-9 resize-none"
      />
      <Button
        variant="ghost"
        size="icon"
        disabled={strategyCount <= 2}
        onClick={() => onRemove(player.id, strategy.id)}
      >
        <IconTrash />
        <span className="sr-only">删除策略</span>
      </Button>
    </div>
  )
}

export function StrategyBuilder() {
  const game = useActiveCase()
  if (!game) return null
  return <StrategyBuilderForm key={`${game.id}-${game.updatedAt}`} game={game} />
}

function StrategyBuilderForm({ game }: { game: GameCase }) {
  const router = useRouter()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )
  const updateCase = useGameStore((state) => state.updateCase)
  const [draft, setDraft] = React.useState<GameCase>(() => structuredClone(game))

  const profileCount = strategyProfileCount(draft)
  const invalid =
    draft.players.some((player) => {
      const count = draft.strategies.filter(
        (strategy) => strategy.playerId === player.id
      ).length
      return count < 2 || count > 5
    }) || profileCount > 625

  function updatePlayer(playerId: string, patch: Partial<Player>) {
    setDraft({
      ...draft,
      players: draft.players.map((player) =>
        player.id === playerId ? { ...player, ...patch } : player
      ),
    })
  }

  function updateStrategy(strategyId: string, patch: Partial<Strategy>) {
    setDraft({
      ...draft,
      strategies: draft.strategies.map((strategy) =>
        strategy.id === strategyId ? { ...strategy, ...patch } : strategy
      ),
    })
  }

  function addPlayer() {
    if (draft.players.length >= 4) return
    const player = makePlayer(draft.players.length)
    setDraft({
      ...draft,
      players: [...draft.players, player],
      strategies: [
        ...draft.strategies,
        makeStrategy(player.id, 0),
        makeStrategy(player.id, 1),
      ],
    })
  }

  function removePlayer(playerId: string) {
    if (draft.players.length <= 2) return
    const players = draft.players.filter((player) => player.id !== playerId)
    setDraft({
      ...draft,
      players,
      strategies: draft.strategies.filter(
        (strategy) => strategy.playerId !== playerId
      ),
      focusPlayerId:
        draft.focusPlayerId === playerId ? players[0].id : draft.focusPlayerId,
    })
  }

  function addStrategy(playerId: string) {
    const count = draft.strategies.filter(
      (strategy) => strategy.playerId === playerId
    ).length
    if (count >= 5) return
    setDraft({
      ...draft,
      strategies: [...draft.strategies, makeStrategy(playerId, count)],
    })
  }

  function removeStrategy(playerId: string, strategyId: string) {
    const count = draft.strategies.filter(
      (strategy) => strategy.playerId === playerId
    ).length
    if (count <= 2) return
    setDraft({
      ...draft,
      strategies: draft.strategies.filter(
        (strategy) => strategy.id !== strategyId
      ),
    })
  }

  function reorderStrategies(
    playerId: string,
    activeId: string,
    overId: string
  ) {
    const playerStrategies = draft.strategies.filter(
      (strategy) => strategy.playerId === playerId
    )
    const fromIndex = playerStrategies.findIndex(
      (strategy) => strategy.id === activeId
    )
    const toIndex = playerStrategies.findIndex(
      (strategy) => strategy.id === overId
    )
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return
    const reordered = arrayMove(playerStrategies, fromIndex, toIndex)
    setDraft({
      ...draft,
      strategies: draft.players.flatMap((player) =>
        player.id === playerId
          ? reordered
          : draft.strategies.filter(
              (strategy) => strategy.playerId === player.id
            )
      ),
    })
  }

  async function save() {
    if (invalid) {
      toast.error("请先修正参与方、策略数量或组合上限")
      return false
    }
    const next = reconcileScenarioPayoffs({
      ...draft,
      status: draft.status === "draft" ? "modeled" : draft.status,
    })
    await updateCase(draft.id, () => next, {
      snapshotSummary: "更新参与方与策略结构",
    })
    toast.success("参与方与策略已保存")
    return true
  }

  return (
    <DashboardPage>
      <MetricCards
        items={[
          {
            label: "参与方",
            value: draft.players.length,
            detail: "V1 支持 2–4 个主要决策主体",
            badge: draft.players.length < 4 ? "可继续添加" : "已达上限",
            icon: IconUsers,
          },
          {
            label: "策略总数",
            value: draft.strategies.length,
            detail: "每个参与方需要 2–5 个策略",
            badge: "结构化枚举",
          },
          {
            label: "策略组合",
            value: profileCount,
            detail: "所有参与方策略的完整组合",
            badge: profileCount <= 625 ? "可计算" : "超出上限",
          },
          {
            label: "关注方",
            value:
              draft.players.find((player) => player.id === draft.focusPlayerId)
                ?.name ?? "未指定",
            detail: "报告建议优先从该参与方视角呈现",
            badge: "可调整",
          },
        ]}
      />

      <PageSection>
        <Card>
          <CardHeader className="border-b">
            <CardTitle>参与方与策略</CardTitle>
            <CardDescription>
              每个策略应互斥、可执行并覆盖主要选择；可拖动策略左侧手柄调整顺序。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 pt-6">
            {draft.players.map((player, playerIndex) => {
              const strategies = draft.strategies.filter(
                (strategy) => strategy.playerId === player.id
              )
              return (
                <Card key={player.id} className="gap-4 py-4 shadow-none">
                  <CardHeader className="px-4">
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 items-center justify-center rounded-md bg-muted text-sm font-semibold">
                        {playerIndex + 1}
                      </span>
                      <div>
                        <CardTitle className="text-base">
                          {player.name || `参与方 ${playerIndex + 1}`}
                        </CardTitle>
                        <CardDescription>{strategies.length} 个策略</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{strategies.length}/5</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={draft.players.length <= 2}
                        onClick={() => removePlayer(player.id)}
                      >
                        <IconTrash />
                        <span className="sr-only">删除参与方</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-5 px-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor={`player-${player.id}`}>名称</Label>
                        <Input
                          id={`player-${player.id}`}
                          value={player.name}
                          onChange={(event) =>
                            updatePlayer(player.id, { name: event.target.value })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`role-${player.id}`}>业务角色</Label>
                        <Input
                          id={`role-${player.id}`}
                          value={player.role}
                          onChange={(event) =>
                            updatePlayer(player.id, { role: event.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <Label>可选策略</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={strategies.length >= 5}
                          onClick={() => addStrategy(player.id)}
                        >
                          <IconPlus />
                          添加策略
                        </Button>
                      </div>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event: DragEndEvent) => {
                          if (!event.over) return
                          reorderStrategies(
                            player.id,
                            String(event.active.id),
                            String(event.over.id)
                          )
                        }}
                      >
                        <SortableContext
                          items={strategies.map((strategy) => strategy.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="grid gap-3">
                            {strategies.map((strategy, strategyIndex) => (
                              <SortableStrategyRow
                                key={strategy.id}
                                player={player}
                                strategy={strategy}
                                index={strategyIndex}
                                strategyCount={strategies.length}
                                onUpdate={updateStrategy}
                                onRemove={removeStrategy}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                    <div className="grid gap-4 rounded-lg bg-muted/40 p-4 sm:grid-cols-2">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={player.participationConstraintEnabled}
                          onCheckedChange={(checked) =>
                            updatePlayer(player.id, {
                              participationConstraintEnabled: checked === true,
                            })
                          }
                        />
                        启用参与约束
                      </label>
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`reservation-${player.id}`}
                          className="whitespace-nowrap"
                        >
                          保留收益
                        </Label>
                        <Input
                          id={`reservation-${player.id}`}
                          type="number"
                          value={player.reservationPayoff}
                          disabled={!player.participationConstraintEnabled}
                          onChange={(event) =>
                            updatePlayer(player.id, {
                              reservationPayoff: Number(event.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </CardContent>
          <CardFooter className="flex-col gap-4 border-t pt-6 sm:flex-row sm:justify-between">
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                variant="outline"
                disabled={draft.players.length >= 4}
                onClick={addPlayer}
              >
                <IconPlus />
                添加参与方
              </Button>
              <Select
                value={draft.focusPlayerId}
                onValueChange={(focusPlayerId) =>
                  setDraft({ ...draft, focusPlayerId })
                }
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="选择关注方" />
                </SelectTrigger>
                <SelectContent>
                  {draft.players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      关注方：{player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button variant="outline" onClick={save}>
                <IconDeviceFloppy />
                保存
              </Button>
              <Button
                onClick={async () => {
                  if (await save()) router.push("/payoffs")
                }}
              >
                进入收益录入
              </Button>
            </div>
          </CardFooter>
        </Card>
      </PageSection>

      {invalid && (
        <PageSection>
          <Alert variant="destructive">
            <IconAlertTriangle />
            <AlertTitle>模型结构超过 V1 计算边界</AlertTitle>
            <AlertDescription>
              确保每方 2–5 个策略，且总策略组合不超过 625 个后再保存。
            </AlertDescription>
          </Alert>
        </PageSection>
      )}
    </DashboardPage>
  )
}
