import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildDefaultOnboardingTasks,
  buildDefaultOnboardingTasksFromTitles,
  computeOnboardingProgress,
} from "../../src/services/hrm/onboarding.service.js";
import { DEFAULT_ONBOARDING_TASKS } from "../../src/constants/hrm-workflow.js";

describe("buildDefaultOnboardingTasks", () => {
  test("creates 10 Satyakabir checklist items", () => {
    const tasks = buildDefaultOnboardingTasks(0);
    assert.equal(tasks.length, DEFAULT_ONBOARDING_TASKS.length);
    assert.equal(tasks[0].title, "Offer accepted");
    assert.equal(tasks[0].completed, false);
  });

  test("marks first N tasks done when doneCount provided", () => {
    const tasks = buildDefaultOnboardingTasks(3);
    assert.equal(tasks.filter((t) => t.completed).length, 3);
    assert.equal(tasks[3].completed, false);
  });
});

describe("computeOnboardingProgress", () => {
  test("returns 0 for empty list", () => {
    assert.equal(computeOnboardingProgress([]), 0);
  });

  test("returns rounded percent complete", () => {
    const tasks = [
      { title: "A", completed: true },
      { title: "B", completed: false },
    ];
    assert.equal(computeOnboardingProgress(tasks), 50);
  });

  test("returns 100 when all done", () => {
    const tasks = buildDefaultOnboardingTasks(10);
    assert.equal(computeOnboardingProgress(tasks), 100);
  });
});

describe("buildDefaultOnboardingTasksFromTitles", () => {
  test("uses custom titles", () => {
    const tasks = buildDefaultOnboardingTasksFromTitles(["A", "B"], 1);
    assert.equal(tasks.length, 2);
    assert.equal(tasks[0].completed, true);
    assert.equal(tasks[1].completed, false);
  });
});
