import { expect, test } from "@playwright/test";

test("form steps open one by one and submit enables at end", async ({ page }) => {
  await page.goto("/sinov-darsiga-yozilish");

  const stepRegion = page.locator('[data-step="region"]');
  const stepDistrict = page.locator('[data-step="district"]');
  const stepAge = page.locator('[data-step="age"]');
  const stepParent = page.locator('[data-step="parent"]');
  const stepPhone = page.locator('[data-step="phone"]');
  const submit = page.locator('button[type="submit"]');

  await expect(stepRegion).toBeVisible();
  await expect(stepDistrict).toBeHidden();
  await expect(stepAge).toBeHidden();
  await expect(stepParent).toBeHidden();
  await expect(stepPhone).toBeHidden();
  await expect(submit).toBeDisabled();

  await page.locator('[data-dropdown="region"] [data-trigger]').click();
  await page.locator('[data-dropdown="region"] [data-option="true"]').first().click();
  await expect(stepDistrict).toBeVisible();

  await page.locator('[data-dropdown="district"] [data-trigger]').click();
  await page.locator('[data-dropdown="district"] [data-option="true"]').first().click();
  await expect(stepAge).toBeVisible();

  await page.locator('[data-dropdown="child_age"] [data-trigger]').click();
  await page.locator('[data-dropdown="child_age"] [data-option="true"]').first().click();
  await expect(stepParent).toBeVisible();

  await page.locator('input[name="parent_name"]').fill("Nodirbek");
  await expect(stepPhone).toBeVisible();

  await page.locator('input[name="phone"]').fill("+998901112233");
  await expect(submit).toBeEnabled();

  await submit.click();
  await expect(page).toHaveURL(/\/submission-success/);
  await expect(page.getByText("Forma muvaffaqiyatli jo'natildi.")).toBeVisible();
});
