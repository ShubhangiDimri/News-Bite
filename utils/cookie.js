exports.setAuthCookie = (res, token) => {
  res.cookie("authToken", token, { 
    httpOnly: true,
    secure: true,          // ✅ REQUIRED for SameSite=None
    sameSite: "None",      // ✅ Enables cross-site cookies
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};