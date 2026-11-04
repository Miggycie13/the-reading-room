import { prisma } from "./db.js";
import { HttpError } from "../http/errors.js";

export const GUEST_LIMIT = 5;
export const READER_LIMIT = 10;

const GUEST_LIMIT_MESSAGE =
  "A guest can take bibliographic cards for 5 different titles from this address. Sign in to raise the limit.";
const READER_LIMIT_MESSAGE =
  "This reader has already taken bibliographic cards for 10 different titles.";

type TakeCardInput = {
  titleId: string;
  readerId?: string;
  guestIp?: string;
  unlimited?: boolean;
};

export async function takeCard(input: TakeCardInput): Promise<{ repeat: boolean }> {
  const whereActor = input.readerId
    ? { readerId: input.readerId }
    : { readerId: null, guestIp: input.guestIp ?? "unknown" };

  const prior = await prisma.download.findFirst({
    where: { ...whereActor, titleId: input.titleId },
  });
  if (prior) return { repeat: true };

  if (!input.unlimited) {
    const distinct = await prisma.download.findMany({
      where: whereActor,
      distinct: ["titleId"],
      select: { titleId: true },
    });
    const limit = input.readerId ? READER_LIMIT : GUEST_LIMIT;
    if (distinct.length >= limit) {
      throw new HttpError(403, input.readerId ? READER_LIMIT_MESSAGE : GUEST_LIMIT_MESSAGE);
    }
  }

  await prisma.download.create({
    data: {
      titleId: input.titleId,
      readerId: input.readerId ?? null,
      guestIp: input.readerId ? null : (input.guestIp ?? "unknown"),
    },
  });
  return { repeat: false };
}
