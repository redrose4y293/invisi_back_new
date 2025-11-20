import { prisma } from '../config/db.js';

export const listReports = async (req, res) => {
  const { installationId, type } = req.query;
  const where = { ...(installationId ? { installationId: String(installationId) } : {}), ...(type ? { reportType: type } : {}) };
  const items = await prisma.report.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json({ items });
};

export const getReport = async (req, res) => {
  const id = String(req.params.id);
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return res.status(404).json({ error: 'Not found' });
  res.json(report);
};

export const deleteReport = async (req, res) => {
  const id = String(req.params.id);
  await prisma.report.delete({ where: { id } });
  res.status(204).send();
};
