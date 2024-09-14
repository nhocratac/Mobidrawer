import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    AiModule, // Your AiModule
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'), // Path to the folder containing your images
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
