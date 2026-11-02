import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import routes from './routes';
import { notFound, errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { csrfGuard } from './middleware/csrf';
import { allowedOrigins } from './config/auth';

const app: Application = express();

// Number of reverse proxies in front of this app. It decides which entry of
// X-Forwarded-For is treated as the client IP, which the rate limiters key on.
// Too low behind extra proxies => every visitor shares one IP (and one limit);
// too high => clients can spoof their IP. See docs/DEPLOYMENT.md.
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 1);
app.set('trust proxy', Number.isInteger(trustProxyHops) && trustProxyHops >= 0 ? trustProxyHops : 1);

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-Requested-With'],
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(mongoSanitize());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// csrfGuard needs the parsed cookies, so it sits after cookieParser and in front of every route.
app.use('/api', apiLimiter, csrfGuard, routes);

app.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

app.use(notFound);
app.use(errorHandler);

export default app;
