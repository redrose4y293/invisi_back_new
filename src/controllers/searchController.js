import { prisma } from '../config/db.js';

export const search = async (req, res) => {
  const { q = '', type, limit = 20 } = req.query;
  const take = Math.min(Number(limit), 50);
  let items = [];
  if (!type || type === 'pages') {
    items = await prisma.page.findMany({ where: { OR: [{ title: { contains: q, mode: 'insensitive' } }, { body: { contains: q, mode: 'insensitive' } }] }, take, select: { id: true, slug: true, title: true, status: true } });
  }
  if (type === 'users') {
    items = await prisma.user.findMany({ where: { OR: [{ email: { contains: q, mode: 'insensitive' } }, { displayName: { contains: q, mode: 'insensitive' } }] }, take, select: { id: true, email: true, displayName: true } });
  }
  if (type === 'installations') {
    items = await prisma.installation.findMany({ where: { OR: [{ siteName: { contains: q, mode: 'insensitive' } }, { notes: { contains: q, mode: 'insensitive' } }] }, take, select: { id: true, siteName: true, status: true } });
  }
  res.json({ items, nextCursor: null });
};

export const suggest = async (req, res) => {
  const { q = '' } = req.query;
  const pages = await prisma.page.findMany({ where: { title: { contains: q, mode: 'insensitive' } }, take: 5, select: { title: true, slug: true } });
  res.json({ suggestions: pages.map(p => ({ label: p.title, value: p.slug })) });
};
