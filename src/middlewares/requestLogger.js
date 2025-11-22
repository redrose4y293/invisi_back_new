// Custom request logger that shows user information
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    const method = req.method;
    const path = req.originalUrl || req.url;
    const status = res.statusCode;
    const ip = req.ip || req.connection.remoteAddress;
    
    // Get user info if authenticated
    const userInfo = req.user 
      ? `[User: ${req.user.email || req.user.id} | Roles: ${req.user.roles?.join(',') || 'none'}]`
      : '[Unauthenticated]';
    
    // Color coding for status codes
    let statusColor = '';
    if (status >= 500) statusColor = '\x1b[31m'; // Red for server errors
    else if (status >= 400) statusColor = '\x1b[33m'; // Yellow for client errors
    else if (status >= 300) statusColor = '\x1b[36m'; // Cyan for redirects
    else statusColor = '\x1b[32m'; // Green for success
    const resetColor = '\x1b[0m';
    
    console.log(
      `${timestamp} | ${method} ${path} | ${statusColor}${status}${resetColor} | ${duration}ms | ${ip} | ${userInfo}`
    );
  });
  
  next();
};

