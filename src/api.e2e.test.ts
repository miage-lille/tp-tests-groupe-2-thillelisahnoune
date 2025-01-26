import { TestServerFixture } from './tests/fixtures';
import supertest from 'supertest';

describe('Webinar Routes E2E', () => {
  let fixture: TestServerFixture;

  // Initialiser la fixture avant tous les tests
  beforeAll(async () => {
    fixture = new TestServerFixture();
    await fixture.init();
  });

  // Réinitialiser la base de données avant chaque test
  beforeEach(async () => {
    await fixture.reset();
  });

  // Arrêter toutes les ressources après les tests
  afterAll(async () => {
    await fixture.stop();
  });

  it('should update webinar seats', async () => {
    // ARRANGE
    const prisma = fixture.getPrismaClient();
    const server = fixture.getServer();

    // Créer un webinar dans la base de données
    const webinar = await prisma.webinar.create({
      data: {
        id: 'test-webinar',
        title: 'Webinar Test',
        seats: 10,
        startDate: new Date(),
        endDate: new Date(),
        organizerId: 'test-user',
      },
    });

    // ACT : Envoyer une requête POST pour mettre à jour les sièges
    const response = await supertest(server)
      .post(`/webinars/${webinar.id}/seats`)
      .send({ seats: 30 }) // Met à jour les sièges à 30
      .expect(200); // Vérifie que le code de retour est 200 (succès)

    // ASSERT : Vérifier la réponse de l'API
    expect(response.body).toEqual({ message: 'Seats updated' });

    // Vérifier que les sièges ont été mis à jour dans la base
    const updatedWebinar = await prisma.webinar.findUnique({
      where: { id: webinar.id },
    });
    expect(updatedWebinar?.seats).toBe(30);
  });

  it('should throw WebinarNotFoundException for a non-existing webinar', async () => {
    // ARRANGE
    const server = fixture.getServer();

    // ACT : Envoyer une requête POST pour un ID de webinar inexistant
    const response = await supertest(server)
      .post(`/webinars/non-existing-id/seats`)
      .send({ seats: 30 })
      .expect(404); // Vérifie que le code de retour est 404 (not found)

    // ASSERT : Vérifier la réponse de l'API
    expect(response.body).toEqual({ error: 'Webinar not found' });
  });

  it('should throw WebinarNotOrganizerException for unauthorized user', async () => {
    // ARRANGE
    const prisma = fixture.getPrismaClient();
    const server = fixture.getServer();

    // Créer un webinar dans la base de données avec un autre organisateur
    const webinar = await prisma.webinar.create({
      data: {
        id: 'test-webinar',
        title: 'Webinar Test',
        seats: 10,
        startDate: new Date(),
        endDate: new Date(),
        organizerId: 'other-user', // Différent utilisateur
      },
    });

    // ACT : Envoyer une requête POST avec un utilisateur non autorisé
    const response = await supertest(server)
      .post(`/webinars/${webinar.id}/seats`)
      .send({ seats: 30 }) // Tentative de mise à jour par un utilisateur non autorisé
      .expect(401); // Vérifie que le code de retour est 401 (unauthorized)

    // ASSERT : Vérifier la réponse de l'API
    expect(response.body).toEqual({
      error: 'User is not allowed to update this webinar',
    });

    // Vérifier que les sièges n'ont pas été modifiés dans la base
    const unchangedWebinar = await prisma.webinar.findUnique({
      where: { id: webinar.id },
    });
    expect(unchangedWebinar?.seats).toBe(10);
  });
});
