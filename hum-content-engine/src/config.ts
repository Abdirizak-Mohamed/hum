export type ContentEngineConfig = {
  models: {
    planning: string;
    copy: string;
  };
  storage: {
    basePath: string;
  };
  concurrency: {
    mediaGeneration: number;
    copyGeneration: number;
    clientProcessing: number;
  };
  dryRun?: boolean;
  cron?: {
    schedule: string;
  };
};

export const defaultConfig: ContentEngineConfig = {
  models: {
    planning: 'gpt-4o',
    copy: 'gpt-4o-mini',
  },
  storage: {
    basePath: './media',
  },
  concurrency: {
    mediaGeneration: 3,
    copyGeneration: 5,
    clientProcessing: 2,
  },
  cron: {
    schedule: '0 2 * * 0',
  },
};
