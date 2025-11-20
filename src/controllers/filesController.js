import { prisma } from '../config/db.js';

// Shared in-memory store (when Prisma model is unavailable)
const mem = (globalThis.__filesMem ||= { items: [] });
const types = ['PDF','Video','Image','Other'];
const cats = ['NDA','Spec','Report','Marketing'];
const visibilities = ['Public','Dealer','Admin'];

function canUsePrisma(){ return Boolean(prisma?.fileAsset); }

export const listFiles = async (req, res) => {
  const { q = '', type = '', cat = '', vis = '' } = req.query;
  try{
    if (canUsePrisma()){
      try {
        const where = {};
        if (q) where.OR = [
          { name: { contains: String(q), mode:'insensitive' } },
          { desc: { contains: String(q), mode:'insensitive' } },
        ];
        if (type) where.type = type;
        if (cat) where.cat = cat;
        if (vis) where.vis = vis;
        const items = await prisma.fileAsset.findMany({ where, orderBy: { updatedAt: 'desc' } });
        return res.json({ items });
      } catch {/* fall through to mem */}
    }
    let rows = [...mem.items];
    if (q){ const s = String(q).toLowerCase(); rows = rows.filter(r => [r.name, r.cat, r.type, r.vis, r.desc].some(v => String(v||'').toLowerCase().includes(s))); }
    if (type) rows = rows.filter(r => r.type === type);
    if (cat) rows = rows.filter(r => r.cat === cat);
    if (vis) rows = rows.filter(r => r.vis === vis);
    return res.json({ items: rows.sort((a,b)=> new Date(b.updated)-new Date(a.updated)) });
  }catch{ return res.status(500).json({ error:'Failed to list files' }); }
};

export const createFile = async (req, res) => {
  const { name, type, cat, vis, url, desc } = req.body || {};
  if (!name || !types.includes(type) || !cats.includes(cat) || !visibilities.includes(vis) || !url) return res.status(400).json({ error:'Invalid payload' });
  try{
    if (canUsePrisma()){
      try { const item = await prisma.fileAsset.create({ data: { name, type, cat, vis, url, desc, size: null } }); return res.status(201).json(item); }
      catch {/* fall back to mem */}
    }
    const item = { id:String(Date.now()), name, type, cat, vis, url, desc, size:'-', updated:new Date().toISOString().slice(0,10) };
    mem.items.unshift(item);
    return res.status(201).json(item);
  }catch{ return res.status(500).json({ error:'Failed to create file' }); }
};

export const updateFile = async (req, res) => {
  const id = String(req.params.id);
  const patch = req.body || {};
  try{
    if (canUsePrisma()){
      try { const item = await prisma.fileAsset.update({ where:{ id }, data: patch }); return res.json(item); }
      catch {/* fall back to mem */}
    }
    let idx = mem.items.findIndex(x => String(x.id)===id);
    if (idx<0) idx = mem.items.findIndex(x => x.url===patch.url || x.name===patch.name);
    if (idx<0) return res.status(404).json({ error:'Not found' });
    mem.items[idx] = { ...mem.items[idx], ...patch, updated: new Date().toISOString().slice(0,10) };
    return res.json(mem.items[idx]);
  }catch{ return res.status(500).json({ error:'Failed to update file' }); }
};

export const deleteFile = async (req, res) => {
  const id = String(req.params.id);
  try{
    if (canUsePrisma()){
      try { await prisma.fileAsset.delete({ where:{ id } }); return res.status(204).send(); }
      catch (e) {
        console.error(e);
        // fall back to mem
      }
    }
    mem.items = mem.items.filter(x => String(x.id)!==id);
    return res.status(204).send();
  }catch{ return res.status(500).json({ error:'Failed to delete file' }); }
};

export const bulkDeleteFiles = async (req, res) => {
  const { ids = [] } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error:'ids required' });
  try{
    if (canUsePrisma()){
      try { await prisma.fileAsset.deleteMany({ where: { id: { in: ids.map(String) } } }); return res.status(204).send(); }
      catch {/* fall back to mem */}
    }
    mem.items = mem.items.filter(x => !ids.includes(String(x.id)));
    return res.status(204).send();
  }catch{ return res.status(500).json({ error:'Failed to bulk delete' }); }
};

// GET /api/v1/files/:id/download
export const downloadFile = async (req, res) => {
  const id = String(req.params.id);
  try {
    let item = null;
    if (canUsePrisma()){
      try { item = await prisma.fileAsset.findUnique({ where:{ id } }); } catch {}
    }
    if (!item){ item = (mem.items||[]).find(x => String(x.id)===id); }
    if (!item || !item.url){
      return res.status(404).json({ error: 'File not found or not downloadable' });
    }
    const url = String(item.url);
    const filename = String(item.name||'download');
    
    // Handle browser-only blob: URLs gracefully
    if (url.startsWith('blob:')){
      return res.status(400).json({ error: 'Cannot download browser blob URL. Please upload as a file or data URL.' });
    }

    // Support data URLs (base64) stored from admin upload
    if (url.startsWith('data:')){
      const m = url.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) return res.status(400).json({ error: 'Invalid data URL' });
      const ct = m[1] || 'application/octet-stream';
      const b64 = m[2];
      const buf = Buffer.from(b64, 'base64');
      res.setHeader('Content-Type', ct);
      res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g,'')}"`);
      res.setHeader('Content-Length', String(buf.length));
      return res.end(buf);
    }

    // Fallback: fetch from http/https and stream
    const resp = await fetch(url);
    if (!resp.ok || !resp.body){
      return res.status(502).json({ error: 'Upstream file unavailable' });
    }
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g,'')}"`);
    const ct = resp.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);
    resp.body.pipe(res);
  } catch {
    return res.status(500).json({ error: 'Failed to download file' });
  }
};
