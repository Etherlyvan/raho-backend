import dotenv from "dotenv";
dotenv.config();

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env: ${key}`);
  return value;
};

export const env = {
  NODE_ENV:               process.env.NODE_ENV || "development",
  PORT:                   parseInt(process.env.PORT || "3000", 10),
  API_PREFIX:             process.env.API_PREFIX || "/api",
  DATABASE_URL:           required("DATABASE_URL"),
  JWT_SECRET:             required("JWT_SECRET"),
  JWT_EXPIRES_IN:         process.env.JWT_EXPIRES_IN || "7d",
  JWT_REFRESH_SECRET:     required("JWT_REFRESH_SECRET"),
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  BCRYPT_SALT_ROUNDS:     parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10),
  CORS_ORIGIN:            process.env.CORS_ORIGIN || "http://localhost:3001",
} as const;
