import jwt, { SignOptions } from 'jsonwebtoken';

const ACCESS_SECRET = process.env.ACCESS_SECRET || 'your_access_secret_key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your_refresh_secret_key';

// Hàm tạo accessToken
export function signAccessToken(payload: object, expiresIn: string = '15m') {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn } as SignOptions);
}

// Hàm tạo refreshToken
export function signRefreshToken(payload: object, expiresIn: string = '7d') {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn } as SignOptions);
}

// Hàm xác minh accessToken
export function verifyAccessToken(token: string) {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

// Hàm xác minh refreshToken
export function verifyRefreshToken(token: string) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}
