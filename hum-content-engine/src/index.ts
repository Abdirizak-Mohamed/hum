// Core pipeline
export { runPipeline, type PipelineResult, type PipelineError } from './pipeline/orchestrator.js';

// Pipeline steps (for advanced usage)
export { planCalendar, type PlannedPost, type ContentCalendar } from './pipeline/plan-calendar.js';
export { generateMedia, type GeneratedMedia } from './pipeline/generate-media.js';
export { generateCopy, type GeneratedCopy } from './pipeline/generate-copy.js';
export { composePosts, type ComposedPost } from './pipeline/compose-posts.js';
export { schedulePosts } from './pipeline/schedule-posts.js';

// Storage
export { type StorageClient } from './storage/types.js';
export { LocalStorageClient } from './storage/local.js';
export { S3StorageClient } from './storage/s3.js';

// Config
export { type ContentEngineConfig, defaultConfig } from './config.js';

// Scheduler
export { startScheduler } from './scheduler.js';
