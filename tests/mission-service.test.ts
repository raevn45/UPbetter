import { describe, expect, it } from "vitest";
import { MissionService } from "../src/core/services/mission-service";

describe("MissionService", () => {
  it("checks a typed answer and expires a completed challenge", () => {
    const missions = new MissionService();
    const challenge = missions.create({ kind: "typing", difficulty: "easy", rounds: 1 });
    const result = missions.check(challenge.id, "I am up.");
    expect(result.correct).toBe(true);
    expect(missions.check(challenge.id, "I am up.").correct).toBe(false);
  });

  it("accepts the movement completion action", () => {
    const missions = new MissionService();
    const challenge = missions.create({ kind: "movement", difficulty: "easy", rounds: 1 });
    expect(missions.check(challenge.id, "complete").correct).toBe(true);
  });

  it("resolves Surprise Me into a real challenge type", () => {
    const missions = new MissionService();
    const challenge = missions.create({ kind: "random", difficulty: "easy", rounds: 1 });
    expect(["math", "memory", "sequence", "typing", "logic", "checklist", "movement"]).toContain(challenge.kind);
    expect(challenge.kind).not.toBe("random");
  });
});
