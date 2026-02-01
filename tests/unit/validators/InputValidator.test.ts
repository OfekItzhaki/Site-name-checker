import { InputValidator } from '../../../src/validators/InputValidator';

describe('InputValidator', () => {
  let validator: InputValidator;

  beforeEach(() => {
    validator = new InputValidator();
  });

  describe('validateDomainName', () => {
    describe('valid domains', () => {
      test('should accept valid single character domain', () => {
        const result = validator.validateDomainName('a');
        expect(result.isValid).toBe(true);
        expect(result.sanitizedInput).toBe('a');
        expect(result.errors).toHaveLength(0);
      });

      test('should accept valid alphanumeric domain', () => {
        const result = validator.validateDomainName('test123');
        expect(result.isValid).toBe(true);
        expect(result.sanitizedInput).toBe('test123');
        expect(result.errors).toHaveLength(0);
      });

      test('should accept domain with hyphens in middle', () => {
        const result = validator.validateDomainName('test-domain');
        expect(result.isValid).toBe(true);
        expect(result.sanitizedInput).toBe('test-domain');
        expect(result.errors).toHaveLength(0);
      });

      test('should accept maximum length domain (63 characters)', () => {
        const longDomain = 'a'.repeat(63);
        const result = validator.validateDomainName(longDomain);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedInput).toBe(longDomain);
        expect(result.errors).toHaveLength(0);
      });

      test('should accept mixed case and convert to lowercase', () => {
        const result = validator.validateDomainName('TestDomain');
        expect(result.isValid).toBe(true);
        expect(result.sanitizedInput).toBe('testdomain');
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('invalid domains - empty input', () => {
      test('should reject empty string', () => {
        const result = validator.validateDomainName('');
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBe('Domain name cannot be empty');
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.code).toBe('EMPTY_INPUT');
      });

      test('should reject whitespace-only string', () => {
        const result = validator.validateDomainName('   ');
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBe('Domain name cannot be empty');
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.code).toBe('EMPTY_INPUT');
      });

      test('should reject null input', () => {
        const result = validator.validateDomainName(null as any);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBe('Domain name cannot be empty');
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.code).toBe('EMPTY_INPUT');
      });

      test('should reject undefined input', () => {
        const result = validator.validateDomainName(undefined as any);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBe('Domain name cannot be empty');
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.code).toBe('EMPTY_INPUT');
      });
    });

    describe('invalid domains - length violations', () => {
      test('should reject domain longer than 63 characters', () => {
        const longDomain = 'a'.repeat(64);
        const result = validator.validateDomainName(longDomain);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBe('Domain name must be no more than 63 characters long');
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.code).toBe('INVALID_LENGTH');
      });
    });

    describe('invalid domains - character violations', () => {
      test('should reject domain with spaces', () => {
        const result = validator.validateDomainName('test domain');
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBe('Domain name can only contain letters, numbers, and hyphens');
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.code).toBe('INVALID_CHARACTERS');
      });

      test('should reject domain with special characters', () => {
        const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '+', '=', '[', ']', '{', '}', '|', '\\', ':', ';', '"', "'", '<', '>', ',', '.', '?', '/'];
        
        specialChars.forEach(char => {
          const result = validator.validateDomainName(`test${char}domain`);
          expect(result.isValid).toBe(false);
          expect(result.errorMessage).toBe('Domain name can only contain letters, numbers, and hyphens');
          expect(result.errors).toHaveLength(1);
          expect(result.errors[0]?.code).toBe('INVALID_CHARACTERS');
        });
      });

      test('should reject domain with unicode characters', () => {
        const result = validator.validateDomainName('tëst');
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBe('Domain name can only contain letters, numbers, and hyphens');
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.code).toBe('INVALID_CHARACTERS');
      });
    });

    describe('invalid domains - format violations', () => {
      test('should reject domain starting with hyphen', () => {
        const result = validator.validateDomainName('-test');
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBe('Domain name cannot start or end with a hyphen');
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.code).toBe('INVALID_FORMAT');
      });

      test('should reject domain ending with hyphen', () => {
        const result = validator.validateDomainName('test-');
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBe('Domain name cannot start or end with a hyphen');
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.code).toBe('INVALID_FORMAT');
      });

      test('should reject domain with consecutive hyphens at positions 3-4', () => {
        const result = validator.validateDomainName('ab--test');
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBe('Domain name cannot have consecutive hyphens at positions 3-4 (reserved for internationalized domains)');
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.code).toBe('RESERVED_FORMAT');
      });

      test('should reject all numeric domain', () => {
        const result = validator.validateDomainName('12345');
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBe('Domain name cannot be all numeric');
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.code).toBe('ALL_NUMERIC');
      });
    });

    describe('multiple validation errors', () => {
      test('should return multiple errors for domain with multiple issues', () => {
        const result = validator.validateDomainName('-test@domain-');
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
        
        const errorCodes = result.errors.map(error => error.code);
        expect(errorCodes).toContain('INVALID_CHARACTERS');
        expect(errorCodes).toContain('INVALID_FORMAT');
      });
    });
  });

  describe('sanitizeInput', () => {
    test('should trim whitespace', () => {
      expect(validator.sanitizeInput('  test  ')).toBe('test');
    });

    test('should convert to lowercase', () => {
      expect(validator.sanitizeInput('TEST')).toBe('test');
    });

    test('should remove internal whitespace', () => {
      expect(validator.sanitizeInput('test domain')).toBe('testdomain');
    });

    test('should remove invalid characters', () => {
      expect(validator.sanitizeInput('test@domain.com')).toBe('testdomaincom');
    });

    test('should preserve hyphens', () => {
      expect(validator.sanitizeInput('test-domain')).toBe('test-domain');
    });

    test('should handle non-string input', () => {
      expect(validator.sanitizeInput(null as any)).toBe('');
      expect(validator.sanitizeInput(undefined as any)).toBe('');
      expect(validator.sanitizeInput(123 as any)).toBe('');
    });

    test('should handle complex mixed input', () => {
      expect(validator.sanitizeInput('  Test-Domain@123.com  ')).toBe('test-domain123com');
    });
  });

  describe('isValidLength', () => {
    test('should accept valid lengths', () => {
      expect(validator.isValidLength('a')).toBe(true);
      expect(validator.isValidLength('test')).toBe(true);
      expect(validator.isValidLength('a'.repeat(63))).toBe(true);
    });

    test('should reject invalid lengths', () => {
      expect(validator.isValidLength('')).toBe(false);
      expect(validator.isValidLength('a'.repeat(64))).toBe(false);
    });
  });

  describe('hasValidCharacters', () => {
    test('should accept valid characters', () => {
      expect(validator.hasValidCharacters('test')).toBe(true);
      expect(validator.hasValidCharacters('test123')).toBe(true);
      expect(validator.hasValidCharacters('test-domain')).toBe(true);
      expect(validator.hasValidCharacters('123')).toBe(true);
    });

    test('should reject invalid characters', () => {
      expect(validator.hasValidCharacters('test@domain')).toBe(false);
      expect(validator.hasValidCharacters('test.domain')).toBe(false);
      expect(validator.hasValidCharacters('test domain')).toBe(false);
      expect(validator.hasValidCharacters('test_domain')).toBe(false);
    });
  });

  describe('hasValidFormat', () => {
    test('should accept valid formats', () => {
      expect(validator.hasValidFormat('test')).toBe(true);
      expect(validator.hasValidFormat('test-domain')).toBe(true);
      expect(validator.hasValidFormat('a')).toBe(true);
    });

    test('should reject invalid formats', () => {
      expect(validator.hasValidFormat('-test')).toBe(false);
      expect(validator.hasValidFormat('test-')).toBe(false);
      expect(validator.hasValidFormat('-')).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('should handle boundary length cases', () => {
      // Exactly 1 character
      const result1 = validator.validateDomainName('a');
      expect(result1.isValid).toBe(true);

      // Exactly 63 characters
      const result63 = validator.validateDomainName('a'.repeat(63));
      expect(result63.isValid).toBe(true);

      // 64 characters (too long)
      const result64 = validator.validateDomainName('a'.repeat(64));
      expect(result64.isValid).toBe(false);
    });

    test('should handle hyphen edge cases', () => {
      // Valid hyphen usage
      expect(validator.validateDomainName('a-b').isValid).toBe(true);
      expect(validator.validateDomainName('test-123').isValid).toBe(true);
      
      // Invalid hyphen usage
      expect(validator.validateDomainName('-a').isValid).toBe(false);
      expect(validator.validateDomainName('a-').isValid).toBe(false);
      expect(validator.validateDomainName('ab--c').isValid).toBe(false);
    });

    test('should handle numeric edge cases', () => {
      // Mixed alphanumeric (valid)
      expect(validator.validateDomainName('test123').isValid).toBe(true);
      expect(validator.validateDomainName('123test').isValid).toBe(true);
      
      // All numeric (invalid)
      expect(validator.validateDomainName('123').isValid).toBe(false);
      expect(validator.validateDomainName('0').isValid).toBe(false);
    });
  });
});