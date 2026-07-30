import type { Metadata } from "next"

import { CaseLibrary } from "@/components/workspace/case-library"

export const metadata: Metadata = { title: "案例库" }

export default function Page() {
  return <CaseLibrary />
}

