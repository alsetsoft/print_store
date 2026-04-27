import { randomUUID } from "crypto"
import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { OrderEntity } from "./order.entity"

type OrderRequestBody = {
  source_id?: number
  buyer_comment?: string
  manager_comment?: string
  is_gift?: boolean
  payments?: Array<{ amount?: number }>
  [k: string]: unknown
}

@Injectable()
export class OrdersService {
  constructor(@InjectRepository(OrderEntity) private readonly repo: Repository<OrderEntity>) {}

  async create(body: OrderRequestBody) {
    const grandTotal = (body.payments ?? []).reduce((sum, p) => sum + Number(p?.amount ?? 0), 0)

    const entity = this.repo.create({
      source_uuid: randomUUID(),
      source_id: body.source_id ?? null,
      grand_total: grandTotal,
      payment_status: "paid",
      manager_comment: body.manager_comment ?? null,
      buyer_comment: body.buyer_comment ?? null,
      is_gift: body.is_gift ? 1 : 0,
      payload: JSON.stringify(body),
    })
    const saved = await this.repo.save(entity)
    const now = saved.updated_at?.toISOString() ?? new Date().toISOString()

    return {
      id: saved.id,
      parent_id: null,
      source_uuid: saved.source_uuid,
      source_id: saved.source_id,
      status_id: 1,
      status_group_id: 1,
      grand_total: saved.grand_total,
      promocode: null,
      total_discount: 0,
      expenses_sum: 0,
      shipping_price: 0,
      wrap_price: 0,
      taxes: 0,
      manager_comment: saved.manager_comment,
      buyer_comment: saved.buyer_comment,
      gift_message: null,
      is_gift: !!saved.is_gift,
      payment_status: saved.payment_status,
      last_synced_at: now,
      created_at: saved.created_at?.toISOString() ?? now,
      updated_at: now,
      closed_at: null,
    }
  }

  async findById(id: number): Promise<OrderEntity | null> {
    return this.repo.findOne({ where: { id } })
  }
}
