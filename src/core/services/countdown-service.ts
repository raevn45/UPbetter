import { failure, success, type Countdown, type Result } from "../domain/types";
import { localStore } from "../storage/database";

const id = () => globalThis.crypto?.randomUUID?.() ?? `countdown-${Date.now()}`;
export class CountdownService {
  async list(): Promise<Result<Countdown[]>> {
    try { return success((await localStore.all("countdowns")).sort((a,b) => a.targetInstant.localeCompare(b.targetInstant))); }
    catch (e) { return failure("COUNTDOWN_LIST_FAILED", e instanceof Error ? e.message : "Could not load countdowns."); }
  }
  async create(input: Omit<Countdown, "id">): Promise<Result<Countdown>> {
    try {
      const date = new Date(input.targetInstant);
      if (!input.title.trim() || Number.isNaN(date.getTime()) || !input.timeZone) return failure("INVALID_COUNTDOWN", "Add a title, valid date and timezone.");
      new Intl.DateTimeFormat("en", { timeZone: input.timeZone });
      const value = { ...input, title: input.title.trim(), id: id() };
      await localStore.put("countdowns", value);
      return success(value);
    } catch (e) { return failure("COUNTDOWN_CREATE_FAILED", e instanceof Error ? e.message : "Could not create countdown."); }
  }
  async remove(id: string): Promise<Result<void>> {
    try { await localStore.delete("countdowns", id); return success(undefined); }
    catch (e) { return failure("COUNTDOWN_DELETE_FAILED", e instanceof Error ? e.message : "Could not delete countdown."); }
  }
}
