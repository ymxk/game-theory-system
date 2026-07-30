import type { Metadata } from "next"

import { PayoffEditor } from "@/components/workspace/payoff-editor"

export const metadata: Metadata = { title: "收益录入" }

export default function Page() {
  return <PayoffEditor />
}

