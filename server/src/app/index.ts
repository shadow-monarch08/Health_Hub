import { env } from '../config/environment.config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import hpp from 'hpp';
import requestLogger from './middleware/requestLogger';
import { startSseSubscriber } from './sse/sseSubscriber';

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({
    origin: env.FRONTEND_ORIGIN, // your frontend
    credentials: true
}));
app.use(hpp());

// General Middleware
app.use(compression());
app.use(express.json());
app.use(requestLogger);

startSseSubscriber();

// Routes
import authRoutes from './routes/auth.routes';
import oAuthRoutes from './routes/OAuth.routes';
import ehrRoutes from './routes/EHR.routes';
import profileRoutes from './routes/profile.routes';

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/OAuth', oAuthRoutes);
app.use('/api/v1/ehr', ehrRoutes);
app.use('/api/v1/profiles', profileRoutes);


// Health Check
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
    });
});

export default app;
