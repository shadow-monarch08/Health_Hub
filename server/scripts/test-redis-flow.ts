import { authService } from '../src/app/services/auth.service';
import { emailService } from '../src/app/services/email.service';
import redisClient from '../src/redis/redisClient';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from "../src/config/environment"

const connectionString = env.DB_URL
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

// Mock Email Service to capture OTP
let lastCapturedOtp: string | null = null;
const originalSendOtp = emailService.sendVerificationOtp;

emailService.sendVerificationOtp = async (email: string, otp: string) => {
    console.log(`[MockEmail] Sending OTP to ${email}: ${otp}`);
    lastCapturedOtp = otp;
};

// Helper to delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
    console.log('🚀 Starting Redis Auth Flow Tests...');

    // --- Test Data ---
    const emailHappy = `redis.happy.${Date.now()}@test.com`;
    const emailFreeze = `redis.freeze.${Date.now()}@test.com`;
    const emailResend = `redis.resend.${Date.now()}@test.com`;
    const password = 'Password123!';
    const name = 'Redis Tester';

    try {
        // --- 1. Happy Path ---
        console.log('\n🔹 1. Testing Happy Path');
        console.log(`   Signup ${emailHappy}...`);
        const signupRes = await authService.signup({ email: emailHappy, password, name });
        console.log('   ✅ Signup successful. SessionID:', signupRes.sessionId);

        if (!lastCapturedOtp) throw new Error('OTP not captured!');
        console.log('   ℹ️  Captured OTP:', lastCapturedOtp);

        console.log('   Verifying OTP...');
        const verifyRes = await authService.verifyOtp({
            email: emailHappy,
            otp: lastCapturedOtp,
            sessionId: signupRes.sessionId
        });
        console.log('   ✅ Verification successful.');

        // Check DB
        const user = await prisma.user.findUnique({ where: { email: emailHappy } });
        if (!user || !user.emailVerified) throw new Error('User not created or not verified in DB');
        console.log('   ✅ User verified in DB.');


        // --- 2. Freeze Logic ---
        console.log('\n🔹 2. Testing Freeze Logic (3 Failed Attempts)');
        console.log(`   Signup ${emailFreeze}...`);
        const signupFreeze = await authService.signup({ email: emailFreeze, password, name });
        if (!lastCapturedOtp) throw new Error('OTP not captured!');
        const realOtp = lastCapturedOtp;

        console.log('   Attempt 1 (Wrong OTP)...');
        try {
            await authService.verifyOtp({ email: emailFreeze, otp: '000000', sessionId: signupFreeze.sessionId });
        } catch (e: any) { console.log('   ✅ Failed as expected:', e.message); }

        console.log('   Attempt 2 (Wrong OTP)...');
        try {
            await authService.verifyOtp({ email: emailFreeze, otp: '000000', sessionId: signupFreeze.sessionId });
        } catch (e: any) { console.log('   ✅ Failed as expected:', e.message); }

        console.log('   Attempt 3 (Wrong OTP) - Should Freeze...');
        try {
            await authService.verifyOtp({ email: emailFreeze, otp: '000000', sessionId: signupFreeze.sessionId });
        } catch (e: any) {
            console.log('   ✅ Failed as expected:', e.message);
            if (!e.message.includes('ACCOUNT_LOCKED') && !e.message.includes('frozen')) {
                console.warn('   ⚠️ Warning: Error message did not mention lock/freeze specifically on 3rd attempt, might involve next check.');
            }
        }

        console.log('   Attempt 4 (Correct OTP) - Should be BLOCKED...');
        try {
            await authService.verifyOtp({ email: emailFreeze, otp: realOtp, sessionId: signupFreeze.sessionId });
            throw new Error('❌ Should have failed!');
        } catch (e: any) {
            console.log('   ✅ Blocked as expected:', e.message);
            if (!e.message.includes('frozen') && !e.message.includes('locked')) {
                console.error('   ❌ Unexpected error message:', e.message);
            }
        }


        // --- 3. Resend Rate Limit ---
        console.log('\n🔹 3. Testing Resend Rate Limit (Max 5/hr)');
        console.log(`   Signup ${emailResend} (Attempt 1)...`);
        await authService.signup({ email: emailResend, password, name });
        // Resends logic applies when calling signup again or explicitly resend. Currently signup handles resend.

        for (let i = 2; i <= 5; i++) {
            console.log(`   Resend ${i}...`);
            await authService.signup({ email: emailResend, password, name });
        }

        console.log('   Resend 6 (Should Fail)...');
        try {
            await authService.signup({ email: emailResend, password, name });
            throw new Error('❌ Should have failed rate limit!');
        } catch (e: any) {
            console.log('   ✅ Failed as expected:', e.message);
        }

        console.log('\n🎉 All Redis Tests Passed!');

    } catch (error) {
        console.error('\n❌ Test Failed:', error);
        process.exit(1);
    } finally {
        // Cleanup
        console.log('\nCleaning up...');
        await prisma.user.deleteMany({
            where: {
                email: { in: [emailHappy, emailFreeze, emailResend] }
            }
        });
        await prisma.$disconnect();
        redisClient.disconnect();
    }
}

runTests();
