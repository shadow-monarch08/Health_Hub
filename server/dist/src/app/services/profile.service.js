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
exports.profileService = exports.ProfileService = void 0;
const client_1 = require("../../../generated/prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const environment_1 = require("../../config/environment");
const connectionString = environment_1.env.DB_URL;
const adapter = new adapter_pg_1.PrismaPg({ connectionString });
const prisma = new client_1.PrismaClient({ adapter });
class ProfileService {
    createProfile(userId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma.profile.create({
                data: {
                    userId,
                    displayName: data.displayName,
                    legalName: data.legalName,
                    dob: data.dob ? new Date(data.dob) : null,
                    relationship: data.relationship,
                },
            });
        });
    }
    getProfiles(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return prisma.profile.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });
        });
    }
}
exports.ProfileService = ProfileService;
exports.profileService = new ProfileService();
