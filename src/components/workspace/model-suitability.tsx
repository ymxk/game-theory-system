"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  IconAlertTriangle,
  IconCheck,
  IconCircleCheck,
  IconDeviceFloppy,
  IconInfoCircle,
} from "@tabler/icons-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import type { GameCase, SuitabilityAssessment } from "@/entities/game/types"
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { DashboardPage, PageSection } from "./dashboard-page"
import { MetricCards } from "./metric-cards"

const questions: Array<{
  key: keyof SuitabilityAssessment
  title: string
  description: string
}> = [
  {
    key: "interactionIsStrategic",
    title: "结果是否取决于多方相互选择？",
    description: "至少一方的最佳行动会随着其他参与方的行动而变化。",
  },
  {
    key: "participantsAreIdentifiable",
    title: "关键参与方是否可以明确识别？",
    description: "能够列出影响结果的 2–4 个主要决策主体。",
  },
  {
    key: "strategiesAreEnumerable",
    title: "各方可选策略是否可以枚举？",
    description: "每个参与方可归纳为 2–5 个互斥且有业务含义的选择。",
  },
  {
    key: "payoffsAreComparable",
    title: "各结果的收益是否可以相对比较？",
    description: "可使用效用或金额表达各方对不同结果的偏好顺序。",
  },
  {
    key: "rulesAreStable",
    title: "决策窗口内规则是否相对稳定？",
    description: "参与方、可选策略和关键约束不会在分析期间频繁变化。",
  },
]

const caseDetailsSchema = z.object({
  title: z.string().trim().min(2, "案例名称至少需要 2 个字符"),
  description: z.string().trim().min(10, "决策问题至少需要 10 个字符"),
})

type CaseDetailsForm = z.infer<typeof caseDetailsSchema>

export function ModelSuitability() {
  const game = useActiveCase()
  if (!game) return null
  return <ModelSuitabilityForm key={`${game.id}-${game.updatedAt}`} game={game} />
}

function ModelSuitabilityForm({ game }: { game: GameCase }) {
  const router = useRouter()
  const updateCase = useGameStore((state) => state.updateCase)
  const [draft, setDraft] = React.useState<GameCase>(() => structuredClone(game))
  const detailsForm = useForm<CaseDetailsForm>({
    resolver: zodResolver(caseDetailsSchema),
    defaultValues: {
      title: game.title,
      description: game.description,
    },
  })

  const answered = Object.values(draft.suitability).filter(
    (value) => value !== null
  ).length
  const positive = Object.values(draft.suitability).filter(Boolean).length
  const suitable = answered === questions.length && positive >= 4

  async function save() {
    const valid = await detailsForm.trigger()
    if (!valid) {
      toast.error("请先补充完整的案例名称和决策问题")
      return false
    }
    const details = detailsForm.getValues()
    await updateCase(
      draft.id,
      () => ({
        ...draft,
        ...details,
        status:
          answered === questions.length && draft.status === "draft"
            ? "modeled"
            : draft.status,
      }),
      { snapshotSummary: "更新模型适用性与边界" }
    )
    toast.success("模型适用性已保存")
    return true
  }

  return (
    <DashboardPage>
      <MetricCards
        items={[
          {
            label: "已完成评估",
            value: `${answered}/${questions.length}`,
            detail: "建议完成全部问题后继续建模",
            badge: answered === questions.length ? "已完成" : "待补充",
            icon: answered === questions.length ? IconCheck : IconInfoCircle,
          },
          {
            label: "适用项",
            value: positive,
            detail: "满足 4 项及以上适合静态博弈分析",
            badge: suitable ? "适用" : "需复核",
          },
          {
            label: "参与方范围",
            value: "2–4",
            detail: "V1 支持的主要决策主体数量",
            badge: "P0 边界",
          },
          {
            label: "组合上限",
            value: "625",
            detail: "全部参与方策略的笛卡尔积",
            badge: "本地计算",
          },
        ]}
      />

      <PageSection className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <Card>
          <CardHeader>
            <CardTitle>案例基本信息</CardTitle>
            <CardDescription>
              明确决策问题和分析边界，避免把执行计划误当作博弈问题。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <Field>
              <FieldLabel htmlFor="case-title">案例名称</FieldLabel>
              <Input
                id="case-title"
                aria-invalid={Boolean(detailsForm.formState.errors.title)}
                {...detailsForm.register("title")}
              />
              {detailsForm.formState.errors.title && (
                <FieldDescription className="text-destructive">
                  {detailsForm.formState.errors.title.message}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="case-description">决策问题</FieldLabel>
              <Textarea
                id="case-description"
                aria-invalid={Boolean(detailsForm.formState.errors.description)}
                {...detailsForm.register("description")}
                rows={4}
              />
              <FieldDescription>
                {detailsForm.formState.errors.description?.message ??
                  "建议描述“谁在什么条件下选择什么，以及希望判断什么结果”。"}
              </FieldDescription>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>分析口径</CardTitle>
            <CardDescription>这些开关直接影响结果展示与可解释性。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <Label>收益口径</Label>
              <RadioGroup
                value={draft.payoffMode}
                onValueChange={(payoffMode) =>
                  setDraft({
                    ...draft,
                    payoffMode: payoffMode as GameCase["payoffMode"],
                  })
                }
                className="grid grid-cols-2 gap-2"
              >
                <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <RadioGroupItem value="utility" />
                  效用值
                </label>
                <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <RadioGroupItem value="amount" />
                  金额
                </label>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                混合策略均衡仅在 2×2 非退化效用值模型中计算。
              </p>
            </div>
            <label className="flex items-start gap-3 rounded-lg border p-4">
              <Checkbox
                checked={draft.staticApproximationConfirmed}
                onCheckedChange={(checked) =>
                  setDraft({
                    ...draft,
                    staticApproximationConfirmed: checked === true,
                  })
                }
              />
              <span>
                <span className="block text-sm font-medium">确认静态近似</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  将多阶段过程压缩为一次同时选择，并接受这一简化。
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border p-4">
              <Checkbox
                checked={draft.sameComparableScale}
                onCheckedChange={(checked) =>
                  setDraft({ ...draft, sameComparableScale: checked === true })
                }
              />
              <span>
                <span className="block text-sm font-medium">收益处于同一可比尺度</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  仅确认后展示总收益；纳什均衡不依赖跨参与方比较。
                </span>
              </span>
            </label>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection>
        <Card>
          <CardHeader className="border-b">
            <CardTitle>适用性问卷</CardTitle>
            <CardDescription>
              每个问题都应由实际业务事实支持，系统不会替你估计。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-0 px-0">
            {questions.map((question, index) => {
              const value = draft.suitability[question.key]
              return (
                <div
                  key={question.key}
                  className="grid gap-4 border-b px-6 py-5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_220px] md:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <Label className="text-sm font-medium">{question.title}</Label>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {question.description}
                    </p>
                  </div>
                  <RadioGroup
                    value={value === null ? "" : value ? "yes" : "no"}
                    onValueChange={(next) =>
                      setDraft({
                        ...draft,
                        suitability: {
                          ...draft.suitability,
                          [question.key]: next === "yes",
                        },
                      })
                    }
                    className="grid grid-cols-2 gap-2"
                  >
                    <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                      <RadioGroupItem value="yes" />
                      是
                    </label>
                    <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                      <RadioGroupItem value="no" />
                      否
                    </label>
                  </RadioGroup>
                </div>
              )
            })}
          </CardContent>
          <CardFooter className="justify-between border-t pt-6">
            <span className="text-sm text-muted-foreground">
              已回答 {answered} / {questions.length}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={save}>
                <IconDeviceFloppy />
                保存
              </Button>
              <Button
                onClick={async () => {
                  if (await save()) router.push("/strategies")
                }}
              >
                进入参与方与策略
              </Button>
            </div>
          </CardFooter>
        </Card>
      </PageSection>

      <PageSection>
        {suitable ? (
          <Alert>
            <IconCircleCheck />
            <AlertTitle>该问题适合进入结构化博弈分析</AlertTitle>
            <AlertDescription>
              仍需在收益录入阶段注明依据、置信度与静态近似带来的限制。
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <IconAlertTriangle />
            <AlertTitle>当前适用性信息不足或存在明显限制</AlertTitle>
            <AlertDescription>
              可以继续搭建模型，但分析结果必须标记为结构检查，不能作为自动决策结论。
            </AlertDescription>
          </Alert>
        )}
      </PageSection>
    </DashboardPage>
  )
}
