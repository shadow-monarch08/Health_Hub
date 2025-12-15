import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from "../src/config/environment"
import redisClient from '../src/redis/redisClient';
import crypto from 'crypto';

const connectionString = env.DB_URL

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })
const BASE_URL = 'http://localhost:4000/api/v1/auth';

const TEST_EMAIL = `samanta.n1962.${Date.now()}@gmail.com`; // Unique email to avoid dupes
const TEST_PASSWORD = 'Password123!';
const NEW_PASSWORD = 'NewPassword123!';

async function main() {
    try {
        // Cleanup first just in case
        await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });

        console.log('🔹 1. Signup');
        let sessionId = '';
        try {
            const signupRes = await axios.post(`${BASE_URL}/signup`, {
                email: TEST_EMAIL,
                password: TEST_PASSWORD,
                name: 'Test User',
            });
            console.log('✅ Signup Success:', signupRes.data);
            sessionId = signupRes.data.sessionId; // Capture sessionId
        } catch (e: any) {
            console.error('❌ Signup Failed:', e.response?.data || e.message);
            process.exit(1);
        }

        console.log('\n🔹 2. Verify OTP');
        // Old Logic: Fetch OTP from DB (Removed)
        // New Logic: Reset OTP in Redis to a known value

        const FIXED_OTP = '123456';
        const otpHash = crypto.createHmac('sha256', sessionId).update(FIXED_OTP).digest('hex');

        // Overwrite OTP in Redis for this session
        // Note: We need to know the key format. From redisKeys.ts: `signup:otp:${sessionId}`
        await redisClient.set(`signup:otp:${sessionId}`, JSON.stringify({ otp_hash: otpHash }), 'EX', 180);
        console.log(`ℹ️  Injected Fixed OTP into Redis: ${FIXED_OTP}`);

        try {
            const verifyRes = await axios.post(`${BASE_URL}/verify-otp`, {
                email: TEST_EMAIL,
                otp: FIXED_OTP,
                sessionId: sessionId,
            });
            console.log('✅ Verify OTP Success:', verifyRes.data);
        } catch (e: any) {
            console.error('❌ Verify OTP Failed:', e.response?.data || e.message);
            process.exit(1);
        }

        console.log('\n🔹 3. Login');
        let token = '';
        try {
            const loginRes = await axios.post(`${BASE_URL}/login`, {
                email: TEST_EMAIL,
                password: TEST_PASSWORD,
            });
            console.log('✅ Login Success');
            token = loginRes.data.token;
        } catch (e: any) {
            console.error('❌ Login Failed:', e.response?.data || e.message);
            process.exit(1);
        }

        console.log('\n🔹 4. Get Current User (Me)');
        try {
            const meRes = await axios.get(`${BASE_URL}/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log('✅ Me Success:', meRes.data);
        } catch (e: any) {
            console.error('❌ Me Failed:', e.response?.data || e.message);
            // Don't exit, continue testing
        }

        console.log('\n🔹 5. Forgot Password');
        try {
            const forgotRes = await axios.post(`${BASE_URL}/forgot-password`, {
                email: TEST_EMAIL,
            });
            console.log('✅ Forgot Password Success:', forgotRes.data);
        } catch (e: any) {
            console.error('❌ Forgot Password Failed:', e.response?.data || e.message);
            process.exit(1);
        }

        console.log('\n🔹 6. Reset Password');
        // Fetch Reset Token from DB
        const userReset = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
        if (!userReset || !userReset.resetToken) {
            console.error('❌ Reset Token not found in DB');
            process.exit(1);
        }
        console.log(`ℹ️  Reset Token fetched from DB: ${userReset.resetToken}`);

        try {
            const resetRes = await axios.post(`${BASE_URL}/reset-password`, {
                email: TEST_EMAIL,
                token: userReset.resetToken,
                newPassword: NEW_PASSWORD,
            });
            console.log('✅ Reset Password Success:', resetRes.data);
        } catch (e: any) {
            console.error('❌ Reset Password Failed:', e.response?.data || e.message);
            process.exit(1);
        }

        console.log('\n🔹 7. Login with New Password');
        try {
            const newLoginRes = await axios.post(`${BASE_URL}/login`, {
                email: TEST_EMAIL,
                password: NEW_PASSWORD,
            });
            console.log('✅ New Login Success');
        } catch (e: any) {
            console.error('❌ New Login Failed:', e.response?.data || e.message);
            process.exit(1);
        }

        console.log('\n🎉 All Auth Tests Passed!');

    } catch (error) {
        console.error('Unexpected Error:', error);
    } finally {
        // Cleanup (Optional)
        await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
        await prisma.$disconnect();
        redisClient.disconnect();
    }
}

main();
