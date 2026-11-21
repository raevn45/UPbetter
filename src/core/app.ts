import { AlarmService } from "./services/alarm-service";
import { CountdownService } from "./services/countdown-service";
import { MissionService } from "./services/mission-service";
import { SettingsService } from "./services/settings-service";
import { SoundService } from "./services/sound-service";
import { TimerService } from "./services/timer-service";
import { WorldClockService } from "./services/world-clock-service";
import { TimeService } from "./time/time-service";
import { BackupService } from "./services/backup-service";

/** Shared local application services consumed by the UI. */
export const upCore = {
  alarms: new AlarmService(),
  countdowns: new CountdownService(),
  missions: new MissionService(),
  settings: new SettingsService(),
  sounds: new SoundService(),
  timers: new TimerService(),
  worldClock: new WorldClockService(),
  backup: new BackupService(),
  time: TimeService
};
