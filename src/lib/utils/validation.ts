type RegisterInput = {
    email: string;
    password: string;
  };
  
  type ValidationError = {
    email?: string;
    password?: string;
  };
  
  export function validateRegisterInput(data: RegisterInput): {
    isValid: boolean;
    errors: ValidationError;
  } {
    const errors: ValidationError = {};
  
    // Email validation
    if (!data.email || !/\S+@\S+\.\S+/.test(data.email)) {
      errors.email = 'Invalid email address.';
    }
  
    // Password validation
    const password = data.password || '';
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
  
    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
      errors.password = 'Invalid password. Must be at least 8 characters, include uppercase, lowercase, and a number.';
    }
  
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
  