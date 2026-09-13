import { createHash, randomUUID } from "node:crypto";
import {
  battery,
  batteryResponse,
  batteryScore,
  batterySession,
  batteryVersion,
  type Database,
  itemInstance,
  itemRevision,
  qualityEvent,
  qualityRuleVersion,
  sectionInstance,
  sectionScore,
  subtestFormVersion,
} from "@mindmetric/db";
import {
  type BatteryProfileScore,
  type BatterySectionReport,
  batteryProfileInputCanon,
  type PowerItemRecord,
  powerSectionInputCanon,
  type SpeedTrialRecord,
  scoreAccuracyPower,
  scoreBatteryProfile,
  scoreSpeedCorrected,
  speedSectionInputCanon,
  toBatterySectionReport,
  toSpeedSectionReport,
} from "@mindmetric/scoring-core";
import {
  type AdministeredForm,
  type AdministeredItemContent,
  type AdministrationContext,
  BATTERY_PROFILE_MODEL,
  type BatteryDomain,
  buildItemPresentation,
  buildSpeedPresentation,
  classifyResponse,
  classifySpeedTrial,
  DEVICE_CLASSES,
  type DeviceClass,
  formItemCeilingMs,
  formSectionTimeLimitMs,
  INPUT_MODES,
  type InputMode,
  type ItemOutcome,
  type ItemRole,
  isClientQualityEventKind,
  isPowerDomain,
  isSpanTrialContent,
  isSpeedFormDefinition,
  isSpeedTrialContent,
  POWER_MCQ_ENGINE,
  parseAdministeredForm,
  parseAdministeredItemContent,
  parseBatteryDefinition,
  parseItemPresentation,
  parseQualityRuleSetDefinition,
  parseSpeedDecisionSubmissions,
  type ResponseCode,
  resolveSectionEligibility,
  SPEED_CHOICES,
  SUBMISSION_GRACE_MS,
  toClientPowerItem,
  toClientSpeedTrial,
  VERSION_PIN_NONE,
} from "@mindmetric/shared";
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { DATABASE } from "../database/database.module";

export type StartBatteryInput = {
  batterySlug: string;
  deviceClass: string;
  inputMode: string;
  viewportWidth: number | null;
  viewportHeight: number | null;
  locale: string;
};

export type SubmitResponseInput = {
  itemInstanceId: string;
  choiceId: string | null;
  /** Speed trials send every decision in one request so RTT is not scored. */
  decisions?: unknown;
  clientShownAt: Date | null;
  clientFirstInteractionAt: Date | null;
  clientAnsweredAt: Date | null;
};

export type QualityEventInput = {
  kind: string;
  occurredAt: Date | null;
  payload: unknown;
};

/** The item bank is authored in English; UI locale is independent (ADR 0014). */
const ITEM_LANGUAGE = "en";

function isDeviceClass(value: unknown): value is DeviceClass {
  return (DEVICE_CLASSES as readonly unknown[]).includes(value);
}

function isInputMode(value: unknown): value is InputMode {
  return (INPUT_MODES as readonly unknown[]).includes(value);
}

function optionalDimension(value: number | null) {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;
}

@Injectable()
export class BatteryService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async start(userId: string, input: StartBatteryInput) {
    if (!isDeviceClass(input.deviceClass) || !isInputMode(input.inputMode)) {
      throw new BadRequestException("Unsupported device or input mode.");
    }

    const target = await this.loadBatteryVersion(input.batterySlug);

    const open = await this.db
      .select({ id: batterySession.id })
      .from(batterySession)
      .where(
        and(
          eq(batterySession.userId, userId),
          eq(batterySession.batteryVersionId, target.version.id),
          eq(batterySession.status, "in_progress"),
        ),
      )
      .limit(1);

    const existing = open[0];
    if (existing) {
      return this.getForUser(userId, existing.id);
    }

    const prior = await this.db
      .select({ id: batterySession.id })
      .from(batterySession)
      .innerJoin(
        batteryVersion,
        eq(batteryVersion.id, batterySession.batteryVersionId),
      )
      .where(
        and(
          eq(batterySession.userId, userId),
          eq(batteryVersion.batteryId, target.battery.id),
        ),
      );

    const now = new Date();
    const sessionId = randomUUID();
    const viewportWidth = optionalDimension(input.viewportWidth);
    const viewportHeight = optionalDimension(input.viewportHeight);
    const covariates = {
      isPracticeMode: target.practiceOnly,
      deviceClass: input.deviceClass,
      viewportWidth,
      viewportHeight,
    };

    await this.db.insert(batterySession).values({
      id: sessionId,
      userId,
      batteryVersionId: target.version.id,
      status: "in_progress",
      attemptNumber: prior.length + 1,
      isPracticeMode: target.practiceOnly,
      administrationContext: target.practiceOnly ? "practice" : "battery",
      ageYears: null,
      deviceClass: input.deviceClass,
      inputMode: input.inputMode,
      viewportWidth,
      viewportHeight,
      locale: input.locale,
      itemLanguage: ITEM_LANGUAGE,
      startedAt: now,
      completedAt: null,
    });

    // Eligibility is judged now, from the snapshotted device, so the intro
    // can say whether a section will count before anyone starts it.
    const laidOut = [];
    for (const section of target.definition.sections) {
      const eligibility = await this.resolveEligibility(
        section.domain as BatteryDomain,
        covariates,
      );
      laidOut.push({
        id: randomUUID(),
        sessionId,
        formVersionId: section.formVersionId,
        domain: section.domain,
        position: section.position,
        status: "pending" as const,
        startedAt: null,
        deadlineAt: null,
        submittedAt: null,
        deviceNormEligible: eligibility.normEligible,
        ruleVersionId: eligibility.ruleVersionId,
        eligibilityObservations: eligibility.observations,
        createdAt: now,
      });
    }
    await this.db.insert(sectionInstance).values(laidOut);

    return this.getForUser(userId, sessionId);
  }

  async getForUser(userId: string, sessionId: string) {
    await this.loadOwnedSession(userId, sessionId);
    await this.closeExpiredSpeedTrials(sessionId);
    await this.closeSectionsPastDeadline(sessionId);
    return this.readState(userId, sessionId);
  }

  async listForUser(userId: string) {
    const rows = await this.db
      .select({
        session: batterySession,
        version: batteryVersion,
        batteryRow: battery,
      })
      .from(batterySession)
      .innerJoin(
        batteryVersion,
        eq(batteryVersion.id, batterySession.batteryVersionId),
      )
      .innerJoin(battery, eq(battery.id, batteryVersion.batteryId))
      .where(eq(batterySession.userId, userId))
      .orderBy(desc(batterySession.startedAt));

    const ids = rows.map((row) => row.session.id);
    const scores =
      ids.length === 0
        ? []
        : await this.db
            .select()
            .from(batteryScore)
            .where(inArray(batteryScore.sessionId, ids));

    const latest = new Map<string, (typeof scores)[number]>();
    for (const score of scores) {
      const previous = latest.get(score.sessionId);
      if (!previous || score.createdAt > previous.createdAt) {
        latest.set(score.sessionId, score);
      }
    }

    return rows.map((row) => ({
      id: row.session.id,
      status: row.session.status,
      batterySlug: row.batteryRow.slug,
      batteryTitle: row.batteryRow.title,
      batteryVersion: row.version.version,
      isPracticeMode: row.session.isPracticeMode,
      attemptNumber: row.session.attemptNumber,
      startedAt: row.session.startedAt,
      completedAt: row.session.completedAt,
      // Same rule as get: a total exists only after the battery closes.
      report:
        row.session.status === "completed"
          ? toClientReport(latest.get(row.session.id)?.payload)
          : null,
    }));
  }

  /**
   * What an examinee is told before starting: how long each section runs, what
   * the device has to be, and whether this attempt can count at all.
   */
  async getOverview(slug: string) {
    const target = await this.loadBatteryVersion(slug);
    const rules = await this.loadPublishedRules();

    const sections = [];
    let timedMs = 0;
    for (const section of target.definition.sections) {
      const form = await this.loadFormDefinition(section.formVersionId);
      const rule = rules.definition.domains[section.domain];
      timedMs += formSectionTimeLimitMs(form);
      sections.push({
        position: section.position,
        domain: section.domain,
        scoredItemCount: form.itemRevisionIds.length,
        sampleItemCount: form.sampleItemRevisionIds.length,
        sectionTimeLimitMs: formSectionTimeLimitMs(form),
        itemCeilingMs: formItemCeilingMs(form),
        minViewport: rule.minViewport,
        normIneligibleDeviceClasses: rule.normIneligibleDeviceClasses,
      });
    }

    return {
      slug: target.battery.slug,
      title: target.battery.title,
      description: target.battery.description,
      version: target.version.version,
      practiceOnly: target.practiceOnly,
      /** Time under a clock. Instructions and samples are untimed on top. */
      timedMs,
      normReferenceDeviceClass: rules.definition.normReferenceDeviceClass,
      rulesProvisional: rules.definition.provisional,
      sections,
    };
  }

  async startSection(userId: string, sessionId: string, position: number) {
    const session = await this.loadOwnedSession(userId, sessionId);
    if (session.session.status !== "in_progress") {
      throw new BadRequestException("This session is already closed.");
    }
    await this.closeExpiredSpeedTrials(sessionId);
    await this.closeSectionsPastDeadline(sessionId);

    const sections = await this.loadSections(sessionId);
    const next = sections.find(
      (section) =>
        section.status === "pending" || section.status === "in_progress",
    );
    if (!next || next.position !== position) {
      throw new BadRequestException("Sections must be taken in order.");
    }
    if (next.status === "in_progress") {
      return this.readState(userId, sessionId);
    }

    const form = await this.loadFormDefinition(next.formVersionId);
    const now = new Date();

    await this.materializeItems(next.id, form);

    const eligibility = await this.resolveEligibility(
      next.domain as BatteryDomain,
      {
        isPracticeMode: session.session.isPracticeMode,
        deviceClass: session.session.deviceClass as DeviceClass,
        viewportWidth: session.session.viewportWidth,
        viewportHeight: session.session.viewportHeight,
      },
    );

    await this.db
      .update(sectionInstance)
      .set({
        status: "in_progress",
        startedAt: now,
        // The clock starts when the first scored item is served, so sample
        // items do not spend measuring time (ADR 0014).
        deadlineAt: null,
        deviceNormEligible: eligibility.normEligible,
        ruleVersionId: eligibility.ruleVersionId,
        eligibilityObservations: eligibility.observations,
      })
      .where(eq(sectionInstance.id, next.id));

    return this.readState(userId, sessionId);
  }

  /** Stamps `shown_at`, which is what the item ceiling is measured from. */
  async serveNextItem(userId: string, sessionId: string) {
    await this.loadOwnedSession(userId, sessionId);
    await this.closeExpiredSpeedTrials(sessionId);
    await this.closeSectionsPastDeadline(sessionId);

    const section = await this.activeSection(sessionId);
    if (!section) {
      // Between sections, or already finished: the runner asks for the next
      // item after every answer, including the last one of a section.
      return this.readState(userId, sessionId);
    }

    const pending = await this.db
      .select()
      .from(itemInstance)
      .where(
        and(
          eq(itemInstance.sectionInstanceId, section.id),
          eq(itemInstance.status, "pending"),
        ),
      )
      .orderBy(asc(itemInstance.position));

    const inFlight = pending.find((row) => row.shownAt !== null);
    if (inFlight) {
      // Resume returns the in-flight item with its original shown_at.
      return this.readState(userId, sessionId);
    }

    const upcoming = pending[0];
    if (!upcoming) {
      await this.closeSection(section.id, "submitted", new Date());
      await this.completeSessionIfDone(sessionId);
      return this.readState(userId, sessionId);
    }

    const now = new Date();
    if (upcoming.role === "scored" && section.deadlineAt === null) {
      const form = await this.loadFormDefinition(section.formVersionId);
      await this.db
        .update(sectionInstance)
        .set({
          deadlineAt: new Date(now.getTime() + formSectionTimeLimitMs(form)),
        })
        .where(eq(sectionInstance.id, section.id));
    }

    await this.db
      .update(itemInstance)
      .set({ shownAt: now })
      .where(eq(itemInstance.id, upcoming.id));

    return this.readState(userId, sessionId);
  }

  async submitResponse(
    userId: string,
    sessionId: string,
    input: SubmitResponseInput,
  ) {
    await this.loadOwnedSession(userId, sessionId);
    const receivedAt = new Date();

    const section = await this.activeSection(sessionId);
    if (!section) {
      throw new BadRequestException("No section is running.");
    }

    const rows = await this.db
      .select()
      .from(itemInstance)
      .where(
        and(
          eq(itemInstance.sectionInstanceId, section.id),
          eq(itemInstance.status, "pending"),
        ),
      )
      .orderBy(asc(itemInstance.position));

    const inFlight = rows.find((row) => row.shownAt !== null);
    if (!inFlight) {
      throw new BadRequestException("No item is waiting for an answer.");
    }
    // Forward-only: an item is locked once submitted, so the only answerable
    // item is the one on screen (ADR 0014).
    if (inFlight.id !== input.itemInstanceId) {
      throw new BadRequestException("That item is no longer open.");
    }

    const shownAt = inFlight.shownAt;
    if (!shownAt) {
      throw new BadRequestException("No item is waiting for an answer.");
    }

    const form = await this.loadFormDefinition(section.formVersionId);
    if (isSpeedFormDefinition(form)) {
      await this.recordSpeedSubmission({
        inFlight,
        form,
        sectionDeadlineAt: section.deadlineAt,
        input,
        receivedAt,
      });
    } else {
      const presentation = parseItemPresentation(
        inFlight.presentation,
        "presentation",
      );
      if (
        input.choiceId !== null &&
        !presentation.choiceOrder.includes(input.choiceId)
      ) {
        throw new BadRequestException("That option was not offered.");
      }

      const classification =
        inFlight.role === "sample"
          ? {
              // Samples are untimed: they teach the format and are never scored.
              code: (input.choiceId === null
                ? "omitted"
                : "answered") as ResponseCode,
              responseTimeMs: receivedAt.getTime() - shownAt.getTime(),
            }
          : classifyResponse({
              choiceId: input.choiceId,
              shownAt,
              deadlineAt:
                section.deadlineAt ??
                new Date(receivedAt.getTime() + SUBMISSION_GRACE_MS),
              itemCeilingMs: formItemCeilingMs(form),
              receivedAt,
            });

      await this.db.insert(batteryResponse).values({
        id: randomUUID(),
        itemInstanceId: inFlight.id,
        code: classification.code,
        choiceId: input.choiceId,
        responseTimeMs: classification.responseTimeMs,
        clientShownAt: input.clientShownAt,
        clientFirstInteractionAt: input.clientFirstInteractionAt,
        clientAnsweredAt: input.clientAnsweredAt,
        serverReceivedAt: receivedAt,
        submittedAt: receivedAt,
        payload: null,
      });

      await this.db
        .update(itemInstance)
        .set({ status: instanceStatusFor(classification.code) })
        .where(eq(itemInstance.id, inFlight.id));
    }

    const remaining = rows.filter((row) => row.id !== inFlight.id);
    if (remaining.length === 0) {
      await this.closeSection(section.id, "submitted", receivedAt);
      await this.completeSessionIfDone(sessionId);
    }

    return this.readState(userId, sessionId);
  }

  async logQualityEvent(
    userId: string,
    sessionId: string,
    input: QualityEventInput,
  ) {
    const session = await this.loadOwnedSession(userId, sessionId);
    if (!isClientQualityEventKind(input.kind)) {
      throw new BadRequestException("Unknown quality event.");
    }

    const now = new Date();
    const reported = input.occurredAt?.getTime();
    // A client clock cannot move the event outside the session's own window.
    const occurredAt =
      reported !== undefined &&
      Number.isFinite(reported) &&
      reported >= session.session.startedAt.getTime() &&
      reported <= now.getTime()
        ? new Date(reported)
        : now;

    const section = await this.activeSection(sessionId);

    await this.db.insert(qualityEvent).values({
      id: randomUUID(),
      sessionId,
      sectionInstanceId: section?.id ?? null,
      kind: input.kind,
      payload: input.payload === undefined ? null : input.payload,
      occurredAt,
      recordedAt: now,
    });

    return { recorded: true as const };
  }

  private async loadBatteryVersion(slug: string) {
    const rows = await this.db
      .select({ battery, version: batteryVersion })
      .from(battery)
      .innerJoin(batteryVersion, eq(batteryVersion.batteryId, battery.id))
      .where(eq(battery.slug, slug))
      .orderBy(desc(batteryVersion.version));

    if (rows.length === 0) {
      throw new NotFoundException("Battery not found.");
    }

    const published = rows.find((row) => row.version.status === "published");
    const chosen = published ?? rows[0];
    if (!chosen) {
      throw new NotFoundException("Battery not found.");
    }

    return {
      battery: chosen.battery,
      version: chosen.version,
      definition: parseBatteryDefinition(
        chosen.version.definition,
        `battery ${slug}`,
      ),
      // A draft composition can still be taken, but only as practice, so
      // pre-release trials never reach the norming sample.
      practiceOnly: published === undefined,
    };
  }

  private async loadOwnedSession(userId: string, sessionId: string) {
    const rows = await this.db
      .select({
        session: batterySession,
        version: batteryVersion,
        batteryRow: battery,
      })
      .from(batterySession)
      .innerJoin(
        batteryVersion,
        eq(batteryVersion.id, batterySession.batteryVersionId),
      )
      .innerJoin(battery, eq(battery.id, batteryVersion.batteryId))
      .where(
        and(
          eq(batterySession.id, sessionId),
          eq(batterySession.userId, userId),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new NotFoundException("Session not found.");
    }
    return row;
  }

  private async loadSections(sessionId: string) {
    return this.db
      .select()
      .from(sectionInstance)
      .where(eq(sectionInstance.sessionId, sessionId))
      .orderBy(asc(sectionInstance.position));
  }

  private async activeSection(sessionId: string) {
    const rows = await this.db
      .select()
      .from(sectionInstance)
      .where(
        and(
          eq(sectionInstance.sessionId, sessionId),
          eq(sectionInstance.status, "in_progress"),
        ),
      )
      .orderBy(asc(sectionInstance.position))
      .limit(1);
    return rows[0] ?? null;
  }

  private async loadFormDefinition(
    formVersionId: string,
  ): Promise<AdministeredForm> {
    const rows = await this.db
      .select({ definition: subtestFormVersion.definition })
      .from(subtestFormVersion)
      .where(eq(subtestFormVersion.id, formVersionId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new NotFoundException("Subtest form not found.");
    }
    return parseAdministeredForm(row.definition, formVersionId);
  }

  private async materializeItems(
    sectionInstanceId: string,
    form: AdministeredForm,
  ) {
    const ordered: Array<{ revisionId: string; role: ItemRole }> = [
      ...form.sampleItemRevisionIds.map((revisionId) => ({
        revisionId,
        role: "sample" as const,
      })),
      ...form.itemRevisionIds.map((revisionId) => ({
        revisionId,
        role: "scored" as const,
      })),
    ];

    const contents = await this.loadItemContents(
      ordered.map((entry) => entry.revisionId),
    );

    await this.db.insert(itemInstance).values(
      ordered.map((entry, index) => {
        const content = contents.get(entry.revisionId);
        if (!content) {
          throw new NotFoundException(
            `Item revision ${entry.revisionId} is missing.`,
          );
        }
        if (isSpanTrialContent(content)) {
          throw new BadRequestException(
            "Working-memory span trials are defined but not administered yet.",
          );
        }
        return {
          id: randomUUID(),
          sectionInstanceId,
          itemRevisionId: entry.revisionId,
          position: index + 1,
          role: entry.role,
          // Stored because a choice id means nothing without the order the
          // examinee saw, and positional bias is measured over it (ADR 0017).
          presentation: isSpeedTrialContent(content)
            ? buildSpeedPresentation()
            : buildItemPresentation(content, Math.random),
          itemFamilyId: null,
          generatorVersion: null,
          seed: null,
          parameters: null,
          shownAt: null,
          status: "pending" as const,
        };
      }),
    );
  }

  private async loadItemContents(revisionIds: string[]) {
    if (revisionIds.length === 0) {
      return new Map<string, AdministeredItemContent>();
    }
    const rows = await this.db
      .select({ id: itemRevision.id, content: itemRevision.content })
      .from(itemRevision)
      .where(inArray(itemRevision.id, revisionIds));

    return new Map(
      rows.map((row) => [
        row.id,
        parseAdministeredItemContent(row.content, row.id),
      ]),
    );
  }

  private async loadPublishedRules() {
    const rows = await this.db
      .select()
      .from(qualityRuleVersion)
      .where(eq(qualityRuleVersion.status, "published"))
      .orderBy(desc(qualityRuleVersion.version))
      .limit(1);

    const row = rows[0];
    if (!row) {
      // Without published rules nothing can be judged, and guessing would put
      // unjudged sections into the norming sample.
      throw new InternalServerErrorException(
        "No published quality rule set is available.",
      );
    }

    return {
      id: row.id,
      definition: parseQualityRuleSetDefinition(row.definition, row.id),
    };
  }

  private async resolveEligibility(
    domain: BatteryDomain,
    covariates: {
      isPracticeMode: boolean;
      deviceClass: DeviceClass;
      viewportWidth: number | null;
      viewportHeight: number | null;
    },
  ) {
    const { id, definition } = await this.loadPublishedRules();
    const resolved = resolveSectionEligibility(definition, domain, {
      deviceClass: covariates.deviceClass,
      viewportWidth: covariates.viewportWidth,
      viewportHeight: covariates.viewportHeight,
    });

    return {
      ruleVersionId: id,
      observations: resolved.observations,
      // Practice never feeds norms, whatever the device says.
      normEligible: covariates.isPracticeMode ? false : resolved.normEligible,
    };
  }

  private async closeSectionsPastDeadline(sessionId: string) {
    const section = await this.activeSection(sessionId);
    if (!section?.deadlineAt) {
      return;
    }
    const now = new Date();
    if (now.getTime() <= section.deadlineAt.getTime() + SUBMISSION_GRACE_MS) {
      return;
    }

    const pending = await this.db
      .select()
      .from(itemInstance)
      .where(
        and(
          eq(itemInstance.sectionInstanceId, section.id),
          eq(itemInstance.status, "pending"),
        ),
      );

    for (const row of pending) {
      if (row.shownAt) {
        // Shown but unanswered when the clock ran out: the item was reached.
        await this.db.insert(batteryResponse).values({
          id: randomUUID(),
          itemInstanceId: row.id,
          code: "timed_out",
          choiceId: null,
          responseTimeMs:
            section.deadlineAt.getTime() - row.shownAt.getTime() || null,
          clientShownAt: null,
          clientFirstInteractionAt: null,
          clientAnsweredAt: null,
          serverReceivedAt: now,
          submittedAt: now,
          payload: null,
        });
        await this.db
          .update(itemInstance)
          .set({ status: "timed_out" })
          .where(eq(itemInstance.id, row.id));
        continue;
      }
      // Never presented, so it cannot count as an attempt (ADR 0016).
      await this.db
        .update(itemInstance)
        .set({ status: "not_reached" })
        .where(eq(itemInstance.id, row.id));
    }

    await this.db.insert(qualityEvent).values({
      id: randomUUID(),
      sessionId,
      sectionInstanceId: section.id,
      kind: "section_expired",
      payload: { notReached: pending.filter((row) => !row.shownAt).length },
      occurredAt: section.deadlineAt,
      recordedAt: now,
    });

    await this.closeSection(section.id, "expired", now);
    await this.completeSessionIfDone(sessionId);
  }

  private async closeSection(
    sectionInstanceId: string,
    status: "submitted" | "expired",
    at: Date,
  ) {
    await this.db
      .update(sectionInstance)
      .set({ status, submittedAt: at })
      .where(eq(sectionInstance.id, sectionInstanceId));
    // Written now, serialized only after the session closes (ADR 0016).
    await this.persistSectionScore(sectionInstanceId);
  }

  private async completeSessionIfDone(sessionId: string) {
    const sections = await this.loadSections(sessionId);
    const open = sections.some(
      (section) =>
        section.status === "pending" || section.status === "in_progress",
    );
    if (open) {
      return;
    }
    await this.db
      .update(batterySession)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(batterySession.id, sessionId));
    await this.persistBatteryScore(sessionId);
  }

  private async readState(userId: string, sessionId: string) {
    const owned = await this.loadOwnedSession(userId, sessionId);
    const sections = await this.loadSections(sessionId);
    const session = owned.session;

    const sectionStates = [];
    for (const section of sections) {
      const form = await this.loadFormDefinition(section.formVersionId);
      const counts = await this.db
        .select({ role: itemInstance.role, status: itemInstance.status })
        .from(itemInstance)
        .where(eq(itemInstance.sectionInstanceId, section.id));
      const scored = counts.filter((row) => row.role === "scored");

      sectionStates.push({
        position: section.position,
        domain: section.domain,
        status: section.status,
        normEligible: section.deviceNormEligible,
        ruleVersionId: section.ruleVersionId,
        observations: section.eligibilityObservations,
        deadlineAt: section.deadlineAt,
        // Planned counts come from the form, because a pending section has
        // no item rows yet and the intro still has to say how long it is.
        scoredItemCount: form.itemRevisionIds.length,
        sampleItemCount: form.sampleItemRevisionIds.length,
        sectionTimeLimitMs: formSectionTimeLimitMs(form),
        completedItemCount: scored.filter((row) => row.status !== "pending")
          .length,
      });
    }

    return {
      id: session.id,
      status: session.status,
      batterySlug: owned.batteryRow.slug,
      batteryTitle: owned.batteryRow.title,
      batteryVersion: owned.version.version,
      isPracticeMode: session.isPracticeMode,
      administrationContext:
        session.administrationContext as AdministrationContext,
      attemptNumber: session.attemptNumber,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      sections: sectionStates,
      current: await this.readCurrentItem(sessionId),
      // Deadlines are absolute server times, so a client with a skewed clock
      // needs this to render a countdown that matches the real one.
      serverTime: new Date(),
      // A section may already have a snapshot; the examinee does not see it
      // until every section is closed (ADR 0016).
      report:
        session.status === "completed"
          ? await this.readCompletedReport(sessionId)
          : null,
    };
  }

  /**
   * Number correct on scored items only. Samples teach the format and never
   * enter the denominator.
   */
  private async persistSectionScore(sectionInstanceId: string) {
    const rows = await this.db
      .select()
      .from(sectionInstance)
      .where(eq(sectionInstance.id, sectionInstanceId))
      .limit(1);
    const section = rows[0];
    if (!section) {
      return;
    }
    if (section.status !== "submitted" && section.status !== "expired") {
      return;
    }
    if (section.domain === "gs") {
      await this.persistSpeedSectionScore(section);
      return;
    }
    if (!isPowerDomain(section.domain)) {
      return;
    }

    const form = await this.loadFormDefinition(section.formVersionId);
    const instances = await this.db
      .select()
      .from(itemInstance)
      .where(eq(itemInstance.sectionInstanceId, section.id))
      .orderBy(asc(itemInstance.position));
    const scored = instances.filter((row) => row.role === "scored");
    const contents = await this.loadItemContents(
      scored.map((row) => row.itemRevisionId),
    );
    const responses =
      scored.length === 0
        ? []
        : await this.db
            .select()
            .from(batteryResponse)
            .where(
              inArray(
                batteryResponse.itemInstanceId,
                scored.map((row) => row.id),
              ),
            );
    const byItem = new Map(responses.map((row) => [row.itemInstanceId, row]));

    const records: PowerItemRecord[] = scored.map((row) => {
      const content = contents.get(row.itemRevisionId);
      if (
        !content ||
        isSpeedTrialContent(content) ||
        isSpanTrialContent(content)
      ) {
        throw new NotFoundException(
          `Item revision ${row.itemRevisionId} is missing.`,
        );
      }
      const response = byItem.get(row.id);
      const code = (response?.code ?? "not_reached") as ItemOutcome;
      return {
        itemRevisionId: row.itemRevisionId,
        content,
        code,
        choiceId: response?.choiceId ?? null,
        responseTimeMs: response?.responseTimeMs ?? null,
      };
    });

    const score = scoreAccuracyPower(section.domain, records);
    const digest = hashCanon(powerSectionInputCanon(records));
    const qualityRulesVersion = section.ruleVersionId ?? VERSION_PIN_NONE;

    const existing = await this.db
      .select({ id: sectionScore.id })
      .from(sectionScore)
      .where(
        and(
          eq(sectionScore.sectionInstanceId, section.id),
          eq(sectionScore.scoringModel, form.scoringModel),
          eq(sectionScore.qualityRulesVersion, qualityRulesVersion),
          eq(sectionScore.normsVersionId, VERSION_PIN_NONE),
        ),
      )
      .limit(1);
    if (existing[0]) {
      return;
    }

    await this.db.insert(sectionScore).values({
      id: randomUUID(),
      sectionInstanceId: section.id,
      scoringModel: form.scoringModel,
      qualityRulesVersion,
      normsVersionId: VERSION_PIN_NONE,
      inputDigest: digest,
      payload: {
        ...toBatterySectionReport(
          {
            domain: section.domain,
            position: section.position,
            status: section.status,
            normEligible: section.deviceNormEligible,
            observations: Array.isArray(section.eligibilityObservations)
              ? section.eligibilityObservations
              : [],
          },
          score,
        ),
        // Item outcomes stay on the snapshot for re-scoring; they are not
        // copied onto the session report the examinee sees.
        items: score.items,
      },
      supersededAt: null,
      createdAt: new Date(),
    });
  }

  private async persistBatteryScore(sessionId: string) {
    const sessions = await this.db
      .select()
      .from(batterySession)
      .where(eq(batterySession.id, sessionId))
      .limit(1);
    const session = sessions[0];
    if (!session) {
      throw new NotFoundException("Session not found.");
    }
    const sections = await this.loadSections(sessionId);
    const reports = [];
    const digests = [];

    for (const section of sections) {
      const rows = await this.db
        .select()
        .from(sectionScore)
        .where(eq(sectionScore.sectionInstanceId, section.id))
        .orderBy(desc(sectionScore.createdAt))
        .limit(1);
      const row = rows[0];
      if (!row) {
        // A closed section without a snapshot is a defect; guessing a total
        // would invent the number the report exists to avoid.
        throw new InternalServerErrorException(
          `Section ${section.position} closed without a score.`,
        );
      }
      digests.push(row.inputDigest);
      reports.push(storedSectionReport(section, row.scoringModel, row.payload));
    }

    const durationMs =
      session.completedAt === null
        ? null
        : session.completedAt.getTime() - session.startedAt.getTime();
    const profile = scoreBatteryProfile({ durationMs, sections: reports });
    const rules = sections[0]?.ruleVersionId ?? VERSION_PIN_NONE;

    const existing = await this.db
      .select({ id: batteryScore.id })
      .from(batteryScore)
      .where(
        and(
          eq(batteryScore.sessionId, sessionId),
          eq(batteryScore.aggregationModel, BATTERY_PROFILE_MODEL),
          eq(batteryScore.qualityRulesVersion, rules),
          eq(batteryScore.normsVersionId, VERSION_PIN_NONE),
        ),
      )
      .limit(1);
    if (existing[0]) {
      return;
    }

    await this.db.insert(batteryScore).values({
      id: randomUUID(),
      sessionId,
      aggregationModel: BATTERY_PROFILE_MODEL,
      qualityRulesVersion: rules,
      normsVersionId: VERSION_PIN_NONE,
      inputDigest: hashCanon(batteryProfileInputCanon(digests)),
      payload: profile,
      supersededAt: null,
      createdAt: new Date(),
    });
  }

  private async readCompletedReport(sessionId: string) {
    const rows = await this.db
      .select({ payload: batteryScore.payload })
      .from(batteryScore)
      .where(eq(batteryScore.sessionId, sessionId))
      .orderBy(desc(batteryScore.createdAt))
      .limit(1);
    return toClientReport(rows[0]?.payload);
  }

  private async readCurrentItem(sessionId: string) {
    const section = await this.activeSection(sessionId);
    if (!section) {
      return null;
    }

    const form = await this.loadFormDefinition(section.formVersionId);
    const rows = await this.db
      .select()
      .from(itemInstance)
      .where(
        and(
          eq(itemInstance.sectionInstanceId, section.id),
          eq(itemInstance.status, "pending"),
        ),
      )
      .orderBy(asc(itemInstance.position));

    const inFlight = rows.find((row) => row.shownAt !== null) ?? null;
    const base = {
      sectionPosition: section.position,
      domain: section.domain,
      deadlineAt: section.deadlineAt,
      itemCeilingMs: formItemCeilingMs(form),
      sectionTimeLimitMs: formSectionTimeLimitMs(form),
      remainingItemCount: rows.length,
    };

    if (!inFlight) {
      return { ...base, item: null };
    }

    const contents = await this.loadItemContents([inFlight.itemRevisionId]);
    const content = contents.get(inFlight.itemRevisionId);
    if (!content) {
      throw new NotFoundException("Item content is missing.");
    }
    if (isSpanTrialContent(content)) {
      throw new BadRequestException(
        "Working-memory span trials are defined but not administered yet.",
      );
    }
    const presentation = parseItemPresentation(
      inFlight.presentation,
      "presentation",
    );

    return {
      ...base,
      item: {
        itemInstanceId: inFlight.id,
        position: inFlight.position,
        role: inFlight.role as ItemRole,
        shownAt: inFlight.shownAt,
        // The key stays on the server (ADR 0015).
        ...(isSpeedTrialContent(content)
          ? toClientSpeedTrial(content)
          : {
              engine: POWER_MCQ_ENGINE,
              ...toClientPowerItem(content, presentation.choiceOrder),
            }),
      },
    };
  }

  private async recordSpeedSubmission(input: {
    inFlight: typeof itemInstance.$inferSelect;
    form: AdministeredForm;
    sectionDeadlineAt: Date | null;
    input: SubmitResponseInput;
    receivedAt: Date;
  }) {
    if (!isSpeedFormDefinition(input.form) || !input.inFlight.shownAt) {
      throw new BadRequestException("That trial is not open.");
    }
    const contents = await this.loadItemContents([
      input.inFlight.itemRevisionId,
    ]);
    const content = contents.get(input.inFlight.itemRevisionId);
    if (!isSpeedTrialContent(content)) {
      throw new NotFoundException("Item content is missing.");
    }

    const authoredIds = content.decisions.map((decision) => decision.id);
    let submissions: ReturnType<typeof parseSpeedDecisionSubmissions> = [];
    try {
      submissions = parseSpeedDecisionSubmissions(
        input.input.decisions ?? [],
        "decisions",
      );
    } catch (cause) {
      throw new BadRequestException(
        cause instanceof Error ? cause.message : "Invalid decisions.",
      );
    }
    for (const row of submissions) {
      if (!authoredIds.includes(row.decisionId)) {
        throw new BadRequestException("That pair was not on this trial.");
      }
    }

    const classification = classifySpeedTrial({
      shownAt: input.inFlight.shownAt,
      receivedAt: input.receivedAt,
      trialTimeLimitMs: input.form.trialTimeLimitMs,
      sectionDeadlineAt: input.sectionDeadlineAt,
      authoredIds,
      submissions,
      allowedChoiceIds: [...SPEED_CHOICES],
      isSample: input.inFlight.role === "sample",
    });

    await this.writeSpeedResponse(
      input.inFlight.id,
      classification.trialCode,
      classification.responseTimeMs,
      classification.decisions,
      input.receivedAt,
      input.input,
    );
  }

  private async writeSpeedResponse(
    itemInstanceId: string,
    trialCode: ResponseCode,
    responseTimeMs: number | null,
    decisions: Array<{
      decisionId: string;
      code: ItemOutcome;
      choiceId: string | null;
    }>,
    at: Date,
    client: Pick<
      SubmitResponseInput,
      "clientShownAt" | "clientFirstInteractionAt" | "clientAnsweredAt"
    > | null,
  ) {
    await this.db.insert(batteryResponse).values({
      id: randomUUID(),
      itemInstanceId,
      code: trialCode,
      choiceId: null,
      responseTimeMs,
      clientShownAt: client?.clientShownAt ?? null,
      clientFirstInteractionAt: client?.clientFirstInteractionAt ?? null,
      clientAnsweredAt: client?.clientAnsweredAt ?? null,
      serverReceivedAt: at,
      submittedAt: at,
      payload: { decisions },
    });
    await this.db
      .update(itemInstance)
      .set({ status: instanceStatusFor(trialCode) })
      .where(eq(itemInstance.id, itemInstanceId));
  }

  private async closeExpiredSpeedTrials(sessionId: string) {
    const section = await this.activeSection(sessionId);
    if (!section) {
      return;
    }
    const form = await this.loadFormDefinition(section.formVersionId);
    if (!isSpeedFormDefinition(form)) {
      return;
    }

    const pending = await this.db
      .select()
      .from(itemInstance)
      .where(
        and(
          eq(itemInstance.sectionInstanceId, section.id),
          eq(itemInstance.status, "pending"),
        ),
      )
      .orderBy(asc(itemInstance.position));
    const inFlight = pending.find((row) => row.shownAt !== null);
    if (!inFlight?.shownAt || inFlight.role === "sample") {
      return;
    }

    const now = new Date();
    if (
      now.getTime() <=
      inFlight.shownAt.getTime() + form.trialTimeLimitMs + SUBMISSION_GRACE_MS
    ) {
      return;
    }

    const contents = await this.loadItemContents([inFlight.itemRevisionId]);
    const content = contents.get(inFlight.itemRevisionId);
    if (!isSpeedTrialContent(content)) {
      return;
    }

    const classification = classifySpeedTrial({
      shownAt: inFlight.shownAt,
      receivedAt: now,
      trialTimeLimitMs: form.trialTimeLimitMs,
      sectionDeadlineAt: section.deadlineAt,
      authoredIds: content.decisions.map((decision) => decision.id),
      submissions: [],
      allowedChoiceIds: [...SPEED_CHOICES],
      isSample: false,
    });
    await this.writeSpeedResponse(
      inFlight.id,
      classification.trialCode,
      classification.responseTimeMs,
      classification.decisions,
      now,
      null,
    );

    if (pending.every((row) => row.id === inFlight.id)) {
      await this.closeSection(section.id, "submitted", now);
      await this.completeSessionIfDone(sessionId);
    }
  }

  private async persistSpeedSectionScore(section: {
    id: string;
    domain: string;
    position: number;
    status: "submitted" | "expired" | string;
    formVersionId: string;
    deviceNormEligible: boolean;
    ruleVersionId: string | null;
    eligibilityObservations: unknown;
  }) {
    if (section.status !== "submitted" && section.status !== "expired") {
      return;
    }
    const form = await this.loadFormDefinition(section.formVersionId);
    const instances = await this.db
      .select()
      .from(itemInstance)
      .where(eq(itemInstance.sectionInstanceId, section.id))
      .orderBy(asc(itemInstance.position));
    const scored = instances.filter((row) => row.role === "scored");
    const contents = await this.loadItemContents(
      scored.map((row) => row.itemRevisionId),
    );
    const responses =
      scored.length === 0
        ? []
        : await this.db
            .select()
            .from(batteryResponse)
            .where(
              inArray(
                batteryResponse.itemInstanceId,
                scored.map((row) => row.id),
              ),
            );
    const byItem = new Map(responses.map((row) => [row.itemInstanceId, row]));

    const records: SpeedTrialRecord[] = scored.map((row) => {
      const content = contents.get(row.itemRevisionId);
      if (!isSpeedTrialContent(content)) {
        throw new NotFoundException(
          `Item revision ${row.itemRevisionId} is missing.`,
        );
      }
      const response = byItem.get(row.id);
      return {
        itemRevisionId: row.itemRevisionId,
        content,
        decisions: speedDecisionsFromPayload(
          content.decisions.map((decision) => decision.id),
          response?.payload,
          response ? "timed_out" : "not_reached",
        ),
      };
    });

    const score = scoreSpeedCorrected(records);
    const digest = hashCanon(speedSectionInputCanon(records));
    const qualityRulesVersion = section.ruleVersionId ?? VERSION_PIN_NONE;
    const existing = await this.db
      .select({ id: sectionScore.id })
      .from(sectionScore)
      .where(
        and(
          eq(sectionScore.sectionInstanceId, section.id),
          eq(sectionScore.scoringModel, form.scoringModel),
          eq(sectionScore.qualityRulesVersion, qualityRulesVersion),
          eq(sectionScore.normsVersionId, VERSION_PIN_NONE),
        ),
      )
      .limit(1);
    if (existing[0]) {
      return;
    }

    const authoredDecisionCount = records.reduce(
      (sum, record) => sum + record.content.decisions.length,
      0,
    );

    await this.db.insert(sectionScore).values({
      id: randomUUID(),
      sectionInstanceId: section.id,
      scoringModel: form.scoringModel,
      qualityRulesVersion,
      normsVersionId: VERSION_PIN_NONE,
      inputDigest: digest,
      payload: {
        ...toSpeedSectionReport(
          {
            domain: "gs",
            position: section.position,
            status: section.status === "expired" ? "expired" : "submitted",
            normEligible: section.deviceNormEligible,
            observations: Array.isArray(section.eligibilityObservations)
              ? section.eligibilityObservations
              : [],
          },
          score,
          authoredDecisionCount,
        ),
        trials: score.trials,
      },
      supersededAt: null,
      createdAt: new Date(),
    });
  }
}

function speedDecisionsFromPayload(
  authoredIds: string[],
  payload: unknown,
  fallback: ItemOutcome,
) {
  const body = payload && typeof payload === "object" ? payload : {};
  const listed =
    "decisions" in body && Array.isArray(body.decisions) ? body.decisions : [];
  return authoredIds.map((decisionId) => {
    const row = listed.find(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        "decisionId" in entry &&
        entry.decisionId === decisionId,
    ) as { code?: unknown; choiceId?: unknown } | undefined;
    const code =
      typeof row?.code === "string" ? (row.code as ItemOutcome) : fallback;
    const choiceId = typeof row?.choiceId === "string" ? row.choiceId : null;
    return { decisionId, code, choiceId };
  });
}

/**
 * `post_deadline` has no lifecycle state of its own: the section clock is why
 * the item closed. The exact code stays on the response row, which is what
 * scoring reads (ADR 0016).
 */
function toClientReport(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const profile = payload as BatteryProfileScore;
  if (!Array.isArray(profile.sections)) {
    return null;
  }
  return {
    maturity: profile.maturity,
    durationMs: profile.durationMs,
    composite: profile.composite,
    estimatedIq: profile.estimatedIq,
    percentile: profile.percentile,
    interval: profile.interval,
    sections: profile.sections,
  };
}

function storedSectionReport(
  section: {
    domain: string;
    position: number;
    status: string;
    deviceNormEligible: boolean;
  },
  scoringModel: string,
  payload: unknown,
): BatterySectionReport {
  const body = payload && typeof payload === "object" ? payload : {};
  const raw = "raw" in body && typeof body.raw === "number" ? body.raw : 0;
  const max = "max" in body && typeof body.max === "number" ? body.max : 0;
  const attempted =
    "attempted" in body && typeof body.attempted === "number"
      ? body.attempted
      : 0;
  const accuracyOnAttempted =
    "accuracyOnAttempted" in body &&
    (typeof body.accuracyOnAttempted === "number" ||
      body.accuracyOnAttempted === null)
      ? body.accuracyOnAttempted
      : null;
  const count = (key: string) =>
    key in body && typeof (body as Record<string, unknown>)[key] === "number"
      ? ((body as Record<string, number>)[key] ?? 0)
      : 0;
  const observations =
    "observations" in body && Array.isArray(body.observations)
      ? body.observations
      : [];
  return {
    domain: section.domain as BatteryDomain,
    position: section.position,
    scoringModel,
    status: section.status === "expired" ? "expired" : "submitted",
    normEligible: section.deviceNormEligible,
    raw,
    max,
    attempted,
    accuracyOnAttempted,
    omitted: count("omitted"),
    timedOut: count("timedOut"),
    notReached: count("notReached"),
    observations,
  };
}

function hashCanon(canon: string) {
  return createHash("sha256").update(canon).digest("hex");
}

function instanceStatusFor(code: ResponseCode) {
  if (code === "answered") {
    return "answered" as const;
  }
  if (code === "omitted") {
    return "omitted" as const;
  }
  return "timed_out" as const;
}
