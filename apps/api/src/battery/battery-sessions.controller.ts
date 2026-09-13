import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import type { SessionUser } from "../auth/session-user";
import { BatteryService } from "./battery.service";

function optionalDate(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function optionalInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

@Controller("battery/sessions")
export class BatterySessionsController {
  constructor(
    @Inject(BatteryService) private readonly battery: BatteryService,
  ) {}

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.battery.listForUser(user.id);
  }

  @Post()
  start(
    @CurrentUser() user: SessionUser,
    @Body()
    body: {
      batterySlug?: string;
      deviceClass?: string;
      inputMode?: string;
      viewportWidth?: number;
      viewportHeight?: number;
      locale?: string;
    },
  ) {
    return this.battery.start(user.id, {
      batterySlug: String(body.batterySlug ?? ""),
      deviceClass: String(body.deviceClass ?? "unknown"),
      inputMode: String(body.inputMode ?? "other"),
      viewportWidth: optionalInteger(body.viewportWidth),
      viewportHeight: optionalInteger(body.viewportHeight),
      locale: String(body.locale ?? "en"),
    });
  }

  @Get(":id")
  get(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.battery.getForUser(user.id, id);
  }

  @Post(":id/sections/:position/start")
  startSection(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Param("position") position: string,
  ) {
    return this.battery.startSection(user.id, id, Number(position));
  }

  @Post(":id/items/next")
  next(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.battery.serveNextItem(user.id, id);
  }

  @Post(":id/responses")
  respond(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body()
    body: {
      itemInstanceId?: string;
      choiceId?: string | null;
      clientShownAt?: string;
      clientFirstInteractionAt?: string;
      clientAnsweredAt?: string;
    },
  ) {
    return this.battery.submitResponse(user.id, id, {
      itemInstanceId: String(body.itemInstanceId ?? ""),
      choiceId:
        typeof body.choiceId === "string" && body.choiceId.length > 0
          ? body.choiceId
          : null,
      clientShownAt: optionalDate(body.clientShownAt),
      clientFirstInteractionAt: optionalDate(body.clientFirstInteractionAt),
      clientAnsweredAt: optionalDate(body.clientAnsweredAt),
    });
  }

  @Post(":id/quality-events")
  logEvent(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body() body: { kind?: string; occurredAt?: string; payload?: unknown },
  ) {
    return this.battery.logQualityEvent(user.id, id, {
      kind: String(body.kind ?? ""),
      occurredAt: optionalDate(body.occurredAt),
      payload: body.payload,
    });
  }
}
