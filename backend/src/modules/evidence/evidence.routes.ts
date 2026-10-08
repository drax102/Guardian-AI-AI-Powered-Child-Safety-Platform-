import { Router } from "express";
import { evidenceController } from "./evidence.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  singleUpload,
  uploadRateLimiter,
} from "../../middlewares/upload.middleware";

const router = Router();

// All evidence routes require authentication
router.use(authenticate);

// Evidence routes linked to alerts
router.post(
  "/alerts/:alertId/evidence",
  uploadRateLimiter,
  singleUpload("file"),
  (req, res, next) => evidenceController.upload(req, res, next)
);

router.get("/alerts/:alertId/evidence", (req, res, next) =>
  evidenceController.listByAlert(req, res, next)
);

// Direct evidence routes
router.get("/evidence/:id", (req, res, next) =>
  evidenceController.getById(req, res, next)
);

router.delete("/evidence/:id", (req, res, next) =>
  evidenceController.delete(req, res, next)
);

export default router;
