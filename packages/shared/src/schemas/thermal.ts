import { z } from "zod";

export const ThermalZoneSchema = z.object({
  name: z.string(),
  celsius: z.number(),
});

export type ThermalZone = z.infer<typeof ThermalZoneSchema>;
