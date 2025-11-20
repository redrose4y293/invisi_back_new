import { prisma } from '../config/db.js';
import { signAccessToken, signRefreshToken } from '../utils/jwt.js';
import bcrypt from 'bcryptjs';

// In-memory fallbacks so UI works without DB ready
const mem = {
  uploads: [],
  training: {
    upcoming: [],
    past: [],
  },
  leads: [],
};

function canUsePrisma() {
  return Boolean(prisma?.fileAsset);
}

// GET /api/v1/dealer/files
export const dealerListFiles = async (req, res) => {
  const { q = '', type = 'all' } = req.query || {};
  const mapType = (t) => {
    const T = String(t || '').toLowerCase();
    if (T === 'pdf') return 'pdf';
    if (T === 'image') return 'image';
    if (T === 'video') return 'other';
    if (T === 'other') return 'other';
    if (T === 'docx' || T === 'doc') return 'docx';
    if (T === 'zip') return 'zip';
    return 'other';
  };
  try {
    if (canUsePrisma()) {
      const where = {
        OR: [
          { vis: 'Dealer' },
          { vis: 'Public' },
        ],
      };
      if (q) where.AND = [{ OR: [
        { name: { contains: String(q), mode: 'insensitive' } },
        { desc: { contains: String(q), mode: 'insensitive' } },
      ] }];
      const items = await prisma.fileAsset.findMany({ where, orderBy: { updatedAt: 'desc' } });
      const out = items.map((r) => ({
        id: String(r.id),
        name: r.name,
        type: mapType(r.type),
        href: r.url,
        size: r.size || '-',
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : '-',
      })).filter((x) => type === 'all' ? true : x.type === String(type).toLowerCase());
      return res.json({ items: out });
    }
    // Memory fallback: read shared files memory populated by filesController
    const memFiles = (globalThis.__filesMem && Array.isArray(globalThis.__filesMem.items)) ? globalThis.__filesMem.items : [];
    const visOk = (v)=> (v==='Dealer' || v==='Public');
    const mapped = memFiles
      .filter(it => visOk(it.vis))
      .filter(it => q ? [it.name, it.cat, it.type, it.desc].some(v => String(v||'').toLowerCase().includes(String(q).toLowerCase())) : true)
      .map((r) => ({
        id: String(r.id),
        name: r.name,
        type: mapType(r.type),
        href: r.url,
        size: r.size || '-',
        updatedAt: (r.updatedAt || r.updated || '').slice ? (r.updatedAt || r.updated).slice(0,10) : '-',
      }))
      .filter((x) => type === 'all' ? true : x.type === String(type).toLowerCase());
    return res.json({ items: mapped });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list dealer files' });
  }
};

// POST /api/v1/dealer/upload (simple intake that marks as pending)
export const dealerUpload = async (req, res) => {
  try {
    const { name = '', category = 'Testing Report', description = '' } = req.body || {};
    // Use Lead as a submission container (tagged 'dealer_upload')
    try {
      if (prisma?.lead) {
        const created = await prisma.lead.create({ data: { name, email: req.user.email, phone: req.user?.profile?.phone || '', company: req.user?.profile?.company || '', country: req.user?.profile?.country || '', type: 'Other', message: description || `Dealer upload: ${category}`, tags: ['dealer_upload', category], status: 'New', owner: req.user.id } });
        return res.status(200).json({ id: String(created.id), status: 'Pending' });
      }
    } catch {}
    // Memory fallback
    const id = String(Date.now());
    const row = { id, email: req.user?.email||'', name, category, description, tags:['dealer_upload', category], status: 'Pending', createdAt: new Date().toISOString() };
    mem.uploads.unshift(row);
    return res.status(200).json({ id, status: row.status });
  } catch {
    return res.status(500).json({ error: 'Upload failed' });
  }
};

// GET /api/v1/dealer/uploads
export const dealerListUploads = async (req, res) => {
  try {
    try {
      if (prisma?.lead) {
        const items = await prisma.lead.findMany({ where: { email: { equals: req.user.email, mode: 'insensitive' }, OR: [ { tags: { has: 'dealer_upload' } }, { message: { contains: 'Dealer upload', mode: 'insensitive' } } ] }, orderBy: { createdAt: 'desc' } });
        // Map Lead.status -> Pending/Approved/Rejected for dealer view
        const mapped = items.map(l => ({ id: String(l.id), name: l.name, category: (l.tags||[])[1] || 'Upload', description: l.message || '', status: l.status==='Qualified' ? 'Approved' : (l.status==='Closed' ? 'Rejected' : 'Pending'), createdAt: l.createdAt }));
        return res.json({ items: mapped });
      }
    } catch {}
    return res.json({ items: mem.uploads.filter(x => x.email === req.user.email) });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch uploads' });
  }
};

// GET /api/v1/dealer/training
export const dealerTraining = async (req, res) => {
  try {
    // Use Page model as training content source (meta.type=='training' or slug starts with 'training-')
    try {
      if (prisma?.page) {
        const all = await prisma.page.findMany();
        const published = all.filter(p => {
          const s = (p.status||'').toString().toLowerCase();
          return s === 'published' || s === 'publshed' || s === 'live';
        });
        let trainings = published.filter(p => {
          let meta = p.meta || {};
          if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch { meta = {}; } }
          const t = (meta?.type || '').toString().toLowerCase();
          const slug = String(p.slug||'').toLowerCase();
          const title = String(p.title||'').toLowerCase();
          return t === 'training' || slug.includes('training') || title.includes('training');
        }).map(p => {
          let meta = p.meta || {};
          if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch { meta = {}; } }
          return ({ id: String(p.id), title: p.title, datetime: (meta.datetime)||null, mode: (meta.mode)||'Online' });
        });
        if (!trainings.length) {
          trainings = published.map(p => {
            let meta = p.meta || {};
            if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch { meta = {}; } }
            return ({ id: String(p.id), title: p.title, datetime: (meta.datetime)||null, mode: (meta.mode)||'Online' });
          });
        }
        if (!trainings.length) {
          trainings = all.map(p => {
            let meta = p.meta || {};
            if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch { meta = {}; } }
            return ({ id: String(p.id), title: p.title, datetime: (meta.datetime)||null, mode: (meta.mode)||'Online' });
          });
        }
        // Normalize dates (accept DD-MM-YYYY and similar); invalid -> treat as no date
        const toTs = (val)=>{
          if (!val) return null;
          const d1 = new Date(val); const ts1 = d1.getTime();
          if (!isNaN(ts1)) return ts1;
          const s = String(val).trim();
          const m = s.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
          if (m){
            const dd = Number(m[1]); const mm = Number(m[2]); const yyyy = Number(m[3]);
            const hh = m[4]? Number(m[4]) : 9; const min = m[5]? Number(m[5]) : 0;
            const iso = new Date(Date.UTC(yyyy, mm-1, dd, hh, min));
            const ts2 = iso.getTime();
            if (!isNaN(ts2)) return ts2;
          }
          return null;
        };
        const now = Date.now();
        const upcoming = trainings.filter(t => {
          const ts = toTs(t.datetime);
          return ts === null ? true : ts >= now;
        });
        const past = trainings.filter(t => {
          const ts = toTs(t.datetime);
          return ts !== null && ts < now;
        });
        if (!upcoming.length && !past.length) {
          const now = new Date();
          return res.json({ upcoming: [ { id: 'sample', title: 'Training', datetime: new Date(now.getFullYear(), now.getMonth(), now.getDate()+7, 10, 0).toISOString(), mode: 'Online' } ], past: [] });
        }
        const normalizeOut = (arr)=> arr.map(ev => {
          const ts = toTs(ev.datetime);
          return { ...ev, datetime: ts ? new Date(ts).toISOString() : '' };
        });
        return res.json({ upcoming: normalizeOut(upcoming), past: normalizeOut(past) });
      }
    } catch {}
    // memory fallback
    if (!mem.training.upcoming.length && !mem.training.past.length) {
      const now = new Date();
      mem.training.upcoming = [
        { id: 'e1', title: 'Installation Basics', datetime: new Date(now.getFullYear(), now.getMonth(), now.getDate()+7, 10, 0).toISOString(), mode: 'Online' },
      ];
      mem.training.past = [];
    }
    return res.json({ upcoming: mem.training.upcoming, past: mem.training.past });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch training' });
  }
};

// POST /api/v1/dealer/training/register
export const dealerRegisterTraining = async (req, res) => {
  try {
    const { eventId, note = '' } = req.body || {};
    // Store registration as an AuditEvent for trace (no schema change)
    try { if (prisma?.auditEvent){ await prisma.auditEvent.create({ data: { actorId: req.user.id, action: 'training_register', target: `event:${eventId}`, meta: { note } } }); } } catch {}
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'Failed to register' });
  }
};

// POST /api/v1/dealer/apply  (public)
export const dealerApply = async (req, res) => {
  try {
    const { name, email, phone = '', company = '', country = '', message = '' } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: 'name and email are required' });
    // Try prisma first
    try {
      if (prisma?.lead) {
        const created = await prisma.lead.create({ data: { name, email, phone, company, country, type: 'Dealer', message, tags: [], status: 'New', owner: null } });
        // Also create/update a Dealer org row in Pending so it appears in Dealers screen
        try {
          if (prisma?.dealer) {
            const existingDealer = await prisma.dealer.findFirst({ where: { contactEmail: email } });
            if (existingDealer) {
              await prisma.dealer.update({ where: { id: existingDealer.id }, data: { org: company || existingDealer.org, contactName: name, region: country || existingDealer.region || '', status: 'Pending' } });
            } else {
              await prisma.dealer.create({ data: { org: company || name || email, contactName: name, contactEmail: email, region: country || '', status: 'Pending', users: 0 } });
            }
          }
        } catch {}
        return res.status(201).json({ id: String(created.id), status: created.status });
      }
    } catch {}
    // Memory fallback
    const row = { id: String(Date.now()), name, email, phone, company, country, type: 'Dealer', message, tags: [], status: 'New', owner: null, createdAt: new Date().toISOString() };
    mem.leads.unshift(row);
    // naive memory dealer list not maintained globally here
    return res.status(201).json({ id: row.id, status: row.status });
  } catch {
    return res.status(500).json({ error: 'Failed to submit application' });
  }
};

// POST /api/v1/dealer/login  { email, phone }
export const dealerLogin = async (req, res) => {
  const { email, phone } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });
  try {
    const norm = (v='') => String(v).replace(/[^0-9+]/g,'');
    const emailNorm = String(email).trim().toLowerCase();

    // 1) Determine Dealer status by contactEmail (case-insensitive)
    let dealer = null;
    try {
      dealer = await prisma.dealer.findFirst({ where: { contactEmail: { equals: emailNorm, mode: 'insensitive' } } });
    } catch {}

    if (dealer) {
      if (dealer.status === 'Pending') return res.status(403).json({ error: 'Your account is in pending state', code: 'pending' });
      if (dealer.status === 'Suspended') return res.status(403).json({ error: 'Your account has been suspended', code: 'suspended' });
      // Active → proceed
    } else {
      // No Dealer row -> check latest Dealer lead
      let app = null;
      try { app = await prisma.lead.findFirst({ where: { type: 'Dealer', email: { equals: emailNorm, mode: 'insensitive' } }, orderBy: { createdAt: 'desc' } }); } catch {}
      if (app && app.status !== 'Qualified') return res.status(403).json({ error: 'Your application is under review', code: 'pending' });
      // If qualified, allow and continue to create user below
    }

    // 2) Get or create the user with dealer role
    let user = await prisma.user.findFirst({ where: { email: { equals: emailNorm, mode: 'insensitive' } } });
    if (!user || user.deletedAt){
      const lastLead = await prisma.lead.findFirst({ where: { type: 'Dealer', email: { equals: emailNorm, mode: 'insensitive' } }, orderBy: { createdAt: 'desc' } });
      const temp = Math.random().toString(36).slice(2, 10) + 'D!';
      const hash = await bcrypt.hash(temp, 10);
      user = await prisma.user.create({ data: { email: emailNorm, displayName: dealer?.contactName || dealer?.org || lastLead?.name || lastLead?.company || emailNorm, roles: ['dealer'], passwordHash: hash, profile: { phone: lastLead?.phone || '', company: lastLead?.company || dealer?.org || '', country: lastLead?.country || '' } } });
    }

    // 3) Phone check and bind
    if (phone){
      const pHas = Boolean(user.profile?.phone);
      if (pHas) {
        if (norm(user.profile?.phone) !== norm(phone)) return res.status(401).json({ error: 'Invalid credentials' });
      } else {
        try { await prisma.user.update({ where: { email: user.email }, data: { profile: { ...(user.profile||{}), phone: String(phone) } } }); } catch {}
      }
    }

    // 4) Issue tokens
    const accessToken = signAccessToken({ sub: user.id, roles: user.roles || ['user'] });
    const refreshToken = signRefreshToken({ sub: user.id });
    try { await prisma.session.create({ data: { userId: user.id, refreshToken, userAgent: req.get('user-agent') || '', ip: req.ip } }); } catch {}
    return res.status(200).json({ accessToken, refreshToken, user: { id: user.id, email: user.email, roles: user.roles } });
  } catch {
    return res.status(500).json({ error: 'Login failed' });
  }
};
