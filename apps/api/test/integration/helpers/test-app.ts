import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../../src/app.module';
import { GlobalExceptionFilter } from '../../../src/common/filters/global-exception.filter';
import { ResponseInterceptor } from '../../../src/common/interceptors/response.interceptor';

/**
 * Mock Stripe client for integration tests.
 * Prevents real payment calls during test execution.
 */
export const mockStripeClient = {
  paymentIntents: {
    create: vi.fn().mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret',
      status: 'requires_payment_method',
    }),
    confirm: vi.fn().mockResolvedValue({
      id: 'pi_test_123',
      status: 'succeeded',
    }),
    retrieve: vi.fn().mockResolvedValue({
      id: 'pi_test_123',
      status: 'succeeded',
    }),
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
};

/**
 * Creates a fully configured NestJS test application.
 * Overrides Stripe with a mock to prevent real payment processing.
 * Uses the test database specified by DATABASE_URL env var.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider('STRIPE_CLIENT')
    .useValue(mockStripeClient)
    .compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api');
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.init();
  return app;
}

/**
 * Creates a test app and returns both the app and testing module
 * for cases where you need to access providers directly.
 */
export async function createTestModule(): Promise<{
  app: INestApplication;
  module: TestingModule;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider('STRIPE_CLIENT')
    .useValue(mockStripeClient)
    .compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api');
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.init();
  return { app, module: moduleFixture };
}
