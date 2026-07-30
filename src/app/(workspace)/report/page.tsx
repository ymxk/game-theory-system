import type { Metadata } from "next"

import { ReportPreview } from "@/components/workspace/report-preview"

export const metadata: Metadata = { title: "报告预览" }

export default function Page() {
  return <ReportPreview />
}

