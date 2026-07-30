import {
  IconBinaryTree,
  IconChartDots3,
  IconReportAnalytics,
  IconTable,
} from "@tabler/icons-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DashboardPage, PageSection } from "./dashboard-page"

const steps = [
  {
    icon: IconBinaryTree,
    title: "1. 确认问题适用",
    description: "识别 2–4 个参与方、每方 2–5 个策略，并确认静态近似边界。",
  },
  {
    icon: IconTable,
    title: "2. 录入场景收益",
    description: "对每个策略组合填写各方效用或金额，同时保留依据、置信度和备注。",
  },
  {
    icon: IconChartDots3,
    title: "3. 检查分析结果",
    description: "查看全部纯策略均衡、偏离证据、最佳响应、支配关系和帕累托有效组合。",
  },
  {
    icon: IconReportAnalytics,
    title: "4. 比较场景并导出",
    description: "区分稳健均衡与条件均衡，导出 Markdown 或打印为 PDF。",
  },
]

export function HelpPage() {
  return (
    <DashboardPage>
      <PageSection>
        <Card>
          <CardHeader>
            <CardTitle>从业务问题到可解释结论</CardTitle>
            <CardDescription>
              博弈决策台不会替你生成收益，也不会自动作出决策；它负责验证给定假设下的策略稳定性。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {steps.map((step) => (
              <div key={step.title} className="rounded-xl border p-5">
                <step.icon className="size-6" />
                <h2 className="mt-4 font-semibold">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </PageSection>

      <PageSection className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>核心概念</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <Definition term="纳什均衡">
              其他参与方策略不变时，任何一方单独改变策略都不能获得更高收益。
            </Definition>
            <Definition term="严格 / 弱均衡">
              严格均衡中每个单边偏离都会降低收益；弱均衡允许至少一个偏离收益持平。
            </Definition>
            <Definition term="支配策略">
              无论其他参与方如何选择，都不差于或严格好于另一策略。
            </Definition>
            <Definition term="帕累托有效">
              不存在另一个组合让所有参与方都不差且至少一方更好。
            </Definition>
            <Definition term="稳健均衡">
              同一策略组合在所有已建场景中都保持为均衡。
            </Definition>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>V1 计算边界</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-3 pl-5 text-sm leading-6 text-muted-foreground">
              <li>2–4 个参与方，每方 2–5 个策略，最多 625 个策略组合。</li>
              <li>枚举全部纯策略纳什均衡，并提供单边偏离证据。</li>
              <li>混合策略仅支持 2×2、非退化、效用值模式。</li>
              <li>多阶段、动态信息更新和不完全信息需要先明确静态近似。</li>
              <li>只有确认同一可比尺度后，才展示跨参与方总收益。</li>
              <li>所有数据保存在浏览器本地；请定期导出 JSON 备份。</li>
            </ul>
          </CardContent>
        </Card>
      </PageSection>
    </DashboardPage>
  )
}

function Definition({
  term,
  children,
}: {
  term: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="font-medium">{term}</p>
      <p className="mt-1 text-muted-foreground">{children}</p>
    </div>
  )
}

