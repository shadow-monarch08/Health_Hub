// src/app/sse/sseManager.ts
import { Response } from "express";

const clients = new Map<string, Response>();

export function addClient(jobId: string, res: Response) {
    clients.set(jobId, res);
}

export function removeClient(jobId: string) {
    clients.delete(jobId);
}

export function sendEvent(jobId: string, event: string, resource: string) {
    const res = clients.get(jobId);
    if (!res) return;

    const data = JSON.stringify({ event, resource });
    res.write(`data: ${data}\n\n`);
}
