// src/app/sse/sseManager.ts
import { Response } from "express";
import redisClient from "src/config/redis.config";

const clients = new Map<string, Response>();

export function addClient(jobId: string, res: Response) {
    clients.set(jobId, res);
}

export function removeClient(jobId: string) {
    clients.delete(jobId);
}

export function getClient(jobId: string) {
    return clients.get(jobId);
}