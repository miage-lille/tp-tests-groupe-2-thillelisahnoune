import { PrismaClient } from '@prisma/client';
import { PrismaWebinarRepository } from './webinars/adapters/webinar-repository.prisma';
import { ChangeSeats } from './webinars/use-cases/change-seats';

export class AppContainer {
  private prismaClient!: PrismaClient;
  private webinarRepository!: PrismaWebinarRepository;
  private changeSeatsUseCase!: ChangeSeats;

  init(prismaClient: PrismaClient) {
    this.prismaClient = prismaClient;
    this.webinarRepository = new PrismaWebinarRepository(this.prismaClient);
    this.changeSeatsUseCase = new ChangeSeats(this.webinarRepository);
  }

  getPrismaClient() {
    return this.prismaClient;
  }

  getChangeSeatsUseCase() {
    return this.changeSeatsUseCase;
  }
}

export const container = new AppContainer();