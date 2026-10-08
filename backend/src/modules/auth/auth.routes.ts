import { Router } from "express";
import { authController } from "./auth.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { loginRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

router.post("/signup", (req, res, next) => authController.signup(req, res, next));
router.post("/login", loginRateLimiter, (req, res, next) => authController.login(req, res, next));
router.post("/refresh", (req, res, next) => authController.refresh(req, res, next));
router.post("/logout", authenticate, (req, res, next) => authController.logout(req, res, next));
router.get("/me", authenticate, (req, res, next) => authController.me(req, res, next));

export default router;