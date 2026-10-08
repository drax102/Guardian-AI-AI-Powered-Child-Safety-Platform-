import { Router } from "express";
import { alertController } from "./alert.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

// All alert routes require authentication
router.use(authenticate);

router.post("/", (req, res, next) => alertController.create(req, res, next));
router.get("/", (req, res, next) => alertController.list(req, res, next));
router.get("/:id", (req, res, next) => alertController.getById(req, res, next));
router.patch("/:id/status", (req, res, next) => alertController.updateStatus(req, res, next));
router.delete("/:id", (req, res, next) => alertController.delete(req, res, next));

export default router;