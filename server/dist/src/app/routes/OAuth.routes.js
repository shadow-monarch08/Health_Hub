"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const OAuth_controller_1 = require("../controllers/OAuth.controller");
const router = (0, express_1.Router)();
// Route: GET /api/v1/OAuth/epic/authorize
router.get("/epic/authorize", OAuth_controller_1.oAuthController.authorizeEpic);
// Route: GET /api/v1/OAuth/epic/callback
router.get("/epic/callback", OAuth_controller_1.oAuthController.epicCallback);
// Route: GET /api/v1/OAuth/epic/demographics
router.get("/epic/demographics", OAuth_controller_1.oAuthController.getDemographics);
exports.default = router;
