import { Body, Controller, HttpCode, Logger, Post } from "@nestjs/common"
import { OrdersService } from "./orders.service"

@Controller("v1/order")
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name)

  constructor(private readonly orders: OrdersService) {}

  @Post()
  @HttpCode(201)
  create(@Body() body: Record<string, unknown>) {
    this.logger.log(`POST /v1/order received payload:\n${JSON.stringify(body, null, 2)}`)
    return this.orders.create(body)
  }
}
