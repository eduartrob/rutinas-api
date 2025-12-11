import { prisma } from '../config/db';

interface CreateRoutineData {
    name: string;
    userId: string;
    categories?: string[];
    habits?: { name: string; category: string; time?: string; emoji?: string }[];
}

interface UpdateRoutineData {
    name?: string;
    habits?: { id?: string; name: string; category: string; time?: string; emoji?: string }[];
    isActive?: boolean;
    categories?: string[];
}

export class RoutineController {
    async getRoutinesByUserId(userId: string) {
        const routines = await prisma.routine.findMany({
            where: { userId },
            include: { habits: true },
            orderBy: { createdAt: 'desc' }
        });
        return routines;
    }

    async getRoutineById(id: string) {
        const routine = await prisma.routine.findUnique({
            where: { id },
            include: { habits: true }
        });
        if (!routine) {
            throw new Error('routine-not-found');
        }
        return routine;
    }

    async createRoutine(data: CreateRoutineData) {
        const routine = await prisma.routine.create({
            data: {
                name: data.name,
                userId: data.userId,
                categories: data.categories || [],
                isActive: false,
                habits: data.habits ? {
                    create: data.habits.map(h => ({
                        name: h.name,
                        category: h.category,
                        time: h.time,
                        emoji: h.emoji || '📌'
                    }))
                } : undefined
            },
            include: { habits: true }
        });
        return routine;
    }

    async updateRoutine(id: string, data: UpdateRoutineData) {
        // First, get the existing routine
        const existingRoutine = await prisma.routine.findUnique({
            where: { id },
            include: { habits: true }
        });

        if (!existingRoutine) {
            throw new Error('routine-not-found');
        }

        // If habits are provided, delete existing and create new ones
        if (data.habits) {
            await prisma.habit.deleteMany({
                where: { routineId: id }
            });
        }

        const routine = await prisma.routine.update({
            where: { id },
            data: {
                name: data.name,
                isActive: data.isActive,
                categories: data.categories,
                habits: data.habits ? {
                    create: data.habits.map(h => ({
                        name: h.name,
                        category: h.category,
                        time: h.time,
                        emoji: h.emoji || '📌'
                    }))
                } : undefined
            },
            include: { habits: true }
        });

        return routine;
    }

    async toggleRoutine(id: string) {
        const routine = await prisma.routine.findUnique({
            where: { id }
        });
        if (!routine) {
            throw new Error('routine-not-found');
        }

        const updated = await prisma.routine.update({
            where: { id },
            data: { isActive: !routine.isActive },
            include: { habits: true }
        });
        return updated;
    }

    async deleteRoutine(id: string): Promise<{ message: string }> {
        const routine = await prisma.routine.findUnique({
            where: { id }
        });
        if (!routine) {
            throw new Error('routine-not-found');
        }

        await prisma.routine.delete({
            where: { id }
        });
        return { message: 'Routine deleted successfully' };
    }

    async addHabitToRoutine(routineId: string, habit: { name: string; category: string; time?: string; emoji?: string }) {
        const routine = await prisma.routine.findUnique({
            where: { id: routineId }
        });
        if (!routine) {
            throw new Error('routine-not-found');
        }

        await prisma.habit.create({
            data: {
                name: habit.name,
                category: habit.category,
                time: habit.time,
                emoji: habit.emoji || '📌',
                routineId: routineId
            }
        });

        return await prisma.routine.findUnique({
            where: { id: routineId },
            include: { habits: true }
        });
    }

    async removeHabitFromRoutine(routineId: string, habitId: string) {
        const routine = await prisma.routine.findUnique({
            where: { id: routineId }
        });
        if (!routine) {
            throw new Error('routine-not-found');
        }

        await prisma.habit.delete({
            where: { id: habitId }
        });

        return await prisma.routine.findUnique({
            where: { id: routineId },
            include: { habits: true }
        });
    }
}
