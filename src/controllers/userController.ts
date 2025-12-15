import * as authService from '../services/authService'
import { prisma } from '../config/db';
import { createVerificationCode, validateVerificationCode } from '../services/verificationService'
import { sendResetCodeEmail } from '../services/emailService'

export class UserController {
    async getUsers() {
        return await prisma.user.findMany();
    }

    async getUserById(id: string) {
        const user = await prisma.user.findUnique({
            where: { id }
        });
        if (!user) {
            throw new Error('error-get-user');
        }
        return user;
    }

    async getUserByName(name: string, email: string, phone: string) {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { name },
                    { email },
                    { phone }
                ]
            }
        });
        if (user) {
            throw new Error('get-user');
        }
        return user;
    }

    async getUserByUsername(email: string, password: string, fsmToken?: string): Promise<{ token: string; user: { id: string; name: string; email: string; phone: string; region?: string; profileImage?: string | null } }> {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user || !(await authService.comparePassword(password, user.password))) {
            throw new Error('invalid-credentials');
        }

        const token = authService.generateToken({ id: user.id, email: user.email });
        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            region: user.region,
            profileImage: user.profileImage,
        };

        console.log(`User ${user.name} signed in with FCM Token: ${fsmToken || 'none'}`);
        if (token && fsmToken) {
            await this.updateUserFcmToken(user.id, fsmToken);
        }

        return { token, user: userData };
    }

    async getUserByEmail(email: string) {
        const user = await prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            throw new Error('error-get-user');
        }
        return user;
    }

    async createUser(data: { name: string, email: string, password: string, phone: string, fsmToken?: string }): Promise<{ user: { name: string; email: string; phone: string; region?: string }, token: string }> {
        const hashPassword = await authService.hashPassword(data.password);

        const savedUser = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashPassword,
                phone: data.phone,
                fcmTokens: data.fsmToken ? [data.fsmToken] : []
            }
        });

        const token = authService.generateToken({ id: savedUser.id, email: savedUser.email });
        const userData = {
            name: savedUser.name,
            email: savedUser.email,
            phone: savedUser.phone,
            region: savedUser.region,
        };

        return {
            user: userData,
            token: token
        };
    }

    async updateUser(id: string, data: { name?: string, email?: string, password?: string, phone?: string }) {
        const updateData: { name?: string, email?: string, password?: string, phone?: string } = { ...data };
        if (updateData.password) {
            const hashedPassword = await authService.hashPassword(updateData.password);
            updateData.password = hashedPassword;
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData
        });

        if (!user) {
            throw new Error('error-get-user');
        }
        return user;
    }

    async deleteUser(id: string): Promise<{ message: string }> {
        const user = await prisma.user.findUnique({
            where: { id }
        });
        if (!user) {
            throw new Error('user-not-found');
        }

        await prisma.user.delete({
            where: { id }
        });

        return { message: 'User deleted successfully' };
    }

    async requestPasswordReset(userId: string, email: string): Promise<number> {
        const code = await createVerificationCode(userId);
        await sendResetCodeEmail(email, code.toString());
        return code;
    }

    async verifyResetCode(codeVerification: number): Promise<{ userId: string }> {
        const result = await validateVerificationCode(codeVerification);
        console.log("Verification result:", result);
        if (!result) {
            throw new Error('invalid-code');
        }

        return { userId: result.userId };
    }

    async updateUserFcmToken(userId: string, fcmToken: string) {
        if (!fcmToken) return;

        console.log(`Updating FCM Token for user ${userId}: ${fcmToken}`);

        // Remove token from other users
        const usersWithToken = await prisma.user.findMany({
            where: {
                id: { not: userId },
                fcmTokens: { has: fcmToken }
            }
        });

        for (const user of usersWithToken) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    fcmTokens: user.fcmTokens.filter(t => t !== fcmToken)
                }
            });
        }
        console.log(`FCM Token ${fcmToken} removed from other users.`);

        // Add token to current user
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            console.warn(`User with ID ${userId} not found.`);
            return;
        }

        if (!user.fcmTokens.includes(fcmToken)) {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    fcmTokens: [...user.fcmTokens, fcmToken]
                }
            });
            console.log(`FCM Token ${fcmToken} added for user ${userId}`);
        } else {
            console.log(`FCM Token ${fcmToken} already exists for user ${userId}.`);
        }
    }
}