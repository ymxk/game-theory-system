import type { Metadata } from "next"

import { ModelSuitability } from "@/components/workspace/model-suitability"

export const metadata: Metadata = { title: "模型适用性" }

export default function Page() {
  return <ModelSuitability />
}

