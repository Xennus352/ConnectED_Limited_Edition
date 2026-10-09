import bcrypt from "bcryptjs";

const ROUNDS = 10;

export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, ROUNDS);

export const comparePassword = (
  plain: string,
  hashed: string
): Promise<boolean> => bcrypt.compare(plain, hashed);
