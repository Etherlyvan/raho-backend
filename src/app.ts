import "dotenv/config";
import express        from "express";
import cors           from "cors";
import helmet         from "helmet";
import compression    from "compression";
import cookieParser   from "cookie-parser";
import morgan         from "morgan";
import rateLimit      from "express-rate-limit";

import { env }          from "./config/env";
import { logger }       from "./utils/logger";
import { errorHandler } from "./middleware/errorHandler";
import { prisma }       from "./lib/prisma";

// ─── Routers ─────────────────────────────────────────────────
import authRoutes         from "./modules/auth/auth.routes";
import branchRoutes       from "./modules/branch/branch.routes";
import userRoutes         from "./modules/user/user.routes";
import memberRoutes       from "./modules/member/member.routes";
import branchAccessRoutes from "./modules/branch-access/branch-access.routes";
import memberPackageRoutes from "./modules/member-package/member-package.routes";
import encounterRoutes from './modules/encounter/encounter.routes';
import treatmentSessionRoutes from './modules/treatment-session/treatment-session.routes';
import inventoryRoutes    from './modules/inventory/inventory.routes';
import stockRequestRoutes from './modules/stock-request/stock-request.routes';
import invoiceRoutes from './modules/invoice/invoice.routes';
import notificationRoutes from './modules/notification/notification.routes';
import chatRoutes        from './modules/chat/chat.routes';

const app = express();

// ─── Security ────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin:         env.CORS_ORIGIN,
    credentials:    true,
    methods:        ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Rate Limiting ────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { success: false, message: "Terlalu banyak request. Coba lagi nanti." },
});

const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { success: false, message: "Terlalu banyak percobaan login. Coba lagi nanti." },
});

app.use(globalLimiter);

// ─── General Middleware ───────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// ─── Health Check ─────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    success:     true,
    message:     "RAHO API is running",
    environment: env.NODE_ENV,
    timestamp:   new Date().toISOString(),
  });
});

// ─── Routes ───────────────────────────────────────────────────
app.use(`${env.API_PREFIX}/auth`,          authLimiter, authRoutes);   // Sprint 1
app.use(`${env.API_PREFIX}/branches`,      branchRoutes);              // Sprint 2
app.use(`${env.API_PREFIX}/users`,         userRoutes);                // Sprint 2
app.use(`${env.API_PREFIX}/members`,       memberRoutes);              // Sprint 3
app.use(`${env.API_PREFIX}/branch-access`, branchAccessRoutes);        // Sprint 3
app.use(`${env.API_PREFIX}/members/:memberId/packages`, memberPackageRoutes); // Sprint 4
app.use(`${env.API_PREFIX}encounters`, encounterRoutes); // Sprint 5
app.use(`${env.API_PREFIX}treatment-sessions`, treatmentSessionRoutes); // Sprint 6
app.use(`${env.API_PREFIX}inventory`,       inventoryRoutes);// Sprint 8
app.use(`${env.API_PREFIX}stock-requests`,  stockRequestRoutes);// Sprint 8
app.use(`${env.API_PREFIX}invoices`, invoiceRoutes);// Sprint 9
app.use(`${env.API_PREFIX}notifications`, notificationRoutes);// Sprint 10
app.use(`${env.API_PREFIX}chatrooms`,     chatRoutes);// Sprint 10
// ─── 404 Handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Endpoint tidak ditemukan" });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────
const server = app.listen(env.PORT, async () => {
  try {
    await prisma.$connect();
    logger.info(`Database connected`);
    logger.info(`Server running  -> http://localhost:${env.PORT}`);
    logger.info(`Health check    -> http://localhost:${env.PORT}/health`);
    logger.info(`Environment     -> ${env.NODE_ENV}`);
  } catch (err) {
    logger.error("Database connection failed", err);
    process.exit(1);
  }
});

// ─── Graceful Shutdown ────────────────────────────────────────
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Server closed.");
    process.exit(0);
  });
});

export default app;
