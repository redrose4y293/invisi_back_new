import { prisma } from '../config/db.js';
import { fromCursor, toCursor } from '../utils/pagination.js';

const canTransition = (from, to) => {
  const order = ['created', 'scheduled', 'in_progress', 'completed', 'archived'];
  const i = order.indexOf(from);
  const j = order.indexOf(to);
  return i !== -1 && j !== -1 && j >= i && !(from === 'archived' && to !== 'archived');
};

export const createInstallation = async (req, res) => {
  const { siteName, address, customerInfo, scheduledAt, metadata } = req.body;
  const inst = await prisma.installation.create({ data: { siteName, address, customerInfo, scheduledAt: scheduledAt ? new Date(scheduledAt) : null, notes: metadata?.notes || null, dealerId: req.user?.id || null } });
  res.status(201).json({ id: inst.id, status: inst.status });
};

export const listInstallations = async (req, res) => {
  const { dealerId, status, limit = 20, cursor } = req.query;
  const take = Math.min(Number(limit), 100);
  const where = {
    ...(status ? { status } : {}),
    ...((req.user?.roles || []).includes('admin') ? (dealerId ? { dealerId: String(dealerId) } : {}) : { dealerId: req.user?.id || '' })
  };
  const cursorId = fromCursor(cursor);
  const items = await prisma.installation.findMany({ where, orderBy: { id: 'asc' }, take: take + 1, ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}) });
  const hasNext = items.length > take;
  const slice = hasNext ? items.slice(0, take) : items;
  const nextCursor = hasNext ? toCursor(slice[slice.length - 1].id) : null;
  res.json({ items: slice, nextCursor });
};

export const getInstallation = async (req, res) => {
  const id = String(req.params.id);
  const inst = await prisma.installation.findUnique({ where: { id }, include: { reports: true } });
  if (!inst) return res.status(404).json({ error: 'Not found' });
  if (!((req.user?.roles || []).includes('admin') || inst.dealerId === req.user?.id)) return res.status(403).json({ error: 'Forbidden' });
  res.json(inst);
};

export const updateInstallation = async (req, res) => {
  const id = String(req.params.id);
  const data = req.body;
  const current = await prisma.installation.findUnique({ where: { id } });
  if (!current) return res.status(404).json({ error: 'Not found' });
  if (data.status && !canTransition(current.status, data.status)) return res.status(400).json({ error: 'Invalid status transition' });
  const updated = await prisma.installation.update({ where: { id }, data: { status: data.status || current.status, notes: data.notes ?? current.notes, scheduledAt: data.scheduleUpdate ? new Date(data.scheduleUpdate) : current.scheduledAt } });
  res.json(updated);
};

export const attachReport = async (req, res) => {
  const installationId = String(req.params.id);
  const { uploadObjectKey, reportType, notes } = req.body;
  const inst = await prisma.installation.findUnique({ where: { id: installationId } });
  if (!inst) return res.status(404).json({ error: 'Installation not found' });
  if (!((req.user?.roles || []).includes('admin') || inst.dealerId === req.user?.id)) return res.status(403).json({ error: 'Forbidden' });
  const report = await prisma.report.create({ data: { installationId, uploadObjectKey, reportType, notes } });
  res.status(201).json(report);
};
