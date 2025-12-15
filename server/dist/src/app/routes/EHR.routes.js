"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const EHR_controller_1 = require("../controllers/EHR.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Route: GET /api/v1/ehr/:resource
// Example: /api/v1/ehr/Observation?profileId=...
router.get('/:resource', EHR_controller_1.ehrController.getResource);
exports.default = router;
