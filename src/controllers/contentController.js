import { prisma } from '../config/db.js';
import { sendWithEtag } from '../utils/http.js';

export const listPages = async (req, res) => {
  const { status = 'published', slug, limit = 50 } = req.query;
  const where = { ...(slug ? { slug } : {}) };
  if (status && status !== 'all') where.status = status;
  try {
    const items = await prisma.page.findMany({ where, take: Math.min(Number(limit), 100), orderBy: { id: 'desc' } });
    return sendWithEtag(res, { items });
  } catch {
    // No-DB fallback
    return sendWithEtag(res, { items: [] });
  }
};

export const getPageBySlug = async (req, res) => {
  try {
    const page = await prisma.page.findUnique({ where: { slug: req.params.slug } });
    if (!page || page.status !== 'published') return res.status(404).json({ error: 'Not found' });
    return sendWithEtag(res, page);
  } catch {
    return res.status(404).json({ error: 'Not found' });
  }
};

export const createPage = async (req, res) => {
  const { title, slug, body, status = 'draft', meta } = req.body;
  try {
    let createdById = req.user?.id;
    if (!createdById) {
      // Ensure a system user exists to satisfy required createdBy relation
      let system = await prisma.user.findUnique({ where: { email: 'system@invisishield.local' } }).catch(()=>null);
      if (!system) {
        system = await prisma.user.create({ data: { email: 'system@invisishield.local', passwordHash: '!', displayName: 'System', roles: ['admin'], profile: { system: true } } });
      }
      createdById = system.id;
    }
    const data = { title, slug, body, status, meta, publishedAt: status === 'published' ? new Date() : null, createdById, updatedById: createdById };
    const page = await prisma.page.create({ data });
    return res.status(201).json(page);
  } catch {
    return res.status(503).json({ error: 'Content service unavailable' });
  }
};

export const updatePage = async (req, res) => {
  const id = String(req.params.id);
  const { title, slug, body, status, meta } = req.body;
  const data = {};
  if (title !== undefined) data.title = title;
  if (slug !== undefined) data.slug = slug;
  if (body !== undefined) data.body = body;
  if (status !== undefined) data.status = status;
  if (meta !== undefined) data.meta = meta;
  if (req.user?.id) data.updatedById = req.user.id;
  if (status === 'published') data.publishedAt = new Date();
  if (status === 'draft') data.publishedAt = null;
  try {
    const page = await prisma.page.update({ where: { id }, data });
    return res.json(page);
  } catch (e) {
    console.error('Update page error:', e);
    return res.status(503).json({ error: e?.message || 'Content service unavailable' });
  }
};

export const deletePage = async (req, res) => {
  const id = String(req.params.id);
  try {
    await prisma.page.delete({ where: { id } });
    return res.status(204).send();
  } catch {
    return res.status(503).json({ error: 'Content service unavailable' });
  }
};

