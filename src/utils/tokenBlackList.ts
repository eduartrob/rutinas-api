import { prisma } from '../config/db';

export async function addTokenToBlacklist(token: string, expiresAt?: Date) {
  await prisma.blacklistedToken.create({
    data: { token, expiresAt }
  });
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const entry = await prisma.blacklistedToken.findUnique({
    where: { token }
  });
  return !!entry;
}
