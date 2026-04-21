"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const env_1 = require("../config/env");
exports.db = promise_1.default.createPool({
    host: env_1.ENV.DB_HOST,
    user: env_1.ENV.DB_USER,
    password: env_1.ENV.DB_PASSWORD,
    database: env_1.ENV.DB_NAME,
});
