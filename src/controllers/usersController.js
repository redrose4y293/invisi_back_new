import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { fromCursor, toCursor } from '../utils/pagination.js';

export const listUsers = async (req, res) => {
  const { limit = 20, cursor, q } = req.query;
  const take = Math.min(Number(limit), 100);
  const where = {
    deletedAt: null,
    ...(q ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { displayName: { contains: q, mode: 'insensitive' } }] } : {})
  };
  const cursorId = fromCursor(cursor);
  const users = await prisma.user.findMany({
    where,
    orderBy: { id: 'asc' },
    take: take + 1,
    ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {})
  });
  const hasNext = users.length > take;
  const items = hasNext ? users.slice(0, take) : users;
  const nextCursor = hasNext ? toCursor(items[items.length - 1].id) : null;
  res.json({ items, nextCursor });
};

export const createUser = async (req, res) => {
  const { email, displayName, roles = [], password = 'ChangeMe123!' } = req.body;
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, displayName, roles, passwordHash } });
  res.status(201).json(user);
};

export const getUser = async (req, res) => {
  const id = String(req.params.id);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) return res.status(404).json({ error: 'Not found' });
  res.json(user);
};

export const updateUser = async (req, res) => {
  const id = String(req.params.id);
  const data = { ...req.body };
  if (data.password) {
    data.passwordHash = await bcrypt.hash(data.password, 10);
    delete data.password;
  }
  const user = await prisma.user.update({ where: { id }, data });
  res.json(user);
};

export const deleteUser = async (req, res) => {
  const id = String(req.params.id);
  await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  res.status(204).send();
};
