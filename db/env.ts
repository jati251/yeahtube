import path from "path";
import dotenv from "dotenv";

const projectRoot = path.resolve(__dirname, "..");
dotenv.config({ path: path.resolve(projectRoot, ".env") });
dotenv.config({ path: path.resolve(projectRoot, ".env.local"), override: true });
