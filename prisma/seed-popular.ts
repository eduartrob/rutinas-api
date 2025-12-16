import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const popularRoutinesData = [
    {
        name: 'Rutina Matutina Productiva',
        description: 'Empieza el día con energía y productividad',
        emoji: '🌅',
        categories: ['Salud', 'Productividad'],
        habits: [
            { name: 'Despertar temprano', emoji: '⏰', category: 'productividad', time: '06:00 AM', order: 0 },
            { name: 'Beber agua', emoji: '💧', category: 'salud', time: '06:05 AM', order: 1 },
            { name: 'Ejercicio 30 min', emoji: '🏃', category: 'salud', time: '06:15 AM', order: 2 },
            { name: 'Ducha fría', emoji: '🚿', category: 'salud', time: '06:45 AM', order: 3 },
            { name: 'Desayuno saludable', emoji: '🥗', category: 'salud', time: '07:00 AM', order: 4 },
        ],
    },
    {
        name: 'Rutina Nocturna de Descanso',
        description: 'Prepárate para un sueño reparador',
        emoji: '🌙',
        categories: ['Salud', 'Bienestar'],
        habits: [
            { name: 'Apagar pantallas', emoji: '📱', category: 'bienestar', time: '09:00 PM', order: 0 },
            { name: 'Lectura 20 min', emoji: '📖', category: 'bienestar', time: '09:15 PM', order: 1 },
            { name: 'Meditación', emoji: '🧘', category: 'salud_mental', time: '09:35 PM', order: 2 },
            { name: 'Preparar ropa mañana', emoji: '👔', category: 'productividad', time: '09:50 PM', order: 3 },
        ],
    },
    {
        name: 'Hábitos de Estudio',
        description: 'Maximiza tu aprendizaje y concentración',
        emoji: '📚',
        categories: ['Estudio', 'Productividad'],
        habits: [
            { name: 'Revisar agenda', emoji: '📋', category: 'productividad', time: '08:00 AM', order: 0 },
            { name: 'Pomodoro 25 min', emoji: '🍅', category: 'estudio', order: 1 },
            { name: 'Tomar notas', emoji: '✍️', category: 'estudio', order: 2 },
            { name: 'Repasar aprendido', emoji: '🔄', category: 'estudio', time: '06:00 PM', order: 3 },
        ],
    },
    {
        name: 'Rutina de Fitness',
        description: 'Mantén tu cuerpo en forma',
        emoji: '💪',
        categories: ['Salud', 'Ejercicio'],
        habits: [
            { name: 'Calentamiento', emoji: '🔥', category: 'ejercicio', time: '07:00 AM', order: 0 },
            { name: 'Entrenamiento de fuerza', emoji: '🏋️', category: 'ejercicio', time: '07:10 AM', order: 1 },
            { name: 'Cardio 20 min', emoji: '🏃', category: 'ejercicio', time: '07:40 AM', order: 2 },
            { name: 'Estiramientos', emoji: '🧘', category: 'ejercicio', time: '08:00 AM', order: 3 },
            { name: 'Batido de proteínas', emoji: '🥤', category: 'salud', time: '08:15 AM', order: 4 },
        ],
    },
    {
        name: 'Mindfulness Diario',
        description: 'Cuida tu salud mental cada día',
        emoji: '🧘',
        categories: ['Bienestar', 'Salud Mental'],
        habits: [
            { name: 'Diario de gratitud', emoji: '🙏', category: 'bienestar', time: '07:00 AM', order: 0 },
            { name: 'Meditación 10 min', emoji: '🧘', category: 'salud_mental', time: '07:15 AM', order: 1 },
            { name: 'Respiración consciente', emoji: '🌬️', category: 'salud_mental', order: 2 },
            { name: 'Reflexión del día', emoji: '📝', category: 'bienestar', time: '09:00 PM', order: 3 },
        ],
    },
];

async function seed() {
    console.log('🌱 Seeding popular routines...');

    for (const routineData of popularRoutinesData) {
        // Check if routine already exists
        const existing = await prisma.popularRoutine.findFirst({
            where: { name: routineData.name }
        });

        if (existing) {
            console.log(`⏭️  "${routineData.name}" already exists, skipping...`);
            continue;
        }

        const routine = await prisma.popularRoutine.create({
            data: {
                name: routineData.name,
                description: routineData.description,
                emoji: routineData.emoji,
                categories: routineData.categories,
                habits: {
                    create: routineData.habits
                }
            }
        });

        console.log(`✅ Created: ${routine.name}`);
    }

    console.log('🎉 Seeding complete!');
}

seed()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
