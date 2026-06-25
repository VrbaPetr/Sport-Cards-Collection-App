import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('getPublicProfile', () => {
    it('returns public profile for an active user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ username: 'alice', avatarUrl: null, registeredAt: new Date() });

      const result = await service.getPublicProfile('alice');

      expect(result.username).toBe('alice');
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.getPublicProfile('nobody')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when user is inactive (isActive=false filtered at DB level)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.getPublicProfile('inactive')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMyProfile', () => {
    it('returns full profile for authenticated user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'alice@example.com',
        username: 'alice',
        avatarUrl: null,
        role: 'USER',
        isEmailVerified: true,
        isActive: true,
        registeredAt: new Date(),
      });

      const result = await service.getMyProfile('user-id');

      expect(result.id).toBe('user-id');
      expect(result.email).toBe('alice@example.com');
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMyProfile('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMyProfile', () => {
    it('updates avatarUrl and returns updated profile', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-id' });
      mockPrisma.user.update.mockResolvedValue({ id: 'user-id', username: 'alice', avatarUrl: 'https://example.com/avatar.jpg' });

      const result = await service.updateMyProfile('user-id', { avatarUrl: 'https://example.com/avatar.jpg' });

      expect(result.avatarUrl).toBe('https://example.com/avatar.jpg');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { avatarUrl: 'https://example.com/avatar.jpg' } }),
      );
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateMyProfile('missing-id', { avatarUrl: 'https://example.com/a.jpg' })).rejects.toThrow(NotFoundException);
    });
  });
});
