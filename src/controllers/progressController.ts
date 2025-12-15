import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class ProgressController {
    /**
     * Toggle habit completion for a specific date
     */
    async toggleHabitCompletion(
        habitId: string,
        userId: string,
        date: Date
    ): Promise<{ completed: boolean }> {
        // Normalize date to start of day
        const normalizedDate = new Date(date);
        normalizedDate.setHours(0, 0, 0, 0);

        // Check if completion exists
        const existing = await prisma.habitCompletion.findUnique({
            where: {
                habitId_userId_date: {
                    habitId,
                    userId,
                    date: normalizedDate,
                },
            },
        });

        if (existing) {
            // Delete the completion (uncomplete)
            await prisma.habitCompletion.delete({
                where: { id: existing.id },
            });
            return { completed: false };
        } else {
            // Create completion
            await prisma.habitCompletion.create({
                data: {
                    habitId,
                    userId,
                    date: normalizedDate,
                },
            });
            return { completed: true };
        }
    }

    /**
     * Get completions for a specific date
     */
    async getCompletionsForDate(
        userId: string,
        date: Date
    ): Promise<string[]> {
        const normalizedDate = new Date(date);
        normalizedDate.setHours(0, 0, 0, 0);

        const completions = await prisma.habitCompletion.findMany({
            where: {
                userId,
                date: normalizedDate,
            },
            select: { habitId: true },
        });

        return completions.map((c) => c.habitId);
    }

    /**
     * Get progress statistics for a user
     */
    async getProgressStats(
        userId: string,
        period: "week" | "month" | "year" = "week"
    ): Promise<{
        currentStreak: number;
        successRate: number;
        completedThisPeriod: number;
        dailyCompletions: { date: string; count: number }[];
        habitStats: { habitId: string; name: string; emoji: string; streak: number; percentage: number }[];
    }> {
        // Calculate date range
        const now = new Date();
        let startDate = new Date();

        if (period === "week") {
            startDate.setDate(now.getDate() - 7);
        } else if (period === "month") {
            startDate.setMonth(now.getMonth() - 1);
        } else {
            startDate.setFullYear(now.getFullYear() - 1);
        }
        startDate.setHours(0, 0, 0, 0);

        // Get user's active routines and habits
        const routines = await prisma.routine.findMany({
            where: { userId, isActive: true },
            include: { habits: true },
        });

        const allHabits = routines.flatMap((r) => r.habits);
        const habitIds = allHabits.map((h) => h.id);

        // Get all completions in the period
        const completions = await prisma.habitCompletion.findMany({
            where: {
                userId,
                habitId: { in: habitIds },
                date: { gte: startDate },
            },
            include: { habit: true },
            orderBy: { date: "desc" },
        });

        // Calculate streak
        let currentStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);

            const dayCompletions = completions.filter(
                (c) => c.date.toISOString().slice(0, 10) === checkDate.toISOString().slice(0, 10)
            );

            if (dayCompletions.length > 0) {
                currentStreak++;
            } else if (i > 0) {
                break;
            }
        }

        // Calculate success rate
        const daysInPeriod = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const expectedCompletions = allHabits.length * daysInPeriod;
        const successRate = expectedCompletions > 0
            ? Math.round((completions.length / expectedCompletions) * 100)
            : 0;

        // Daily completions for chart
        const dailyMap = new Map<string, number>();
        completions.forEach((c) => {
            const dateStr = c.date.toISOString().slice(0, 10);
            dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + 1);
        });

        const dailyCompletions: { date: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            dailyCompletions.push({
                date: dateStr,
                count: dailyMap.get(dateStr) || 0,
            });
        }

        // Habit-specific stats
        const habitStats = await Promise.all(
            allHabits.map(async (habit) => {
                const habitCompletions = completions.filter((c) => c.habitId === habit.id);

                // Calculate habit streak
                let habitStreak = 0;
                for (let i = 0; i < 365; i++) {
                    const checkDate = new Date(today);
                    checkDate.setDate(today.getDate() - i);
                    const dateStr = checkDate.toISOString().slice(0, 10);

                    const hasCompletion = habitCompletions.some(
                        (c) => c.date.toISOString().slice(0, 10) === dateStr
                    );

                    if (hasCompletion) {
                        habitStreak++;
                    } else if (i > 0) {
                        break;
                    }
                }

                const percentage = daysInPeriod > 0
                    ? Math.round((habitCompletions.length / daysInPeriod) * 100)
                    : 0;

                return {
                    habitId: habit.id,
                    name: habit.name,
                    emoji: habit.emoji,
                    streak: habitStreak,
                    percentage: Math.min(percentage, 100),
                };
            })
        );

        return {
            currentStreak,
            successRate: Math.min(successRate, 100),
            completedThisPeriod: completions.length,
            dailyCompletions,
            habitStats,
        };
    }
}
