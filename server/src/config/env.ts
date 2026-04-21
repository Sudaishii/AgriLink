import dotenv from "dotenv";

// Load .env file
dotenv.config();

// List all required environment variables
const requiredEnvVars = [
  "PORT",
  "DB_HOST",
  "DB_USER",
  "DB_NAME",
  "JWT_SECRET",
];

// Check that all required variables exist
requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
});


export const ENV = {
  PORT: Number(process.env.PORT),               
  DB_HOST: process.env.DB_HOST as string,
  DB_USER: process.env.DB_USER as string,
  DB_PASSWORD: process.env.DB_PASSWORD || "",  
  DB_NAME: process.env.DB_NAME as string,
  JWT_SECRET: process.env.JWT_SECRET as string,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1d", 
};