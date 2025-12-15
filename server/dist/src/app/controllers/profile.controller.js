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
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileController = exports.ProfileController = void 0;
const profile_service_1 = require("../services/profile.service");
const profile_schema_1 = require("../utils/validation/profile.schema");
const zod_1 = require("zod");
class ProfileController {
    constructor() {
        this.create = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.user || !req.user.id) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                const data = profile_schema_1.createProfileSchema.parse(req.body);
                const profile = yield profile_service_1.profileService.createProfile(req.user.id, data);
                res.status(201).json(profile);
            }
            catch (error) {
                if (error instanceof zod_1.z.ZodError) {
                    return res.status(400).json({ error: 'Validation Error', details: error.message });
                }
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });
        this.list = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.user || !req.user.id) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                const profiles = yield profile_service_1.profileService.getProfiles(req.user.id);
                res.status(200).json(profiles);
            }
            catch (error) {
                console.error(error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });
    }
}
exports.ProfileController = ProfileController;
exports.profileController = new ProfileController();
