import { z } from "zod";

export const mapHintsSchema = z
  .object({
    framework: z.string().min(1).optional(),
    byaEnabled: z.boolean().optional(),
    localeCount: z.number().int().min(1).max(100).optional(),
  })
  .strict();

export const mapConfigSchema = z
  .object({
    displayName: z.string().min(1).max(200),
    canonicalUrl: z.string().min(1),
    siteId: z.string().uuid().optional(),
    hints: mapHintsSchema.optional(),
  })
  .strict();

export type MapConfig = z.infer<typeof mapConfigSchema>;

export const engawaPackagesSchema = z
  .object({
    "@thierry-gilgen-ict/engawa-core": z.string().min(1),
    "@thierry-gilgen-ict/engawa-discovery": z.string().min(1),
    "@thierry-gilgen-ict/engawa-mcp": z.string().min(1),
    "@thierry-gilgen-ict/engawa-react": z.string().min(1),
  })
  .strict();

export type EngawaPackages = z.infer<typeof engawaPackagesSchema>;

export const registrationPayloadSchema = z
  .object({
    displayName: z.string().min(1),
    canonicalUrl: z.string().min(1),
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
    displayName: z.string(),
    canonicalUrl: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type StatusResponse = z.infer<typeof statusResponseSchema>;

export const errorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.string(),
        message: z.string(),
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
