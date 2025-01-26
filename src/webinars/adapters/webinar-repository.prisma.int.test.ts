// Test d'intégration
import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { promisify } from 'util';
const asyncExec = promisify(exec);

describe('PrismaWebinarRepository', () => {
  // Variables nécessaires
  let container: StartedPostgreSqlContainer;
  let prismaClient: PrismaClient;
  let repository: PrismaWebinarRepository;

  // === UTILITAIRES POUR LES TESTS ===

  // Générer un webinar de test
  const createTestWebinar = (overrides = {}) =>
    new Webinar({
      id: 'webinar-id',
      organizerId: 'organizer-id',
      title: 'Webinar title',
      startDate: new Date('2022-01-01T00:00:00Z'),
      endDate: new Date('2022-01-01T01:00:00Z'),
      seats: 100,
      ...overrides,
    });

  // Vérifier qu'un webinar existe dans la base avec des propriétés spécifiques
  const expectWebinarToExist = async (id: string, expected: Partial<Webinar['props']>) => {
    const maybeWebinar = await prismaClient.webinar.findUnique({ where: { id } });
    expect(maybeWebinar).toMatchObject(expected);
  };

  // === CONFIGURATION DES TESTS ===

  beforeAll(async () => {
    container = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('user_test')
      .withPassword('password_test')
      .start();

    const dbUrl = container.getConnectionUri();
    prismaClient = new PrismaClient({
      datasources: { db: { url: dbUrl } },
    });

    const command = `set DATABASE_URL=${dbUrl} && npx prisma migrate deploy`;
    await asyncExec(command);

    return prismaClient.$connect();
  }, 30000); // Timeout augmenté à 30 secondes

  beforeEach(async () => {
    repository = new PrismaWebinarRepository(prismaClient);
    await prismaClient.webinar.deleteMany();
  });

  afterAll(async () => {
    if (container) await container.stop({ timeout: 1000 });
    if (prismaClient) await prismaClient.$disconnect();
  });

  // === TESTS ===

  describe('Scenario : repository.create', () => {
    it('should create a webinar', async () => {
      const webinar = createTestWebinar();

      await repository.create(webinar);

      await expectWebinarToExist('webinar-id', {
        id: 'webinar-id',
        title: 'Webinar title',
        seats: 100,
      });
    });

    it('should fail to create a webinar with duplicate ID', async () => {
      const webinar = createTestWebinar();
      const duplicateWebinar = createTestWebinar({ title: 'Duplicate Webinar' });

      await repository.create(webinar);

      await expect(repository.create(duplicateWebinar)).rejects.toThrow();
    });
  });

  describe('Scenario : repository.findById', () => {
    it('should find an existing webinar', async () => {
      const webinar = createTestWebinar();
      await repository.create(webinar);

      const foundWebinar = await repository.findById('webinar-id');
      expect(foundWebinar).not.toBeNull();
      expect(foundWebinar?.props.title).toBe('Webinar title');
    });

    it('should return null for a non-existing webinar ID', async () => {
      const foundWebinar = await repository.findById('non-existing-id');
      expect(foundWebinar).toBeNull();
    });
  });

  describe('Scenario : repository.update', () => {
    it('should update an existing webinar', async () => {
      const webinar = createTestWebinar();
      await repository.create(webinar);

      const updatedWebinar = createTestWebinar({ title: 'Updated Title', seats: 150 });
      await repository.update(updatedWebinar);

      await expectWebinarToExist('webinar-id', { title: 'Updated Title', seats: 150 });
    });

    it('should throw an error when updating a non-existing webinar', async () => {
      const nonExistingWebinar = createTestWebinar({ id: 'non-existing-id' });

      await expect(repository.update(nonExistingWebinar)).rejects.toThrow();
    });
  });
});
