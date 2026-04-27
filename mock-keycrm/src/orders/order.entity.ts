import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm"

@Entity({ name: "orders" })
export class OrderEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: "text" })
  source_uuid: string

  @Column({ type: "integer", nullable: true })
  source_id: number | null

  @Column({ type: "real", default: 0 })
  grand_total: number

  @Column({ type: "text", default: "paid" })
  payment_status: string

  @Column({ type: "text", nullable: true })
  manager_comment: string | null

  @Column({ type: "text", nullable: true })
  buyer_comment: string | null

  @Column({ type: "integer", default: 0 })
  is_gift: number

  @Column({ type: "text" })
  payload: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
