import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { AttachmentEntity } from "./attachment.entity"
import { OrdersService } from "../orders/orders.service"
import { StorageService } from "../storage/storage.service"

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(AttachmentEntity) private readonly repo: Repository<AttachmentEntity>,
    private readonly orders: OrdersService,
    private readonly storage: StorageService,
  ) {}

  async attach(orderId: number, fileId: number) {
    const order = await this.orders.findById(orderId)
    if (!order) throw new NotFoundException(`order ${orderId} not found`)
    const file = await this.storage.findById(fileId)
    if (!file) throw new NotFoundException(`file ${fileId} not found`)

    const existing = await this.repo.findOne({ where: { order_id: orderId, file_id: fileId } })
    if (!existing) {
      await this.repo.save(this.repo.create({ order_id: orderId, file_id: fileId }))
    }
    return { status: true }
  }
}
