import bcrypt from "bcryptjs";

const PASSWORD_ROUNDS = 12;

export function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (password.length > 128) {
    return "Password must be 128 characters or fewer.";
  }
  return null;
}

export function hashPassword(password) {
  return bcrypt.hash(password, PASSWORD_ROUNDS);
}

export function verifyPassword(password, passwordHash) {
  if (!passwordHash || typeof password !== "string") return false;
  return bcrypt.compare(password, passwordHash);
}
