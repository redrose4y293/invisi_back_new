export const toCursor = (id) => Buffer.from(String(id)).toString('base64');
export const fromCursor = (cursor) => (cursor ? Buffer.from(cursor, 'base64').toString('utf8') : undefined);
