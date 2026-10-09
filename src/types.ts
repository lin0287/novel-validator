export type CharacterId = string;
export type LocationId = string;
export type ItemId = string;
export type SceneId = string;
export type MomentId = string;

/** Minutes since the world epoch. */
export type WorldTime = number;

export interface Character {
  id: CharacterId;
  name: string;
  aliases?: string[];
}

export interface Location {
  id: LocationId;
  name: string;
  /** Parent location id for nesting (region > town > room). */
  parentId?: LocationId;
}

export type TravelMode = "foot" | "horse" | "ship";

/** A travel link between two locations, directed (add both directions for bidirectional). */
export interface Route {
  fromId: LocationId;
  toId: LocationId;
  /** Minutes per travel mode. */
  travelTime: Partial<Record<TravelMode, number>>;
}

export type EventType = "DEATH" | "DEPARTED" | "TRANSFER" | "LOST" | "DESTROYED";

export interface Event {
  type: EventType;
  entityId: CharacterId | ItemId;
  worldTime: WorldTime;
  sceneId: SceneId;
  /** For TRANSFER: the new holder's id. */
  toId?: CharacterId;
  note?: string;
}

/** One entity (character or item) present at a specific world time and location. */
export interface Appearance {
  entityId: CharacterId | ItemId;
  locationId: LocationId;
  worldTime: WorldTime;
  sceneId: SceneId;
  momentId: MomentId;
}

/** A single point in time within a scene. */
export interface Moment {
  id: MomentId;
  sceneId: SceneId;
  worldTime: WorldTime;
  locationId: LocationId;
  /** Characters present at this moment. */
  characterIds: CharacterId[];
  events?: Event[];
  /** Prose position (character offset) if anchored to scene text. */
  proseOffset?: number;
}

export interface Scene {
  id: SceneId;
  chapterId: string;
  /** Reading order within the chapter (1-based). */
  order: number;
  title?: string;
  moments: Moment[];
  flashback?: boolean;
  dream?: boolean;
}

export interface Chapter {
  id: string;
  projectId: string;
  /** Reading order (1-based). */
  order: number;
  title?: string;
  scenes: Scene[];
}

export interface CalendarDef {
  /** Names of months in order. */
  monthNames: string[];
  /** Days per month (parallel array to monthNames). */
  daysPerMonth: number[];
  /** Minutes per day. */
  minutesPerDay: number;
}

export interface Project {
  id: string;
  title: string;
  characters: Character[];
  locations: Location[];
  routes: Route[];
  chapters: Chapter[];
  calendar: CalendarDef;
}
