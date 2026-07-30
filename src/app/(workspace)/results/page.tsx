import type { Metadata } from "next"

import { AnalysisResults } from "@/components/workspace/analysis-results"

export const metadata: Metadata = { title: "分析结果" }

export default function Page() {
  return <AnalysisResults />
}

