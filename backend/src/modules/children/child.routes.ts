import { Router } from "express";
import { childController } from "./child.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

// All child routes require authentication
router.use(authenticate);

router.post("/", (req, res, next) => childController.create(req, res, next));
router.get("/", (req, res, next) => childController.list(req, res, next));
router.get("/:id", (req, res, next) => childController.getById(req, res, next));
router.patch("/:id", (req, res, next) => childController.update(req, res, next));
router.delete("/:id", (req, res, next) => childController.delete(req, res, next));

export default router;