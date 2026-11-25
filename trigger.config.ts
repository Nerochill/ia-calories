import { defineConfig } from '@trigger.dev/sdk';

export default defineConfig({
  // Your Trigger.dev project ref (dashboard → Project settings), e.g. "proj_abc123".
  project: process.env.TRIGGER_PROJECT_REF ?? '<your-trigger-project-ref>',
  dirs: ['./src/trigger'],
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: { maxAttempts: 3, factor: 2, minTimeoutInMs: 1000, maxTimeoutInMs: 10_000, randomize: true },
  },
});
