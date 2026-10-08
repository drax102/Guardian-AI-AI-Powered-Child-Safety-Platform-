import { Router } from "express";
import { deviceController } from "./device.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

// All device routes require authentication
router.use(authenticate);

router.post("/", (req, res, next) => deviceController.create(req, res, next));
router.get("/", (req, res, next) => deviceController.list(req, res, next));
router.get("/:id", (req, res, next) => deviceController.getById(req, res, next));
router.patch("/:id/status", (req, res, next) => deviceController.updateStatus(req, res, next));
router.patch("/:id", (req, res, next) => deviceController.update(req, res, next));
router.delete("/:id", (req, res, next) => deviceController.delete(req, res, next));

export default router;