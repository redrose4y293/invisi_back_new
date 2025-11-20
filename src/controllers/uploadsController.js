import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, s3Bucket, s3PublicBaseUrl } from '../config/s3.js';
import { prisma } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

export const getSignedUrlForUpload = async (req, res) => {
  const { filename, contentType, size, context } = req.body;
  if (!filename || !contentType || !size) return res.status(400).json({ error: 'filename, contentType, size required' });
  if (size > 50 * 1024 * 1024) return res.status(400).json({ error: 'File too large' });
  const key = `${req.user?.id || 'anon'}/${Date.now()}-${uuidv4()}-${filename}`;
  const cmd = new PutObjectCommand({ Bucket: s3Bucket, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 900 });
  res.json({ uploadUrl, objectKey: key, expiresAt: new Date(Date.now() + 900000).toISOString() });
};

export const completeUpload = async (req, res) => {
  const { objectKey, metadata = {} } = req.body;
  if (!objectKey) return res.status(400).json({ error: 'objectKey required' });
  const asset = await prisma.uploadAsset.create({ data: { objectKey, contentType: metadata.contentType || 'application/octet-stream', size: metadata.size || 0, context: metadata.context || null, uploaderId: req.user?.id || null, publicUrl: s3PublicBaseUrl ? `${s3PublicBaseUrl}/${objectKey}` : null } });
  res.status(201).json(asset);
};

export const getAsset = async (req, res) => {
  const id = String(req.params.id);
  const asset = await prisma.uploadAsset.findUnique({ where: { id } });
  if (!asset) return res.status(404).json({ error: 'Not found' });
  res.json(asset);
};
