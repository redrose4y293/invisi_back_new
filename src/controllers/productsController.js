import { prisma } from '../config/db.js';

const mem = { items: [] };
function canUsePrisma(){ return Boolean(prisma?.product); }

export const listProducts = async (req, res) => {
  const { q = '', status = '' } = req.query;
  try{
    if (canUsePrisma()){
      const where = {};
      if (q) where.OR = [
        { name: { contains: String(q), mode:'insensitive' } },
        { code: { contains: String(q), mode:'insensitive' } },
        { slug: { contains: String(q), mode:'insensitive' } },
      ];
      if (status) where.status = status;
      const items = await prisma.product.findMany({ where, orderBy: { updatedAt: 'desc' } });
      return res.json({ items });
    }
    let rows = [...mem.items];
    if (q){ const s = String(q).toLowerCase(); rows = rows.filter(r => [r.name, r.code, r.slug].some(v => (v||'').toLowerCase().includes(s))); }
    if (status) rows = rows.filter(r => r.status === status);
    return res.json({ items: rows.sort((a,b)=> new Date(b.updatedAt||b.updated)-new Date(a.updatedAt||a.updated)) });
  }catch{ return res.status(500).json({ error:'Failed to list products' }); }
};

export const createProduct = async (req, res) => {
  const data = req.body || {};
  data.images = Array.isArray(data.images) ? data.images : (typeof data.images === 'string' ? data.images.split(',').map(s=>s.trim()).filter(Boolean) : []);
  try{
    if (canUsePrisma()){
      const item = await prisma.product.create({ data });
      return res.status(201).json(item);
    }
    const item = { id:String(Date.now()), ...data, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() };
    mem.items.unshift(item);
    return res.status(201).json(item);
  }catch{ return res.status(500).json({ error:'Failed to create product' }); }
};

export const updateProduct = async (req, res) => {
  const id = String(req.params.id);
  const patch = { ...req.body } || {};
  if (patch.images) patch.images = Array.isArray(patch.images) ? patch.images : String(patch.images).split(',').map(s=>s.trim()).filter(Boolean);
  try{
    if (canUsePrisma()){
      const item = await prisma.product.update({ where:{ id }, data: patch });
      return res.json(item);
    }
    const idx = mem.items.findIndex(x => x.id===id);
    if (idx<0) return res.status(404).json({ error:'Not found' });
    mem.items[idx] = { ...mem.items[idx], ...patch, updatedAt: new Date().toISOString() };
    return res.json(mem.items[idx]);
  }catch{ return res.status(500).json({ error:'Failed to update product' }); }
};

export const deleteProduct = async (req, res) => {
  const id = String(req.params.id);
  try{
    if (canUsePrisma()){
      await prisma.product.delete({ where:{ id } });
      return res.status(204).send();
    }
    mem.items = mem.items.filter(x => x.id!==id);
    return res.status(204).send();
  }catch{ return res.status(500).json({ error:'Failed to delete product' }); }
};
