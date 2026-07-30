import type { Metadata } from "next"

import { BackupCenter } from "@/components/workspace/backup-center"

export const metadata: Metadata = { title: "备份与恢复" }

export default function Page() {
  return <BackupCenter />
}

