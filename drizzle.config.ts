import type { Config } from 'drizzle-kit';

export default {
  schema: './src/database/schemas/index.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;
