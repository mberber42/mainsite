import type { RequestHandler } from 'express';

export interface CmsMiddleware extends RequestHandler {
  initialize(): Promise<unknown>;
  close(): Promise<void>;
}

export function createCmsMiddleware(options?: Record<string, unknown>): CmsMiddleware;
export function assertCmsEnvironment(): Promise<void>;
