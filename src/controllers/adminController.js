import { prisma } from '../config/db.js';
import { signAccessToken } from '../utils/jwt.js';

export const stats = async (req, res) => {
  const since30d = new Date(Date.now() - 30*24*60*60*1000);
  try {
    const [
      totalLeads,
      activeDealers,
      proto30d,
      downloads30d,
    ] = await Promise.all([
      prisma.lead?.count ? prisma.lead.count() : Promise.resolve(0),
      prisma.dealer?.count ? prisma.dealer.count({ where: { status: 'Active' } }) : Promise.resolve(0),
      prisma.lead?.count ? prisma.lead.count({ where: { type: 'Prototype', createdAt: { gte: since30d } } }) : Promise.resolve(0),
      prisma.uploadAsset?.count ? prisma.uploadAsset.count({ where: { createdAt: { gte: since30d } } }) : Promise.resolve(0)
    ]);
    return res.json({ totalLeads, activeDealers, proto30d, downloads30d });
  } catch {
    return res.json({ totalLeads: 0, activeDealers: 0, proto30d: 0, downloads30d: 0 });
  }
};

export const events = async (req, res) => {
  const { limit = 50, cursor } = req.query;
  const take = Math.min(Number(limit), 100);
  try {
    const items = await prisma.auditEvent.findMany({ orderBy: { id: 'desc' }, take });
    return res.json({ items, nextCursor: null });
  } catch {
    return res.json({ items: [], nextCursor: null });
  }
};

export const impersonate = async (req, res) => {
  const userId = String(req.params.id);
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const token = signAccessToken({ sub: user.id, roles: user.roles, impBy: req.user.id });
    await prisma.auditEvent.create({ data: { actorId: req.user.id, action: 'impersonate', target: `user:${user.id}`, meta: { roles: user.roles } } });
    return res.json({ token });
  } catch {
    return res.status(503).json({ error: 'Impersonation unavailable' });
  }
};

