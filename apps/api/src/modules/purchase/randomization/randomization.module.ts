import { Module } from '@nestjs/common';
import { RandomizationService } from './randomization.service';

@Module({
  providers: [RandomizationService],
  exports: [RandomizationService],
})
export class RandomizationModule {}
