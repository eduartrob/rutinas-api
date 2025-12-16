import { Router } from 'express';
import { popularRoutineController } from '../controllers/popularRoutineController';
import { authMiddleware } from '../middlewares/authMiddleware';

const popularRoutineRouter = Router();

// Get all popular routines (public)
popularRoutineRouter.get('/', async (req, res): Promise<void> => {
    try {
        const routines = await popularRoutineController.getPopularRoutines();
        res.status(200).json(routines);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching popular routines', error });
    }
});

// Get single popular routine by ID
popularRoutineRouter.get('/:id', async (req, res): Promise<void> => {
    try {
        const { id } = req.params;
        const routine = await popularRoutineController.getPopularRoutineById(id);

        if (!routine) {
            res.status(404).json({ message: 'Popular routine not found' });
            return;
        }

        res.status(200).json(routine);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching popular routine', error });
    }
});

// Add popular routine to user's account (authenticated)
popularRoutineRouter.post('/:id/add', authMiddleware, async (req, res): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const userId = req.user.userId as string;
        const { id } = req.params;

        const newRoutine = await popularRoutineController.addPopularRoutineToUser(userId, id);
        res.status(201).json({
            message: 'Routine added successfully',
            routine: newRoutine
        });
    } catch (error: any) {
        if (error.message === 'popular-routine-not-found') {
            res.status(404).json({ message: 'Popular routine not found' });
            return;
        }
        res.status(500).json({ message: 'Error adding routine', error });
    }
});

// Create popular routine (for seeding/admin)
popularRoutineRouter.post('/', authMiddleware, async (req, res): Promise<void> => {
    try {
        const { name, description, emoji, categories, habits } = req.body;

        if (!name || !habits || !Array.isArray(habits)) {
            res.status(400).json({ message: 'Name and habits array are required' });
            return;
        }

        const routine = await popularRoutineController.createPopularRoutine({
            name,
            description,
            emoji,
            categories,
            habits
        });

        res.status(201).json(routine);
    } catch (error) {
        res.status(500).json({ message: 'Error creating popular routine', error });
    }
});

export default popularRoutineRouter;
