import crypto from 'crypto';

export const etagFor = (obj) => {
  const json = typeof obj === 'string' ? obj : JSON.stringify(obj);
  const hash = crypto.createHash('md5').update(json).digest('hex');
  return `W/"${hash}"`;
};

export const sendWithEtag = (res, payload, maxAge = 60) => {
  const tag = etagFor(payload);
  res.setHeader('ETag', tag);
  res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
  res.status(200).json(payload);
};
