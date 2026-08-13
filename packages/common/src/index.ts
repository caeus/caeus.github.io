import { oc } from "@orpc/contract";
import { z } from "zod";

export const contract = oc.router({
  ping: oc
    .input(z.object({ message: z.string() }))
    .output(z.object({ echo: z.string() })),
});

export type Contract = typeof contract;
