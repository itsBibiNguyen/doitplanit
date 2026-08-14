import { describe, expect, it } from "vitest";
import type { Label, Task, TaskActivity, TaskStatus } from "@/lib/types";
import {
  POSITION_STEP,
  containerOf,
  filterTasks,
  formatActivityCopy,
  groupByStatus,
  isStatusId,
  planPlacement,
  positionBetween,
  prettyStatus,
  summarizeBoard,
} from "@/lib/board";

function task(overrides: Partial<Task> & Pick<Task, "id" | "status">): Task {
  return {
    user_id: "user-1",
    title: overrides.title ?? overrides.id,
    description: null,
    priority: "normal",
    due_date: null,
    position: 1000,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    labels: [],
    ...overrides,
  };
}

function label(id: string, name = id): Label {
  return {
    id,
    user_id: "user-1",
    name,
    color: "#0D9488",
    created_at: "2026-08-01T00:00:00.000Z",
  };
}

function activity(
  overrides: Partial<TaskActivity> & Pick<TaskActivity, "action">,
): TaskActivity {
  return {
    id: "act-1",
    task_id: "t1",
    user_id: "user-1",
    from_value: null,
    to_value: null,
    created_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("isStatusId", () => {
  it("accepts the four board columns", () => {
    expect(isStatusId("todo")).toBe(true);
    expect(isStatusId("in_progress")).toBe(true);
    expect(isStatusId("in_review")).toBe(true);
    expect(isStatusId("done")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isStatusId("blocked")).toBe(false);
    expect(isStatusId("")).toBe(false);
  });
});

describe("prettyStatus", () => {
  it("maps known ids to labels and falls back for unknown values", () => {
    expect(prettyStatus("todo")).toBe("To Do");
    expect(prettyStatus(null)).toBe("None");
    expect(prettyStatus("blocked")).toBe("blocked");
  });
});

describe("formatActivityCopy", () => {
  it("describes created, status, title, priority, labels, and due dates", () => {
    expect(formatActivityCopy(activity({ action: "created" }))).toBe("Created");
    expect(
      formatActivityCopy(
        activity({
          action: "status_changed",
          from_value: "todo",
          to_value: "done",
        }),
      ),
    ).toBe("Moved from To Do → Done");
    expect(
      formatActivityCopy(
        activity({
          action: "title_changed",
          from_value: "Old",
          to_value: "New",
        }),
      ),
    ).toBe("Title changed from “Old” → “New”");
    expect(
      formatActivityCopy(
        activity({
          action: "priority_changed",
          from_value: "low",
          to_value: "high",
        }),
      ),
    ).toBe("Priority changed from Low → High");
    expect(
      formatActivityCopy(
        activity({ action: "label_added", to_value: "Bug" }),
      ),
    ).toBe("Added label Bug");
    expect(
      formatActivityCopy(
        activity({ action: "label_removed", from_value: "Bug" }),
      ),
    ).toBe("Removed label Bug");
    expect(
      formatActivityCopy(
        activity({
          action: "due_date_changed",
          from_value: "2026-07-24",
          to_value: "2026-07-26",
        }),
      ),
    ).toMatch(/^Due date changed from .+ → .+$/);
    expect(
      formatActivityCopy(
        activity({ action: "due_date_changed", to_value: "2026-07-26" }),
      ),
    ).toMatch(/^Due date set to .+$/);
    expect(
      formatActivityCopy(
        activity({ action: "due_date_changed", from_value: "2026-07-24" }),
      ),
    ).toMatch(/^Due date cleared \(was .+\)$/);
  });
});

describe("groupByStatus", () => {
  it("splits tasks into columns sorted by position", () => {
    const grouped = groupByStatus([
      task({ id: "b", status: "todo", position: 2000 }),
      task({ id: "a", status: "todo", position: 1000 }),
      task({ id: "c", status: "done", position: 1000 }),
    ]);

    expect(grouped.todo.map((t) => t.id)).toEqual(["a", "b"]);
    expect(grouped.in_progress).toEqual([]);
    expect(grouped.in_review).toEqual([]);
    expect(grouped.done.map((t) => t.id)).toEqual(["c"]);
  });
});

describe("filterTasks", () => {
  const bug = label("bug");
  const ux = label("ux");
  const tasks = [
    task({ id: "1", status: "todo", title: "Fix login", priority: "high", labels: [bug] }),
    task({ id: "2", status: "todo", title: "Polish header", priority: "low", labels: [ux] }),
    task({
      id: "3",
      status: "todo",
      title: "Fix header a11y",
      priority: "high",
      labels: [bug, ux],
    }),
  ];

  it("filters by title, priority, and label intersection", () => {
    expect(filterTasks(tasks, "fix", "all").map((t) => t.id)).toEqual(["1", "3"]);
    expect(filterTasks(tasks, "", "high").map((t) => t.id)).toEqual(["1", "3"]);
    expect(filterTasks(tasks, "", "all", ["bug", "ux"]).map((t) => t.id)).toEqual([
      "3",
    ]);
    expect(filterTasks(tasks, "header", "high", ["bug"]).map((t) => t.id)).toEqual([
      "3",
    ]);
  });

  it("returns every task when filters are empty", () => {
    expect(filterTasks(tasks, "  ", "all")).toHaveLength(3);
  });
});

describe("summarizeBoard", () => {
  it("counts totals from the full list and ignores done overdue dates", () => {
    const summary = summarizeBoard([
      task({
        id: "1",
        status: "todo",
        due_date: "2000-01-01",
        updated_at: "2026-08-03T00:00:00.000Z",
      }),
      task({
        id: "2",
        status: "in_progress",
        updated_at: "2026-08-02T00:00:00.000Z",
      }),
      task({
        id: "3",
        status: "done",
        due_date: "2000-01-01",
        updated_at: "2026-08-04T00:00:00.000Z",
      }),
    ]);

    expect(summary.total).toBe(3);
    expect(summary.done).toBe(1);
    expect(summary.overdue).toBe(1);
    expect(summary.byStatus).toEqual({
      todo: 1,
      in_progress: 1,
      in_review: 0,
      done: 1,
    });
    expect(summary.recentByStatus.todo.map((t) => t.id)).toEqual(["1"]);
    expect(summary.recentByStatus.done.map((t) => t.id)).toEqual(["3"]);
  });

  it("keeps the three most recently updated tasks per column", () => {
    const tasks = [1, 2, 3, 4].map((n) =>
      task({
        id: `t${n}`,
        status: "todo",
        updated_at: `2026-08-0${n}T00:00:00.000Z`,
      }),
    );
    const recent = summarizeBoard(tasks).recentByStatus.todo.map((t) => t.id);
    expect(recent).toEqual(["t4", "t3", "t2"]);
  });
});

describe("containerOf", () => {
  it("resolves a column id or the column a task currently sits in", () => {
    const tasks = [task({ id: "card", status: "in_review" })];
    expect(containerOf("done", tasks)).toBe("done");
    expect(containerOf("card", tasks)).toBe("in_review");
    expect(containerOf("missing", tasks)).toBeNull();
  });
});

describe("positionBetween", () => {
  it("uses the column gap at edges and averages neighbours", () => {
    expect(positionBetween(null, null)).toBe(POSITION_STEP);
    expect(positionBetween(null, 3000)).toBe(2000);
    expect(positionBetween(1000, null)).toBe(2000);
    expect(positionBetween(1000, 3000)).toBe(2000);
  });
});

describe("planPlacement", () => {
  const column: Task[] = [
    task({ id: "a", status: "todo", position: 1000 }),
    task({ id: "b", status: "todo", position: 3000 }),
    task({ id: "c", status: "in_progress", position: 1000 }),
  ];

  it("appends when dropping on empty column space", () => {
    expect(planPlacement(column, "c", "todo", false)).toEqual({
      status: "todo",
      position: 4000,
    });
  });

  it("inserts before or after a hovered card", () => {
    expect(planPlacement(column, "c", "b", false)).toEqual({
      status: "todo",
      position: 2000,
    });
    expect(planPlacement(column, "c", "b", true)).toEqual({
      status: "todo",
      position: 4000,
    });
  });

  it("returns null when the drop target cannot be resolved", () => {
    expect(planPlacement(column, "c", "unknown", false)).toBeNull();
  });

  it("ignores the dragged card when computing neighbours", () => {
    const sameColumn = planPlacement(column, "a", "todo" as TaskStatus, false);
    expect(sameColumn).toEqual({ status: "todo", position: 4000 });
  });
});
