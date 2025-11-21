const validateUsername = (username) => {
  const errors = [];

  // Check if provided
  if (!username) {
    errors.push("Username is required");
    return { isValid: false, errors };
  }

  // Convert to string and trim
  username = String(username).trim();

  // Check length
  if (username.length < 3) {
    errors.push("Username must be at least 3 characters long");
  }
  if (username.length > 30) {
    errors.push("Username must not exceed 30 characters");
  }

  // Check format - only letters, numbers, underscore, dot
  const usernameRegex = /^[a-zA-Z0-9_.]+$/;
  if (!usernameRegex.test(username)) {
    errors.push("Username can only contain letters, numbers, underscore (_), and dot (.)");
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: username
  };
};

const validatePassword = (password) => {
  const errors = [];

  // Check if provided
  if (!password) {
    errors.push("Password is required");
    return { isValid: false, errors };
  }

  // Convert to string
  password = String(password);

  // Check length
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (password.length > 64) {
    errors.push("Password must not exceed 64 characters");
  }

  // Check for at least one number
  const hasNumber = /\d/.test(password);
  if (!hasNumber) {
    errors.push("Password must contain at least one number (0-9)");
  }

  // Check for at least one special character
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  if (!hasSpecialChar) {
    errors.push("Password must contain at least one special character (!@#$%^&* etc.)");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateUsername,
  validatePassword
};
