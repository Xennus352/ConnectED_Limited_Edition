import jwt from "jsonwebtoken";
import config from "../config/env";

export type AuthModel = "Admin" | "Teacher" | "Student" | "Parent" | "Driver";

export interface TokenPayload {
  sub: string;
  role: string;
  model: AuthModel;
}

export const signToken = (payload: TokenPayload): string =>
  jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });

export const verifyToken = (token: string): TokenPayload =>
  jwt.verify(token, config.jwtSecret) as TokenPayload;
