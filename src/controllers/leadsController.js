import { prisma } from '../config/db.js';
import bcrypt from 'bcryptjs';

// Fallback in-memory store when Prisma Lead model is unavailable
const mem = { leads: [] };
const supportedStatuses = ['New','In Review','Qualified','Closed'];
const supportedTypes = ['Prototype','Dealer','Media','Other'];

function canUsePrisma(){
  return Boolean(prisma?.lead);
}

function toPrismaStatus(uiStatus){
  // Map 'In Review' -> 'In_Review' for Prisma enum
  if (uiStatus === 'In Review') return 'In_Review';
  return uiStatus;
}

function fromPrismaStatus(dbStatus){
  if (dbStatus === 'In_Review') return 'In Review';
  return dbStatus;
}

function mapOut(item){
  if (!item) return item;
  return { ...item, status: fromPrismaStatus(item.status) };
}

export const listLeads = async (req, res) => {
  const { q: queryText = '', status = '', type = '', from = '', to = '' } = req.query;
  try {
    if (canUsePrisma()){
      const where = {};
      if (queryText) where.OR = [
        { name: { contains: String(queryText), mode: 'insensitive' } },
        { email: { contains: String(queryText), mode: 'insensitive' } },
        { company: { contains: String(queryText), mode: 'insensitive' } },
      ];
      if (status) where.status = toPrismaStatus(status);
      if (type) where.type = type;
      if (from || to) where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) { const dt = new Date(to); dt.setHours(23,59,59,999); where.createdAt.lte = dt; }
      const items = await prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' } });
      return res.json({ items: items.map(mapOut) });
    }
    // memory fallback
    let rows = [...mem.leads];
    if (queryText){ const searchTerm = String(queryText).toLowerCase(); rows = rows.filter(row => [row.name, row.email, row.company].some(val => (val||'').toLowerCase().includes(searchTerm))); }
    if (status) rows = rows.filter(row => row.status === status);
    if (type) rows = rows.filter(row => row.type === type);
    if (from){ const fromDate = new Date(from); rows = rows.filter(row => new Date(row.createdAt) >= fromDate); }
    if (to){ const toDate = new Date(to); toDate.setHours(23,59,59,999); rows = rows.filter(row => new Date(row.createdAt) <= toDate); }
    return res.json({ items: rows.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)) });
  } catch (err){
    return res.status(500).json({ error: 'Failed to list leads' });
  }
};

export const createLead = async (req, res) => {
  const { name, email, phone, company, country, type, message, tags, status = 'New', owner } = req.body || {};
  if (!name || !email || !supportedTypes.includes(type)) return res.status(400).json({ error:'Invalid payload' });
  try {
    if (canUsePrisma()){
      const item = await prisma.lead.create({ data: { name, email, phone, company, country, type, message, tags, status: toPrismaStatus(status), owner } });
      return res.status(201).json(mapOut(item));
    }
    const item = { id: String(Date.now()), name, email, phone, company, country, type, message, tags, status, owner, createdAt: new Date().toISOString().slice(0,10) };
    mem.leads.unshift(item);
    return res.status(201).json(item);
  } catch (err){
    return res.status(500).json({ error: 'Failed to create lead' });
  }
};

export const updateLead = async (req, res) => {
  const id = String(req.params.id);
  const patch = { ...req.body } || {};
  if (patch.status) patch.status = toPrismaStatus(patch.status);
  try {
    if (canUsePrisma()){
      const item = await prisma.lead.update({ where: { id }, data: patch });
      return res.json(mapOut(item));
    }
    const index = mem.leads.findIndex(item => item.id===id);
    if (index<0) return res.status(404).json({ error:'Not found' });
    mem.leads[index] = { ...mem.leads[index], ...req.body };
    return res.json(mem.leads[index]);
  } catch (err){
    return res.status(500).json({ error:'Failed to update lead' });
  }
};

export const deleteLead = async (req, res) => {
  const id = String(req.params.id);
  try {
    if (canUsePrisma()){
      await prisma.lead.delete({ where: { id } });
      return res.status(204).send();
    }
    mem.leads = mem.leads.filter(item => item.id!==id);
    return res.status(204).send();
  } catch (err){
    return res.status(500).json({ error:'Failed to delete lead' });
  }
};

export const setStatus = async (req, res) => {
  const id = String(req.params.id);
  const { status } = req.body || {};
  if (!supportedStatuses.includes(status)) return res.status(400).json({ error:'Invalid status' });
  try {
    if (canUsePrisma()){
      const item = await prisma.lead.update({ where:{ id }, data:{ status: toPrismaStatus(status) } });
      return res.json(mapOut(item));
    }
    const index = mem.leads.findIndex(item => item.id===id);
    if (index<0) return res.status(404).json({ error:'Not found' });
    mem.leads[index] = { ...mem.leads[index], status };
    return res.json(mem.leads[index]);
  } catch (err){
    return res.status(500).json({ error:'Failed to change status' });
  }
};

export const bulkDelete = async (req, res) => {
  const { ids = [] } = req.body || {};
  if (!Array.isArray(ids) || ids.length===0) return res.status(400).json({ error:'ids required' });
  try {
    if (canUsePrisma()){
      await prisma.lead.deleteMany({ where: { id: { in: ids.map(String) } } });
      return res.status(204).send();
    }
    mem.leads = mem.leads.filter(item => !ids.includes(item.id));
    return res.status(204).send();
  } catch (err){
    return res.status(500).json({ error:'Failed to bulk delete' });
  }
};

// POST /api/v1/leads/:id/accept-dealer
export const acceptDealer = async (req, res) => {
  const id = String(req.params.id);
  try {
    if (canUsePrisma()){
      const lead = await prisma.lead.findUnique({ where: { id } });
      if (!lead) return res.status(404).json({ error: 'Lead not found' });
      if (lead.type !== 'Dealer') return res.status(400).json({ error: 'Not a Dealer lead' });

      // Upsert user by email
      const existing = await prisma.user.findUnique({ where: { email: lead.email } });
      let user;
      if (existing){
        const roles = Array.isArray(existing.roles) ? Array.from(new Set([...existing.roles, 'dealer'])) : ['dealer'];
        const profile = { ...(existing.profile||{}), phone: lead.phone||'', company: lead.company||'', country: lead.country||'' };
        user = await prisma.user.update({ where: { email: lead.email }, data: { roles, profile } });
      } else {
        const temp = Math.random().toString(36).slice(2, 10) + 'D!';
        const hash = await bcrypt.hash(temp, 10);
        user = await prisma.user.create({ data: { email: lead.email, displayName: lead.name || lead.company || lead.email, roles: ['dealer'], passwordHash: hash, profile: { phone: lead.phone||'', company: lead.company||'', country: lead.country||'' } } });
      }

      // Ensure Dealer org is Active
      try {
        if (prisma?.dealer) {
          const existingDealer = await prisma.dealer.findFirst({ where: { contactEmail: lead.email } });
          if (existingDealer) {
            await prisma.dealer.update({ where: { id: existingDealer.id }, data: { org: lead.company || existingDealer.org, contactName: lead.name || existingDealer.contactName, region: lead.country || existingDealer.region || '', status: 'Active' } });
          } else {
            await prisma.dealer.create({ data: { org: lead.company || lead.name || lead.email, contactName: lead.name || '', contactEmail: lead.email, region: lead.country || '', status: 'Active', users: 1 } });
          }
        }
      } catch {}

      // Qualify the lead and tag accepted
      const updatedLead = await prisma.lead.update({ where: { id }, data: { status: 'Qualified', tags: Array.isArray(lead.tags) ? Array.from(new Set([...(lead.tags||[]), 'accepted'])) : ['accepted'] } });
      return res.json({ ok: true, userId: String(user.id), lead: mapOut(updatedLead) });
    }
    // Memory fallback
    const idx = mem.leads.findIndex(x => x.id===id);
    if (idx<0) return res.status(404).json({ error: 'Lead not found' });
    if (mem.leads[idx].type !== 'Dealer') return res.status(400).json({ error: 'Not a Dealer lead' });
    mem.leads[idx] = { ...mem.leads[idx], status: 'Qualified', tags: Array.from(new Set([...(mem.leads[idx].tags||[]), 'accepted'])) };
    return res.json({ ok: true, userId: null, lead: mem.leads[idx] });
  } catch (err){
    return res.status(500).json({ error: 'Failed to accept dealer' });
  }
};
