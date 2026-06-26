import { Module } from '@nestjs/common';
import { PityService } from './pity.service';

@Module({
  providers: [PityService],
  exports: [PityService],
})
export class PityModule {}
