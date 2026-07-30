import type { Icon } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type MetricItem = {
  label: string
  value: string | number
  detail: string
  badge?: string
  icon?: Icon
}

export function MetricCards({ items }: { items: MetricItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 lg:px-6">
      {items.map((item) => (
        <Card key={item.label} className="@container/card">
          <CardHeader>
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {item.value}
            </CardTitle>
            {item.badge && (
              <CardAction>
                <Badge variant="outline">
                  {item.icon && <item.icon />}
                  {item.badge}
                </Badge>
              </CardAction>
            )}
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {item.detail}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

