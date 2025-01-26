// Tests unitaires
import { InMemoryWebinarRepository } from '../adapters/webinar-repository.in-memory';
import { ChangeSeats } from './change-seats';
import { Webinar } from '../entities/webinar.entity';
import { User } from 'src/users/entities/user.entity';
// Importer les exceptions
import { WebinarReduceSeatsException } from '../exceptions/webinar-reduce-seats';
import { WebinarNotFoundException } from '../exceptions/webinar-not-found';
import { WebinarNotOrganizerException } from '../exceptions/webinar-not-organizer';
import { WebinarTooManySeatsException } from '../exceptions/webinar-too-many-seats';

// Déclarations globales
let webinarRepository: InMemoryWebinarRepository;
let useCase: ChangeSeats;

// Instanciation des variables
const testUser = new User({
  id: 'user-alice-id',
  email: 'alice@example.com',
  password: 'alice',
});

const webinar = new Webinar({
  id: 'webinar-id',
  organizerId: testUser.props.id,
  title: 'Webinar title',
  startDate: new Date('2024-01-01T00:00:00Z'),
  endDate: new Date('2024-01-01T01:00:00Z'),
  seats: 100,
});

// Méthodes partagées
function expectWebinarToRemainUnchanged() {
  const unchangedWebinar = webinarRepository.findByIdSync('webinar-id');
  expect(unchangedWebinar?.props.seats).toEqual(100);
}

async function whenUserChangesSeatsWith(payload: { user: User; webinarId: string; seats: number }) {
  await useCase.execute(payload);
}

async function thenUpdatedWebinarSeatsShouldBe(expectedSeats: number) {
  const updatedWebinar = await webinarRepository.findById('webinar-id');
  expect(updatedWebinar?.props.seats).toEqual(expectedSeats);
}

describe('Feature : Change seats', () => {
  beforeEach(() => {
    webinarRepository = new InMemoryWebinarRepository([webinar]); // Initialise le dépôt
    useCase = new ChangeSeats(webinarRepository); // Crée une instance de ChangeSeats avec le dépôt
  });

  describe('Change seats', () => {
    it('should change the number of seats for a webinar', async () => {
      const payload = {
        user: testUser,
        webinarId: 'webinar-id',
        seats: 200,
      };

      // Act
      await whenUserChangesSeatsWith(payload);

      // Assert
      await thenUpdatedWebinarSeatsShouldBe(200);
    });
  });

  describe('Scenario: webinar does not exist', () => {
    it('should fail', async () => {
      const payload = {
        user: testUser,
        webinarId: 'non-existing-webinar-id', // Webinar inexistant
        seats: 200,
      };

      // Act & Assert
      await expect(useCase.execute(payload)).rejects.toThrow(
        new WebinarNotFoundException().message // Vérifie le message levé
      );

      // Vérifie que le webinar initial n'est pas modifié
      expectWebinarToRemainUnchanged();
    });
  });

  describe('Scenario: update the webinar of someone else', () => {
    it('should fail', async () => {
      const otherUser = new User({
        id: 'user-bob-id',
        email: 'bob@example.com',
        password: 'bob',
      });

      const payload = {
        user: otherUser, // Utilisateur non organisateur
        webinarId: 'webinar-id',
        seats: 200,
      };

      // Act & Assert
      await expect(useCase.execute(payload)).rejects.toThrow(
        new WebinarNotOrganizerException().message // Vérifie le message levé
      );

      // Vérifie que le webinar initial n'est pas modifié
      expectWebinarToRemainUnchanged();
    });
  });

  describe('Scenario: change seats to an inferior number', () => {
    it('should fail', async () => {
      const payload = {
        user: testUser,
        webinarId: 'webinar-id',
        seats: 50, // Réduction du nombre de sièges
      };

      // Act & Assert
      await expect(useCase.execute(payload)).rejects.toThrow(
        new WebinarReduceSeatsException().message // Vérifie le message levé
      );

      // Vérifie que le webinar initial n'est pas modifié
      expectWebinarToRemainUnchanged();
    });
  });

  describe('Scenario: change seats to a number > 1000', () => {
    it('should fail', async () => {
      const payload = {
        user: testUser,
        webinarId: 'webinar-id',
        seats: 1500, // Trop de sièges
      };

      // Act & Assert
      await expect(useCase.execute(payload)).rejects.toThrow(
        new WebinarTooManySeatsException().message // Vérifie le message levé
      );

      // Vérifie que le webinar initial n'est pas modifié
      expectWebinarToRemainUnchanged();
    });
  });
});
