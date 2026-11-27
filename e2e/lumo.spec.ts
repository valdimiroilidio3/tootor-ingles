import { expect, test, type Page } from "@playwright/test";

async function completeOnboarding(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Hi, I'm Lumo!" })).toBeVisible();
  await page.getByRole("button", { name: "Let's start" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Skip — start at my level" }).click();
  await expect(page).toHaveURL(/\/learn$/);
}

async function startGreetings(page: Page) {
  await page.goto("/lesson/a1-greetings");
  await page.getByRole("button", { name: "Start lesson" }).click();
  await expect(page.getByText("Choose the correct answer")).toBeVisible();
}

async function chooseAndContinue(page: Page, answer: string, nextLabel = "Continue") {
  await page.getByRole("radio", { name: answer, exact: true }).click();
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
  await page.getByRole("button", { name: nextLabel, exact: true }).click();
}

async function answerGreetingsLesson(page: Page) {
  await chooseAndContinue(page, "Good morning");

  for (const [english, portuguese] of [
    ["Hello", "Olá"],
    ["Goodbye", "Tchau"],
    ["Thank you", "Obrigado"],
    ["Please", "Por favor"],
    ["Good morning", "Bom dia"],
  ]) {
    await page.getByRole("button", { name: english, exact: true }).click();
    await page.getByRole("button", { name: portuguese, exact: true }).click();
  }
  await expect(page.getByText("All pairs matched!")).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await page.getByRole("textbox", { name: "Your translation" }).fill("My name is Ana");
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  for (const word of ["Nice", "to", "meet", "you"]) await page.getByRole("button", { name: word, exact: true }).click();
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await chooseAndContinue(page, "name");
  await chooseAndContinue(page, "Nice to meet you");
  await chooseAndContinue(page, "I'm fine, thank you.");

  for (const word of ["How", "are", "you"]) await page.getByRole("button", { name: word, exact: true }).click();
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await page.getByRole("textbox", { name: "Your translation" }).fill("bom dia");
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Perfect!" })).toBeVisible();
}

async function readSession(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("lumo-english");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const request = db.transaction("sessions", "readonly").objectStore("sessions").get("a1-greetings");
    const session = await new Promise<{ draft: unknown; matchingDraft?: { matchedPairs: string[] } } | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return session;
  });
}

async function readLessonRecords(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("lumo-english");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction(["progress", "activity", "attempts", "vocab"], "readonly");
    const progressRequest = tx.objectStore("progress").get("a1-greetings");
    const activityRequest = tx.objectStore("activity").getAll();
    const attemptsRequest = tx.objectStore("attempts").getAll();
    const vocabRequest = tx.objectStore("vocab").getAll();
    const [progress, activity, attempts, vocab] = await Promise.all([
      new Promise<{ xpAwarded: number; timesCompleted: number }>((resolve, reject) => {
        progressRequest.onsuccess = () => resolve(progressRequest.result);
        progressRequest.onerror = () => reject(progressRequest.error);
      }),
      new Promise<Array<{ refId?: string; xp: number }>>((resolve, reject) => {
        activityRequest.onsuccess = () => resolve(activityRequest.result);
        activityRequest.onerror = () => reject(activityRequest.error);
      }),
      new Promise<Array<{ lessonId: string }>>((resolve, reject) => {
        attemptsRequest.onsuccess = () => resolve(attemptsRequest.result);
        attemptsRequest.onerror = () => reject(attemptsRequest.error);
      }),
      new Promise<Array<{ source: string }>>((resolve, reject) => {
        vocabRequest.onsuccess = () => resolve(vocabRequest.result);
        vocabRequest.onerror = () => reject(vocabRequest.error);
      }),
    ]);
    db.close();
    return {
      progress,
      activity: activity.filter((entry) => entry.refId === "a1-greetings"),
      attempts: attempts.filter((attempt) => attempt.lessonId === "a1-greetings"),
      lessonVocab: vocab.filter((item) => item.source === "lesson"),
    };
  });
}

test("first access completes onboarding and opens the learning path", async ({ page }) => {
  await completeOnboarding(page);
  await expect(page.getByRole("heading", { name: "Learning path" })).toBeVisible();
  await page.getByRole("link", { name: /Continue/ }).click();
  await expect(page.getByRole("heading", { name: "Greetings & Introductions" })).toBeVisible();
  await page.getByRole("button", { name: "Start lesson" }).click();
  await expect(page.getByText("Choose the correct answer")).toBeVisible();
});

test("answer draft and submitted feedback survive refresh and resume", async ({ page }) => {
  await completeOnboarding(page);
  await startGreetings(page);
  await page.getByRole("radio", { name: "Good morning", exact: true }).click();
  await expect.poll(async () => (await readSession(page))?.draft).toBe("Good morning");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Pick up where you left off" })).toBeVisible();
  await page.getByRole("button", { name: "Resume lesson" }).click();
  await expect(page.getByRole("radio", { name: "Good morning", exact: true })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Resume lesson" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Match each phrase with its meaning" })).toBeVisible();
  await page.getByRole("button", { name: "Hello", exact: true }).click();
  await page.getByRole("button", { name: "Olá", exact: true }).click();
  await expect.poll(async () => (await readSession(page))?.matchingDraft?.matchedPairs).toContain("Hello::Olá");
  await page.reload();
  await page.getByRole("button", { name: "Resume lesson" }).click();
  await expect(page.getByRole("button", { name: "Hello", exact: true })).toBeDisabled();
});

test("restart explicitly discards the saved draft", async ({ page }) => {
  await completeOnboarding(page);
  await startGreetings(page);
  await page.getByRole("radio", { name: "Good morning", exact: true }).click();
  await expect.poll(async () => (await readSession(page))?.draft).toBe("Good morning");
  await page.reload();
  await page.getByRole("button", { name: "Restart from beginning" }).click();
  await expect(page.getByRole("radio", { name: "Good morning", exact: true })).toHaveAttribute("aria-checked", "false");
});

test("completion awards XP once and a deliberate practice run cannot award it again", async ({ page }) => {
  await completeOnboarding(page);
  await startGreetings(page);
  await answerGreetingsLesson(page);
  const first = await readLessonRecords(page);
  expect(first.progress.xpAwarded).toBeGreaterThan(0);
  expect(first.activity).toHaveLength(1);
  expect(first.attempts).toHaveLength(9);
  expect(first.lessonVocab).toHaveLength(8);
  const firstXp = first.progress.xpAwarded;

  await page.goto("/lesson/a1-greetings");
  await expect(page.getByText("Practice run · no extra XP")).toBeVisible();
  await page.getByRole("button", { name: "Start lesson" }).click();
  await answerGreetingsLesson(page);

  const repeated = await readLessonRecords(page);
  expect(repeated.progress.timesCompleted).toBe(2);
  expect(repeated.progress.xpAwarded).toBe(firstXp);
  expect(repeated.activity).toHaveLength(2);
  expect(repeated.activity.map((entry) => entry.xp)).toEqual([firstXp, 0]);
  expect(repeated.attempts).toHaveLength(18);
  expect(repeated.lessonVocab).toHaveLength(first.lessonVocab.length);
});

test("vocabulary can be added and reviewed", async ({ page }) => {
  await completeOnboarding(page);
  await page.goto("/vocabulary");
  await page.getByRole("button", { name: "Add word" }).click();
  await page.getByPlaceholder("e.g. look forward to").fill("good morning");
  await page.getByPlaceholder("e.g. aguardar com expectativa").fill("bom dia");
  await page.getByRole("button", { name: "Save word" }).click();
  await expect(page.getByText("Added “good morning”")).toBeVisible();
  await page.getByRole("link", { name: "Review 1" }).click();
  await page.getByRole("button", { name: /Start review/ }).click();
  await expect(page.getByText("good morning", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show answer" }).click();
  await expect(page.getByText("bom dia", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Good/ }).click();
  await expect(page.getByRole("heading", { name: "Review complete!" })).toBeVisible();
});

test("storage failures are visible without crashing onboarding", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(IDBFactory.prototype, "open", {
      configurable: true,
      value() { throw new DOMException("blocked by test", "UnknownError"); },
    });
  });
  await page.goto("/");
  await expect(page.getByRole("alert").filter({ hasText: "Storage problem" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hi, I'm Lumo!" })).toBeVisible();
});

test("mobile navigation works at 320 pixels and traps keyboard focus in More", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await completeOnboarding(page);
  const width = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(width.content).toBeLessThanOrEqual(width.viewport + 1);
  const more = page.getByRole("button", { name: "More" });
  await more.click();
  const dialog = page.getByRole("dialog", { name: "More" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Vocabulary" })).toBeVisible();
  const close = dialog.getByRole("button", { name: "Close", exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("link").last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(more).toBeFocused();
});

test("key phone, tablet, and desktop widths do not overflow", async ({ page }) => {
  await completeOnboarding(page);
  const routes = ["/", "/learn", "/progress", "/vocabulary", "/review", "/practice", "/settings"];
  for (const width of [320, 375, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      const sizes = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
      expect(sizes.document, `${route} document overflow at ${width}px`).toBeLessThanOrEqual(sizes.viewport + 1);
      expect(sizes.body, `${route} body overflow at ${width}px`).toBeLessThanOrEqual(sizes.viewport + 1);
    }
  }
});

test("dashboard and lesson navigation produce no uncaught browser errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await completeOnboarding(page);
  await page.goto("/");
  await page.goto("/lesson/a1-greetings");
  await page.getByRole("button", { name: "Start lesson" }).click();
  await page.getByRole("radio", { name: "Good morning", exact: true }).click();
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
  expect(errors).toEqual([]);
});
