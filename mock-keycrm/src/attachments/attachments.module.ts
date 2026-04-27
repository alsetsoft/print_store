import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { AttachmentEntity } from "./attachment.entity"
import { AttachmentsController } from "./attachments.controller"
import { AttachmentsService } from "./attachments.service"
import { OrdersModule } from "../orders/orders.module"
import { StorageModule } from "../storage/storage.module"

@Module({
  imports: [TypeOrmModule.forFeature([AttachmentEntity]), OrdersModule, StorageModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
})
export class AttachmentsModule {}
