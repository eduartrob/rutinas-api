import { prisma } from '../config/db';

interface AppData {
    name: string;
    description: string;
    version: string;
    developerId: string;
    releaseDate: Date;
}

interface UpdateAppData {
    name?: string;
    description?: string;
    size?: number;
    version?: string;
    developerId?: string;
    releaseDate?: Date;
    imageUrl?: string;
}

export class AppController {
    async getApps() {
        return await prisma.app.findMany({
            include: { appFile: true }
        });
    }

    async getAppsByUserId(userId: string) {
        const apps = await prisma.app.findMany({
            where: { developerId: userId },
            include: { appFile: true }
        });
        if (apps.length === 0) {
            throw new Error('not-content-app');
        }
        return apps;
    }

    async getAppById(id: string) {
        const app = await prisma.app.findUnique({
            where: { id },
            include: { appFile: true }
        });
        if (!app) {
            throw new Error('error-get-app');
        }
        return app;
    }

    async createApp(data: AppData) {
        const newApp = await prisma.app.create({
            data: {
                name: data.name,
                description: data.description,
                version: data.version,
                developerId: data.developerId,
                releaseDate: data.releaseDate,
                rate: 0.0
            }
        });
        return newApp;
    }

    async updateApp(id: string, data: UpdateAppData) {
        const app = await prisma.app.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                version: data.version,
                releaseDate: data.releaseDate
            }
        });
        return app;
    }

    async deleteApp(id: string): Promise<{ message: string }> {
        const app = await prisma.app.findUnique({
            where: { id }
        });
        if (!app) {
            throw new Error('app-not-found');
        }
        await prisma.app.delete({
            where: { id }
        });
        return { message: 'App deleted successfully' };
    }
}