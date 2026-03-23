// src/modules/auth/auth.routes.ts

import { Router }     from "express";
import rateLimit      from "express-rate-limit";
import { authController }          from "./auth.controller";
import { authenticate }            from "../../middleware/auth";
import { validate }                from "../../middleware/validate";
import { loginSchema, changePasswordSchema } from "./auth.schema";

const router = Router();

// ─── Login Rate Limiter ────────────────────────────────────────
// Hanya berlaku untuk POST /auth/login
// skipSuccessfulRequests: true → login berhasil (200) TIDAK dihitung
const loginLimiter = rateLimit({
  windowMs:               15 * 60 * 1000,   // window 15 menit
  max:                    5,                 // maks 5 percobaan GAGAL per IP
  skipSuccessfulRequests: true,              // ✅ berhasil tidak dihitung
  standardHeaders:        true,
  legacyHeaders:          false,
  message: {
    success: false,
    message: "Terlalu banyak percobaan login gagal. Coba lagi dalam 15 menit.",
  },
});

// POST /auth/login — rate limited hanya di sini
router.post(
  "/login",
  loginLimiter,              // ✅ hanya login
  validate(loginSchema),
  authController.login,
);

// GET /auth/me — tidak di-rate limit
router.get(
  "/me",
  authenticate,
  authController.getMe,
);

// POST /auth/logout — tidak di-rate limit
router.post(
  "/logout",
  authenticate,
  authController.logout,
);

// PATCH /auth/change-password — tidak di-rate limit
router.patch(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword,
);

export default router;
