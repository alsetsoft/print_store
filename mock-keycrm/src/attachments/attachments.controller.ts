import { Controller, HttpCode, Logger, Param, ParseIntPipe, Post } from "@nestjs/common"
import { AttachmentsService } from "./attachments.service"

@Controller("v1/order")
export class AttachmentsController {
  private readonly logger = new Logger(AttachmentsController.name)

  constructor(private readonly attachments: AttachmentsService) {}

  @Post(":orderId/attachment/:fileId")
  @HttpCode(202)
  attach(
    @Param("orderId", ParseIntPipe) orderId: number,
    @Param("fileId", ParseIntPipe) fileId: number,
  ) {
    this.logger.log(`POST /v1/order/${orderId}/attachment/${fileId} received`)
    return this.attachments.attach(orderId, fileId)
  }
}
