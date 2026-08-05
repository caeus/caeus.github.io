import type { Os, PartialRouter } from "#orpc/index.js";

export function pingController(os: Os): PartialRouter {
  return {
    ping: os.ping.handler(async ({ input }) => ({
      echo: input.message,
    })),
  };
}
