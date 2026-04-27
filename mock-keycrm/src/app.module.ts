import { join } from "path"
import { Module } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import { ConfigModule } from "@nestjs/config"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ServeStaticModule } from "@nestjs/serve-static"
import { OrderEntity } from "./orders/order.entity"
import { FileEntity } from "./storage/file.entity"
import { AttachmentEntity } from "./attachments/attachment.entity"
import { OrdersModule } from "./orders/orders.module"
import { StorageModule } from "./storage/storage.module"
import { AttachmentsModule } from "./attachments/attachments.module"
import { BearerAuthGuard } from "./auth/bearer.guard"

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: "better-sqlite3",
      database: join(process.cwd(), "mock.db"),
      entities: [OrderEntity, FileEntity, AttachmentEntity],
      synchronize: true,
      logging: false,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), "uploads"),
      serveRoot: "/uploads",
    }),
    OrdersModule,
    StorageModule,
    AttachmentsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: BearerAuthGuard }],
})
export class AppModule {}
