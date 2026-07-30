import type { Metadata } from "next"

import { ScenarioComparison } from "@/components/workspace/scenario-comparison"

export const metadata: Metadata = { title: "场景比较" }

export default function Page() {
  return <ScenarioComparison />
}

