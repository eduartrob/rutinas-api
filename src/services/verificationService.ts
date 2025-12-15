import { prisma } from '../config/db';

function generateRandomCode(length = 6): number {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return parseInt(code, 10);
}

export async function createVerificationCode(userId: string): Promise<number> {
  const code = generateRandomCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Delete existing code for user
  await prisma.verificationCode.deleteMany({
    where: { userId }
  });

  // Create new code
  await prisma.verificationCode.create({
    data: {
      userId,
      code,
      expiresAt,
    }
  });

  return code;
}

export async function validateVerificationCode(code: number): Promise<{ userId: string } | null> {
  const record = await prisma.verificationCode.findFirst({
    where: { code }
  });

  if (!record || record.expiresAt < new Date()) return null;

  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { used: true }
  });

  return { userId: record.userId };
}