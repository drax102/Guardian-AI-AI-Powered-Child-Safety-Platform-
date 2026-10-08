import { Router } from "express";
import { riskController } from "./risk.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

// All risk assessment routes require authentication
router.use(authenticate);

router.get("/", (req, res, next) => riskController.list(req, res, next));
router.get("/:id", (req, res, next) => riskController.getById(req, res, next));
router.delete("/:id", (req, res, next) => riskController.delete(req, res, next));

export default router;