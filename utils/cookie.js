exports.setAuthCookie = (res, token) => {
    res.cookie("authToken", token, { 
        httpOnly: true, 
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
};