import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';

// Mock bcrypt
vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;

  const mockUserFindUnique = vi.fn();
  const mockUserCreate = vi.fn();
  const mockUserUpdate = vi.fn();

  const mockPrisma = {
    user: {
      findUnique: mockUserFindUnique,
      create: mockUserCreate,
      update: mockUserUpdate,
    },
  } as any;

  const mockJwtService = {
    signAsync: vi.fn(),
    verifyAsync: vi.fn(),
  } as any;

  const mockConfigService = {
    get: vi.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key] || defaultValue;
    }),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService(mockPrisma, mockJwtService, mockConfigService);
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should register a new user successfully', async () => {
      mockUserFindUnique.mockResolvedValue(null);
      (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('hashed_password');
      mockUserCreate.mockResolvedValue({
        id: 'user-uuid-1',
        email: registerDto.email,
        name: registerDto.name,
        role: 'CUSTOMER',
        tier: 'BRONZE',
        referralCode: 'ABCD1234',
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await authService.register(registerDto);

      expect(result.user.email).toBe(registerDto.email);
      expect(result.user.name).toBe(registerDto.name);
      expect(result.user.role).toBe('CUSTOMER');
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'existing-user',
        email: registerDto.email,
      });

      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: 'user-uuid-1',
      email: 'test@example.com',
      passwordHash: 'hashed_password',
      name: 'Test User',
      role: 'CUSTOMER',
      tier: 'BRONZE',
      lockedUntil: null,
      failedAttempts: 0,
    };

    it('should login successfully with valid credentials', async () => {
      mockUserFindUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await authService.login(loginDto);

      expect(result.user.email).toBe(loginDto.email);
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      mockUserFindUnique.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      mockUserFindUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      mockUserUpdate.mockResolvedValue(mockUser);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException when account is locked', async () => {
      const lockedUser = {
        ...mockUser,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
      };
      mockUserFindUnique.mockResolvedValue(lockedUser);

      await expect(authService.login(loginDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should increment failed attempts on wrong password', async () => {
      mockUserFindUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      mockUserUpdate.mockResolvedValue(mockUser);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { failedAttempts: 1 },
      });
    });

    it('should lock account after 5 failed attempts', async () => {
      const userWith4Failures = { ...mockUser, failedAttempts: 4 };
      mockUserFindUnique.mockResolvedValue(userWith4Failures);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      mockUserUpdate.mockResolvedValue(userWith4Failures);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            failedAttempts: 5,
            lockedUntil: expect.any(Date),
          }),
        }),
      );
    });

    it('should reset failed attempts on successful login', async () => {
      const userWithFailures = { ...mockUser, failedAttempts: 3 };
      mockUserFindUnique.mockResolvedValue(userWithFailures);
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      mockUserUpdate.mockResolvedValue(userWithFailures);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await authService.login(loginDto);

      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { failedAttempts: 0, lockedUntil: null },
      });
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const payload = { sub: 'user-uuid-1', email: 'test@example.com', role: 'CUSTOMER' };
      mockJwtService.verifyAsync.mockResolvedValue(payload);
      mockUserFindUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'test@example.com',
        role: 'CUSTOMER',
        lockedUntil: null,
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await authService.refreshTokens('valid-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

      await expect(
        authService.refreshTokens('invalid-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
