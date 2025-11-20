import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export const signAccessToken = (payload) => jwt.sign(payload, config.jwt.accessSecret, { expiresIn: config.jwt.accessTtl });
export const signRefreshToken = (payload) => jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshTtl });
export const verifyAccessToken = (token) => jwt.verify(token, config.jwt.accessSecret);
export const verifyRefreshToken = (token) => jwt.verify(token, config.jwt.refreshSecret);
