// src/tests/fixtures.ts

import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import Fastify, { FastifyInstance } from 'fastify';
import { AppContainer } from '../container';
import { webinarRoutes } from '../webinars/routes';
import { promisify } from 'util';

const asyncExec = promisify(exec);

export class TestServerFixture {
  private container!: StartedPostgreSqlContainer;
  private prismaClient!: PrismaClient;
  private serverInstance!: FastifyInstance;
  private appContainer!: AppContainer;

  // Initialise toutes les ressources nécessaires pour les tests
  async init() {
    try {
      // Démarrer une base PostgreSQL temporaire
      this.container = await new PostgreSqlContainer()
        .withDatabase('test_db')
        .withUsername('user_test')
        .withPassword('password_test')
        .start();

      const dbUrl = this.container.getConnectionUri();

      // Configurer Prisma avec la base temporaire
      this.prismaClient = new PrismaClient({
        datasources: {
          db: { url: dbUrl },
        },
      });

      // Appliquer les migrations Prisma
      const command =
        process.platform === 'win32'
          ? `set DATABASE_URL=${dbUrl} && npx prisma migrate deploy`
          : `DATABASE_URL=${dbUrl} npx prisma migrate deploy`;
      await asyncExec(command);

      await this.prismaClient.$connect();

      // Initialiser les dépendances applicatives (AppContainer)
      this.appContainer = new AppContainer();
      this.appContainer.init(this.prismaClient);

      // Démarrer le serveur HTTP avec Fastify
      this.serverInstance = Fastify({ logger: false });
      await webinarRoutes(this.serverInstance, this.appContainer);
      await this.serverInstance.ready();
    } catch (error) {
      console.error('Error during TestServerFixture initialization:', error);
      throw error;
    }
  }

  // Renvoie une instance de PrismaClient
  getPrismaClient() {
    return this.prismaClient;
  }

  // Renvoie une instance du serveur Fastify
  getServer() {
    return this.serverInstance.server;
  }

  // Arrête toutes les ressources après les tests
  async stop() {
    try {
      if (this.serverInstance) await this.serverInstance.close();
      if (this.prismaClient) await this.prismaClient.$disconnect();
      if (this.container) await this.container.stop();
    } catch (error) {
      console.error('Error during TestServerFixture cleanup:', error);
    }
  }

  // Réinitialise la base de données entre les tests
  async reset() {
    try {
      await this.prismaClient.webinar.deleteMany();
      await this.prismaClient.$executeRawUnsafe('DELETE FROM "Webinar" CASCADE');
    } catch (error) {
      console.error('Error during database reset:', error);
      throw error;
    }
  }
}
