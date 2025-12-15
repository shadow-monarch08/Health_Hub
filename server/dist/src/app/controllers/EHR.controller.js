"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ehrController = exports.EHRController = void 0;
const EHR_service_1 = require("../services/EHR.service");
const logger_1 = __importDefault(require("../../config/logger"));
class EHRController {
    /**
     * Gets a generic EHR resource.
     * Route: GET /api/v1/ehr/:resource
     * Query: ?session_id=<session_id>
     */
    getResource(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { resource } = req.params;
                const profileId = req.query.profileId;
                // Validate auth
                if (!req.user || !req.user.id) {
                    res.status(401).json({ success: false, message: 'Unauthorized' });
                    return;
                }
                const userId = req.user.id;
                if (!profileId) {
                    res.status(400).json({ success: false, message: 'Missing profileId' });
                    return;
                }
                if (!resource) {
                    res.status(400).json({ success: false, message: 'Missing resource type' });
                    return;
                }
                const result = yield EHR_service_1.ehrService.fetchResource(userId, profileId, resource);
                res.json(result);
            }
            catch (error) {
                logger_1.default.error(`Error in getResource (${req.params.resource}):`, error);
                if (error.message.includes('Profile not connected')) {
                    res.status(404).json({ success: false, message: 'Profile not connected to provider' });
                }
                else if (error.message.includes('Unauthorized')) {
                    res.status(401).json({ success: false, message: 'Unauthorized' });
                }
                else if (error.message.includes('Forbidden')) {
                    res.status(403).json({ success: false, message: 'Forbidden' });
                }
                else {
                    res.status(500).json({ success: false, message: 'Internal Server Error' });
                }
            }
        });
    }
}
exports.EHRController = EHRController;
exports.ehrController = new EHRController();
