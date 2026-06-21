import {pgTable, text, integer, timestamp, uuid, boolean  } from "drizzle-orm/pg-core";

// -------- tracks --------
// One row per uploaded song
export const tracks = pgTable("tracks", {
    id:            uuid("id").primaryKey().defaultRandom(),
    title:         text("title").notNull(),
    artist:        text("artist"),
    album:         text("album"),
    genre:         text("genre"),
    durationSecs:  integer("duration_secs"),          // i.e. 214 for 3:34
    r2Key:         text("r2_key").notNull().unique(), // the R2 object key, e.g. "tracks/songname.mp3"
    fileName:      text("file_name").notNull(),        // original upload filename
    fileSizeBytes: integer("file_size_bytes"),
    mimeType:      text("mime_type"),                  //i.e. "audio/mpeg"
    tags:          text("tags").array(),
    uploadedAt:    timestamp("uploaded_at").defaultNow().notNull(),
});

// -------- play_events --------
// Every time you play a song, a row is inserted
// Used to calculate "last played" and drive the 3-month purge logic
export const playEvents = pgTable("play_events", {
    id:        uuid("id").primaryKey().defaultRandom(),
    trackId:   uuid("track_id").references(() => tracks.id, { onDelete: "cascade" }).notNull(),
    playedAt:  timestamp("played_at").defaultNow().notNull(),
    source:    text("source"),   // "android" | "web" - useful for debugging
});

// -------- device_cache --------
// Tracks what the Android app currently has downloaded locally
// Android syncs this table to know what to pre-download and what to purge
export const deviceCache = pgTable("device_cache", {
    id:            uuid("id").primaryKey().defaultRandom(),
    trackId:       uuid("track_id").references(() => tracks.id, { onDelete: "cascade" }).notNull(),
    deviceId:      text("device_id").notNull(),       // unique ID for your phone
    cachedAt:      timestamp("cached_at").defaultNow().notNull(),
    lastVerifiedAt:timestamp("last_verified_at"),     // last time the app confirmed file is still on disk
    isEvicted:     boolean("is_evicted").default(false).notNull(), // true = purged from device
});
