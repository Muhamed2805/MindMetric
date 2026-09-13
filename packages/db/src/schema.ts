import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  role: text("role").notNull().default("user"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const instrument = pgTable("instrument", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  kind: text("kind").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const instrumentVersion = pgTable(
  "instrument_version",
  {
    id: text("id").primaryKey(),
    instrumentId: text("instrument_id")
      .notNull()
      .references(() => instrument.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    status: text("status").notNull(),
    definition: jsonb("definition").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("instrument_version_instrument_id_version_unique").on(
      table.instrumentId,
      table.version,
    ),
  ],
);

export const assessment = pgTable("assessment", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  instrumentVersionId: text("instrument_version_id")
    .notNull()
    .references(() => instrumentVersion.id),
  status: text("status").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const assessmentAnswer = pgTable(
  "assessment_answer",
  {
    id: text("id").primaryKey(),
    assessmentId: text("assessment_id")
      .notNull()
      .references(() => assessment.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    value: jsonb("value").notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull(),
  },
  (table) => [unique().on(table.assessmentId, table.itemId)],
);

export const assessmentResult = pgTable("assessment_result", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id")
    .notNull()
    .unique()
    .references(() => assessment.id, { onDelete: "cascade" }),
  model: text("model").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const item = pgTable("item", {
  id: text("id").primaryKey(),
  bankId: text("bank_id").notNull(),
  domain: text("domain").notNull(),
  engine: text("engine").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const itemRevision = pgTable(
  "item_revision",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => item.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    status: text("status").notNull(),
    content: jsonb("content").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("item_revision_item_id_revision_unique").on(
      table.itemId,
      table.revision,
    ),
  ],
);

export const subtestForm = pgTable("subtest_form", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  domain: text("domain").notNull(),
  engine: text("engine").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const subtestFormVersion = pgTable(
  "subtest_form_version",
  {
    id: text("id").primaryKey(),
    formId: text("form_id")
      .notNull()
      .references(() => subtestForm.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    status: text("status").notNull(),
    definition: jsonb("definition").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("subtest_form_version_form_id_version_unique").on(
      table.formId,
      table.version,
    ),
  ],
);

export const battery = pgTable("battery", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const batteryVersion = pgTable(
  "battery_version",
  {
    id: text("id").primaryKey(),
    batteryId: text("battery_id")
      .notNull()
      .references(() => battery.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    status: text("status").notNull(),
    definition: jsonb("definition").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("battery_version_battery_id_version_unique").on(
      table.batteryId,
      table.version,
    ),
  ],
);

// Covariates are snapshotted here because norms must never read the mutable
// profile: age and device change, a scored session does not (ADR 0014).
export const batterySession = pgTable("battery_session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  batteryVersionId: text("battery_version_id")
    .notNull()
    .references(() => batteryVersion.id),
  status: text("status").notNull(),
  attemptNumber: integer("attempt_number").notNull(),
  isPracticeMode: boolean("is_practice_mode").notNull().default(false),
  administrationContext: text("administration_context").notNull(),
  ageYears: integer("age_years"),
  deviceClass: text("device_class").notNull(),
  inputMode: text("input_mode").notNull(),
  viewportWidth: integer("viewport_width"),
  viewportHeight: integer("viewport_height"),
  locale: text("locale").notNull(),
  itemLanguage: text("item_language").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const sectionInstance = pgTable(
  "section_instance",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => batterySession.id, { onDelete: "cascade" }),
    formVersionId: text("form_version_id")
      .notNull()
      .references(() => subtestFormVersion.id),
    domain: text("domain").notNull(),
    position: integer("position").notNull(),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    // Absolute, so a refresh cannot buy extra time.
    deadlineAt: timestamp("deadline_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    deviceNormEligible: boolean("device_norm_eligible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("section_instance_session_id_position_unique").on(
      table.sessionId,
      table.position,
    ),
  ],
);

// Records what was actually presented, including the option permutation. A
// stored choice is meaningless without it.
export const itemInstance = pgTable(
  "item_instance",
  {
    id: text("id").primaryKey(),
    sectionInstanceId: text("section_instance_id")
      .notNull()
      .references(() => sectionInstance.id, { onDelete: "cascade" }),
    itemRevisionId: text("item_revision_id")
      .notNull()
      .references(() => itemRevision.id),
    position: integer("position").notNull(),
    role: text("role").notNull(),
    presentation: jsonb("presentation").notNull(),
    itemFamilyId: text("item_family_id"),
    generatorVersion: text("generator_version"),
    seed: text("seed"),
    parameters: jsonb("parameters"),
    shownAt: timestamp("shown_at", { withTimezone: true }),
    status: text("status").notNull(),
  },
  (table) => [
    unique("item_instance_section_instance_id_position_unique").on(
      table.sectionInstanceId,
      table.position,
    ),
  ],
);

// Correctness is deliberately absent: it is derived at scoring time from the
// choice and the key, so a key correction can be re-scored (ADR 0016).
export const batteryResponse = pgTable("battery_response", {
  id: text("id").primaryKey(),
  itemInstanceId: text("item_instance_id")
    .notNull()
    .unique()
    .references(() => itemInstance.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  choiceId: text("choice_id"),
  responseTimeMs: integer("response_time_ms"),
  clientShownAt: timestamp("client_shown_at", { withTimezone: true }),
  clientFirstInteractionAt: timestamp("client_first_interaction_at", {
    withTimezone: true,
  }),
  clientAnsweredAt: timestamp("client_answered_at", { withTimezone: true }),
  serverReceivedAt: timestamp("server_received_at", {
    withTimezone: true,
  }).notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
  payload: jsonb("payload"),
});

// Append-only evidence. Rules that turn these into flags live in a versioned
// rule set (ADR 0017), not here.
export const qualityEvent = pgTable("quality_event", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => batterySession.id, { onDelete: "cascade" }),
  sectionInstanceId: text("section_instance_id").references(
    () => sectionInstance.id,
    { onDelete: "cascade" },
  ),
  kind: text("kind").notNull(),
  payload: jsonb("payload"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
});

export const sectionScore = pgTable(
  "section_score",
  {
    id: text("id").primaryKey(),
    sectionInstanceId: text("section_instance_id")
      .notNull()
      .references(() => sectionInstance.id, { onDelete: "cascade" }),
    scoringModel: text("scoring_model").notNull(),
    qualityRulesVersion: text("quality_rules_version").notNull(),
    normsVersionId: text("norms_version_id").notNull(),
    inputDigest: text("input_digest").notNull(),
    payload: jsonb("payload").notNull(),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("section_score_pins_unique").on(
      table.sectionInstanceId,
      table.scoringModel,
      table.qualityRulesVersion,
      table.normsVersionId,
    ),
  ],
);

export const batteryScore = pgTable(
  "battery_score",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => batterySession.id, { onDelete: "cascade" }),
    aggregationModel: text("aggregation_model").notNull(),
    qualityRulesVersion: text("quality_rules_version").notNull(),
    normsVersionId: text("norms_version_id").notNull(),
    inputDigest: text("input_digest").notNull(),
    payload: jsonb("payload").notNull(),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("battery_score_pins_unique").on(
      table.sessionId,
      table.aggregationModel,
      table.qualityRulesVersion,
      table.normsVersionId,
    ),
  ],
);
