import { z } from "zod";
import {
  FROZEN_ERROR_CODES,
  MAX_CANONICAL_URL_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_ERROR_MESSAGE_LENGTH,
} from "./constants.js";

export const mapHintsSchema = z
  .object({
    framework: z.string().min(1).max(100).optional(),
    byaEnabled: z.boolean().optional(),
    localeCount: z.number().int().min(1).max(100).optional(),
  })
  .strict();

export const mapConfigSchema = z
  .object({
    displayName: z.string().min(1).max(MAX_DISPLAY_NAME_LENGTH),
    canonicalUrl: z.string().min(1).max(MAX_CANONICAL_URL_LENGTH),
    siteId: z.string().uuid().optional(),
    hints: mapHintsSchema.optional(),
  })
  .strict();

export type MapConfig = z.infer<typeof mapConfigSchema>;

export const engawaPackagesSchema = z
  .object({
    "@thierry-gilgen-ict/engawa-core": z.string().min(1),
    "@thierry-gilgen-ict/engawa-discovery": z.string().min(1).optional(),
    "@thierry-gilgen-ict/engawa-mcp": z.string().min(1).optional(),
    "@thierry-gilgen-ict/engawa-react": z.string().min(1).optional(),
  })
  .strict();

export type EngawaPackages = z.infer<typeof engawaPackagesSchema>;

export const registrationPayloadSchema = z
  .object({
    displayName: z.string().min(1).max(MAX_DISPLAY_NAME_LENGTH),
    canonicalUrl: z.string().min(1).max(MAX_CANONICAL_URL_LENGTH),
    packages: engawaPackagesSchema,
    hints: mapHintsSchema.optional(),
  })
  .strict();

export type RegistrationPayload = z.infer<typeof registrationPayloadSchema>;

export const siteStateSchema = z.enum(["PENDING", "LISTED", "DELISTED"]);

export const registerResponseSchema = z
  .object({
    siteId: z.string().uuid(),
    state: z.literal("PENDING"),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type RegisterResponse = z.infer<typeof registerResponseSchema>;

export const statusResponseSchema = z
  .object({
    siteId: z.string().uuid(),
    state: siteStateSchema,
    displayName: z.string().min(1).max(MAX_DISPLAY_NAME_LENGTH),
    canonicalUrl: z.string().min(1).max(MAX_CANONICAL_URL_LENGTH),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type StatusResponse = z.infer<typeof statusResponseSchema>;

export const frozenErrorCodeSchema = z.enum(FROZEN_ERROR_CODES);

export const errorResponseSchema = z
  .object({
    error: z
      .object({
        code: frozenErrorCodeSchema,
        message: z.string().min(1).max(MAX_ERROR_MESSAGE_LENGTH),
      })
      .strict(),
  })
  .strict();

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export const pendingRegistrationSchema = z
  .object({
    state: z.literal("pending-request"),
    canonicalUrl: z.string().min(1),
    idempotencyKey: z.string().uuid(),
    siteToken: z.string().min(1),
    payloadHash: z.string().min(1),
  })
  .strict();

export const registeredStateSchema = z
  .object({
    state: z.literal("registered"),
    siteId: z.string().uuid(),
    canonicalUrl: z.string().min(1),
    siteToken: z.string().min(1),
  })
  .strict();

export const localStateSchema = z
  .object({
    registration: z.union([pendingRegistrationSchema, registeredStateSchema]),
  })
  .strict();

export type LocalState = z.infer<typeof localStateSchema>;
export type PendingRegistration = z.infer<typeof pendingRegistrationSchema>;
export type RegisteredState = z.infer<typeof registeredStateSchema>;
