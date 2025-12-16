import express from 'express';
import cors from 'cors';
import path from 'path';

import { connectDB } from './config/db';
import userRouter from './routes/userRouter';
import routineRouter from './routes/routineRouter';
import progressRouter from './routes/progressRouter';
import s3Router from './routes/s3Router';
import popularRoutineRouter from './routes/popularRoutineRouter';

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/users', userRouter);
app.use('/api/routines', routineRouter);
app.use('/api/progress', progressRouter);
app.use('/api/s3', s3Router);
app.use('/api/popular-routines', popularRoutineRouter);

connectDB();
export { app };