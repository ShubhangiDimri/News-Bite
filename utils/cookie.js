exports.setAuthCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie("authToken", token, { 
    httpOnly: true,
    secure: isProduction,          // Only true in production (HTTPS)
    sameSite: isProduction ? "None" : "Lax",  // Lax for localhost, None for cross-site in prod
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};