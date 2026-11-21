import { failure, success, type Result, type SavedCity } from "../domain/types";
import { localStore } from "../storage/database";

const id = () => globalThis.crypto?.randomUUID?.() ?? `city-${Date.now()}`;
export class WorldClockService {
  async list(): Promise<Result<SavedCity[]>> {
    try { return success(await localStore.all("cities")); }
    catch (e) { return failure("CITY_LIST_FAILED", e instanceof Error ? e.message : "Could not load cities."); }
  }
  async add(input: Omit<SavedCity, "id">): Promise<Result<SavedCity>> {
    try {
      if (!input.cityName.trim() || !input.timeZone) return failure("INVALID_CITY", "Choose a city and timezone.");
      new Intl.DateTimeFormat("en", { timeZone: input.timeZone });
      const cities = await localStore.all("cities");
      if (cities.some(city => city.timeZone === input.timeZone)) return failure("DUPLICATE_CITY", "That timezone is already saved.");
      const city = { ...input, cityName: input.cityName.trim(), id: id() };
      await localStore.put("cities", city);
      return success(city);
    } catch (e) { return failure("CITY_ADD_FAILED", e instanceof Error ? e.message : "Could not save city."); }
  }
  async remove(id: string): Promise<Result<void>> {
    try { await localStore.delete("cities", id); return success(undefined); }
    catch (e) { return failure("CITY_REMOVE_FAILED", e instanceof Error ? e.message : "Could not remove city."); }
  }
}
