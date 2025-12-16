import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const popularRoutineController = {
    // Get all active popular routines
    async getPopularRoutines() {
        return await prisma.popularRoutine.findMany({
            where: { isActive: true },
            include: {
                habits: {
                    orderBy: { order: 'asc' }
                }
            },
            orderBy: { usersCount: 'desc' }
        });
    },

    // Get a single popular routine by ID
    async getPopularRoutineById(id: string) {
        return await prisma.popularRoutine.findUnique({
            where: { id },
            include: {
                habits: {
                    orderBy: { order: 'asc' }
                }
            }
        });
    },

    // Add popular routine to user's account
    async addPopularRoutineToUser(userId: string, popularRoutineId: string) {
        // Get the popular routine with habits
        const popularRoutine = await prisma.popularRoutine.findUnique({
            where: { id: popularRoutineId },
            include: { habits: { orderBy: { order: 'asc' } } }
        });

        if (!popularRoutine) {
            throw new Error('popular-routine-not-found');
        }

        // Create user's routine based on popular template
        const newRoutine = await prisma.routine.create({
            data: {
                name: popularRoutine.name,
                userId,
                isActive: true,
                categories: popularRoutine.categories,
                habits: {
                    create: popularRoutine.habits.map(habit => ({
                        name: habit.name,
                        emoji: habit.emoji,
                        category: habit.category,
                        time: habit.time,
                    }))
                }
            },
            include: { habits: true }
        });

        // Increment usersCount
        await prisma.popularRoutine.update({
            where: { id: popularRoutineId },
            data: { usersCount: { increment: 1 } }
        });

        return newRoutine;
    },

    // Create popular routine (admin)
    async createPopularRoutine(data: {
        name: string;
        description?: string;
        emoji?: string;
        categories?: string[];
        habits: Array<{
            name: string;
            emoji?: string;
            category: string;
            time?: string;
            order?: number;
        }>;
    }) {
        return await prisma.popularRoutine.create({
            data: {
                name: data.name,
                description: data.description,
                emoji: data.emoji || '📋',
                categories: data.categories || [],
                habits: {
                    create: data.habits.map((habit, index) => ({
                        name: habit.name,
                        emoji: habit.emoji || '📌',
                        category: habit.category,
                        time: habit.time,
                        order: habit.order ?? index,
                    }))
                }
            },
            include: { habits: true }
        });
    }
};
