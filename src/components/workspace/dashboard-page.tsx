import * as React from "react"

import { cn } from "@/lib/utils"

export function DashboardPage({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div
        className={cn(
          "flex flex-col gap-4 py-4 md:gap-6 md:py-6",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function PageSection({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <section className={cn("px-4 lg:px-6", className)}>{children}</section>
}

