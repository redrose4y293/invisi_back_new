import { prisma } from '../config/db.js';
import bcrypt from 'bcryptjs';

const mem = { dealers: [] };
const dealerStatuses = ['Pending','Active','Suspended'];

function canUsePrisma(){ return Boolean(prisma?.dealer); }

export const listDealers = async (req, res) => {
  const { q = '', status = '', region = '' } = req.query;
  try{
    if (canUsePrisma()){
      const where = {};
      if (q) where.OR = [
        { org: { contains: String(q), mode: 'insensitive' } },
        { contactName: { contains: String(q), mode: 'insensitive' } },
        { contactEmail: { contains: String(q), mode: 'insensitive' } },
        { region: { contains: String(q), mode: 'insensitive' } },
      ];
      if (status) where.status = status;
      if (region) where.region = region;
      const items = await prisma.dealer.findMany({ where, orderBy: { updatedAt: 'desc' } });
      return res.json({ items });
    }
    let rows = [...mem.dealers];
    if (q){ const s = String(q).toLowerCase(); rows = rows.filter(r => [r.org, r.contactName, r.contactEmail, r.region].some(v => (v||'').toLowerCase().includes(s))); }
    if (status) rows = rows.filter(r => r.status === status);
    if (region) rows = rows.filter(r => r.region === region);
    return res.json({ items: rows.sort((a,b)=> new Date(b.last)-new Date(a.last)) });
  }catch(e){
    return res.status(500).json({ error:'Failed to list dealers' });
  }
};

export const createDealer = async (req, res) => {
  const { org, contactName, email, region } = req.body || {};
  if (!org || !contactName || !email || !region) return res.status(400).json({ error:'Invalid payload' });
  try{
    if (canUsePrisma()){
      const item = await prisma.dealer.create({ data: { org, contactName, contactEmail: email, region, status:'Pending', users: 0, last: new Date() } });
      return res.status(201).json(item);
    }
    const item = { id: String(Date.now()), org, contactName, contactEmail: email, region, status:'Pending', users:0, last: new Date().toISOString().slice(0,10) };
    mem.dealers.unshift(item);
    return res.status(201).json(item);
  }catch(e){
    return res.status(500).json({ error:'Failed to create dealer' });
  }
};

export const updateDealer = async (req, res) => {
  const id = String(req.params.id);
  const patch = req.body || {};
  try{
    if (canUsePrisma()){
      const item = await prisma.dealer.update({ where:{ id }, data: patch });
      return res.json(item);
    }
    const idx = mem.dealers.findIndex(d => d.id===id);
    if (idx<0) return res.status(404).json({ error:'Not found' });
    mem.dealers[idx] = { ...mem.dealers[idx], ...patch };
    return res.json(mem.dealers[idx]);
  }catch(e){ return res.status(500).json({ error:'Failed to update dealer' }); }
};

export const setDealerStatus = async (req, res) => {
  const id = String(req.params.id);
  const { status } = req.body || {};
  if (!dealerStatuses.includes(status)) return res.status(400).json({ error:'Invalid status' });
  try{
    if (canUsePrisma()){
      const item = await prisma.dealer.update({ where:{ id }, data:{ status } });
      return res.json(item);
    }
    const idx = mem.dealers.findIndex(d => d.id===id);
    if (idx<0) return res.status(404).json({ error:'Not found' });
    mem.dealers[idx] = { ...mem.dealers[idx], status };
    return res.json(mem.dealers[idx]);
  }catch(e){ return res.status(500).json({ error:'Failed to change status' }); }
};

export const deleteDealer = async (req, res) => {
  const id = String(req.params.id);
  try{
    if (canUsePrisma()){
      await prisma.dealer.delete({ where:{ id } });
      return res.status(204).send();
    }
    mem.dealers = mem.dealers.filter(d => d.id!==id);
    return res.status(204).send();
  }catch(e){ return res.status(500).json({ error:'Failed to delete dealer' }); }
};

export const bulkDeleteDealers = async (req, res) => {
  const { ids = [] } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error:'ids required' });
  try{
    if (canUsePrisma()){
      await prisma.dealer.deleteMany({ where: { id: { in: ids.map(String) } } });
      return res.status(204).send();
    }
    mem.dealers = mem.dealers.filter(d => !ids.includes(d.id));
    return res.status(204).send();
  }catch(e){ return res.status(500).json({ error:'Failed to bulk delete' }); }
};

// POST /api/v1/dealers/:id/approve
export const approveDealer = async (req, res) => {
  const id = String(req.params.id);
  try{
    if (!canUsePrisma()) return res.status(200).json({ ok:true });
    const dealer = await prisma.dealer.findUnique({ where: { id } });
    if (!dealer) return res.status(404).json({ error:'Dealer not found' });
    const contactEmail = dealer.contactEmail;
    // Try to fetch latest Dealer lead for phone/company/country
    const lead = await prisma.lead.findFirst({ where: { email: contactEmail, type: 'Dealer' }, orderBy: { createdAt: 'desc' } });
    // Upsert user
    const existing = await prisma.user.findUnique({ where: { email: contactEmail } });
    let user;
    if (existing){
      const roles = Array.isArray(existing.roles) ? Array.from(new Set([...existing.roles, 'dealer'])) : ['dealer'];
      const profile = { ...(existing.profile||{}), phone: lead?.phone||existing?.profile?.phone||'', company: lead?.company||existing?.profile?.company||dealer.org||'', country: lead?.country||existing?.profile?.country||'' };
      user = await prisma.user.update({ where: { email: contactEmail }, data: { roles, profile } });
    } else {
      const temp = Math.random().toString(36).slice(2, 10) + 'D!';
      const hash = await bcrypt.hash(temp, 10);
      user = await prisma.user.create({ data: { email: contactEmail, displayName: dealer.contactName || dealer.org, roles: ['dealer'], passwordHash: hash, profile: { phone: lead?.phone||'', company: lead?.company||dealer.org||'', country: lead?.country||'' } } });
    }
    // Activate dealer
    await prisma.dealer.update({ where: { id }, data: { status: 'Active' } });
    // Qualify lead
    if (lead){ await prisma.lead.update({ where: { id: lead.id }, data: { status: 'Qualified', tags: Array.isArray(lead.tags) ? Array.from(new Set([...(lead.tags||[]), 'accepted'])) : ['accepted'] } }); }
    return res.json({ ok:true, userId: String(user.id) });
  }catch(e){ return res.status(500).json({ error:'Failed to approve dealer' }); }
};

// GET /api/v1/dealers/:id/detail
export const getDealerDetail = async (req, res) => {
  const id = String(req.params.id);
  try{
    if (!canUsePrisma()) return res.json({});
    const dealer = await prisma.dealer.findUnique({ where: { id } });
    if (!dealer) return res.status(404).json({ error:'Dealer not found' });
    const contactEmail = dealer.contactEmail;
    const user = await prisma.user.findUnique({ where: { email: contactEmail }, include: { profile: true } });
    // fallback phone from latest lead
    let phone = user?.profile?.phone || '';
    if (!phone){
      const lead = await prisma.lead.findFirst({ where: { email: contactEmail, type: 'Dealer' }, orderBy: { createdAt: 'desc' } });
      phone = lead?.phone || '';
    }
    return res.json({ id: dealer.id, org: dealer.org, contactName: dealer.contactName, contactEmail: dealer.contactEmail, phone, region: dealer.region, status: dealer.status, users: dealer.users, last: dealer.updatedAt });
  }catch(e){ return res.status(500).json({ error:'Failed to load detail' }); }
};
