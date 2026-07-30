import type { Metadata } from "next"

import { HelpPage } from "@/components/workspace/help-page"

export const metadata: Metadata = { title: "使用说明" }

export default function Page() {
  return <HelpPage />
}

