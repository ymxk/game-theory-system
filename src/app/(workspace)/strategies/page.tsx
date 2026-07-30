import type { Metadata } from "next"

import { StrategyBuilder } from "@/components/workspace/strategy-builder"

export const metadata: Metadata = { title: "参与方与策略" }

export default function Page() {
  return <StrategyBuilder />
}

