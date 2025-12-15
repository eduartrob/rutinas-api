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

    /**
     * Obtener rutinas populares/más usadas
     * Se basan en: rutinas activas + más hábitos completados
     */
    async getPopularRoutines(limit: number = 10) {
        // Obtener rutinas con más completados de hábitos
        const routinesWithCompletions = await prisma.routine.findMany({
            where: {
                isActive: true,
                habits: {
                    some: {
                        completions: {
                            some: {}
                        }
                    }
                }
            },
            include: {
                habits: {
                    include: {
                        _count: {
                            select: { completions: true }
                        }
                    }
                },
                user: {
                    select: { name: true }
                }
            },
            take: 50 // Get more to sort
        });

        // Calcular puntuación por rutina
        const scoredRoutines = routinesWithCompletions.map(routine => {
            const totalCompletions = routine.habits.reduce(
                (sum, habit) => sum + habit._count.completions,
                0
            );
            return {
                id: routine.id,
                name: routine.name,
                categories: routine.categories,
                habitCount: routine.habits.length,
                totalCompletions,
                creatorName: routine.user?.name || 'Usuario',
                habits: routine.habits.map(h => ({
                    name: h.name,
                    emoji: h.emoji,
                    category: h.category,
                    time: h.time
                })),
                score: totalCompletions + (routine.habits.length * 2)
            };
        });

        // Ordenar por puntuación y retornar top
        return scoredRoutines
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    /**
     * Obtener rutinas públicas/plantillas predefinidas
     */
    async getRoutineTemplates() {
        // Esto devuelve rutinas de ejemplo que pueden ser copiadas
        const templates = [
            {
                id: 'template-1',
                name: 'Rutina Matutina Productiva',
                categories: ['Salud', 'Productividad'],
                habitCount: 5,
                habits: [
                    { name: 'Despertar temprano', emoji: '⏰', category: 'Salud', time: '06:00' },
                    { name: 'Meditar 10 min', emoji: '🧘', category: 'Salud', time: '06:15' },
                    { name: 'Ejercicio', emoji: '💪', category: 'Salud', time: '06:30' },
                    { name: 'Desayuno saludable', emoji: '🥗', category: 'Salud', time: '07:00' },
                    { name: 'Revisar tareas del día', emoji: '📋', category: 'Productividad', time: '07:30' }
                ]
            },
            {
                id: 'template-2',
                name: 'Rutina Nocturna de Descanso',
                categories: ['Salud', 'Bienestar'],
                habitCount: 4,
                habits: [
                    { name: 'Dejar el celular', emoji: '📵', category: 'Bienestar', time: '21:00' },
                    { name: 'Leer 15 min', emoji: '📚', category: 'Bienestar', time: '21:15' },
                    { name: 'Preparar ropa de mañana', emoji: '👔', category: 'Productividad', time: '21:30' },
                    { name: 'Dormir', emoji: '😴', category: 'Salud', time: '22:00' }
                ]
            },
            {
                id: 'template-3',
                name: 'Hábitos de Estudio',
                categories: ['Estudio', 'Productividad'],
                habitCount: 4,
                habits: [
                    { name: 'Repasar notas', emoji: '📝', category: 'Estudio', time: '15:00' },
                    { name: 'Pomodoro 25 min', emoji: '🍅', category: 'Productividad', time: '15:30' },
                    { name: 'Descanso activo', emoji: '🚶', category: 'Salud', time: '16:00' },
                    { name: 'Práctica de ejercicios', emoji: '✍️', category: 'Estudio', time: '16:15' }
                ]
            }
        ];
        return templates;
    }
}
