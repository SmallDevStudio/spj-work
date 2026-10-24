import { z } from "zod";

export const appSettingsSchema = z.object({
  notifications: z.object({ email: z.boolean(), line: z.boolean() }).strict(),
}).strict();
