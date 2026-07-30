import { expect, test } from "@playwright/test"

test("case library loads and opens equilibrium evidence", async ({ page, isMobile }) => {
  test.skip(Boolean(isMobile), "desktop workflow check")
  await page.goto("/cases")
  await expect(page).toHaveTitle(/案例库/)
  await expect(page.getByText("案例列表", { exact: true })).toBeVisible()
  await expect(
    page
      .getByRole("table")
      .getByRole("button", { name: /渠道联合推广决策（示例）/ })
  ).toBeVisible()

  await page.getByRole("link", { name: "分析结果" }).click()
  await expect(page).toHaveURL(/\/results$/)

  const evidenceButton = page.getByRole("button", { name: "偏离证据", exact: true })
  await expect(evidenceButton).toBeVisible()
  await evidenceButton.click()
  await expect(page.getByText("对每个参与方逐一检查单边偏离后的收益变化。")).toBeVisible()
})

test("mobile navigation opens the decision workflow", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile-only check")
  await page.goto("/cases")
  await page.getByRole("button", { name: /toggle sidebar/i }).click()
  await expect(page.getByRole("link", { name: "收益录入" })).toBeVisible()
})
