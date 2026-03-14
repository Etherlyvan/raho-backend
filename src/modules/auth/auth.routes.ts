import { Router } from "express";
import { authController } from "./auth.controller";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { loginSchema, changePasswordSchema } from "./auth.schema";

const router = Router();

router.post("/login",           validate(loginSchema),          authController.login);
router.get("/me",               authenticate,                   authController.getMe);
router.post("/logout",          authenticate,                   authController.logout);
router.patch("/change-password",authenticate, validate(changePasswordSchema), authController.changePassword);

export default router;
