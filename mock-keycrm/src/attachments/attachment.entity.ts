import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm"

@Entity({ name: "attachments" })
@Index("ux_attachment_order_file", ["order_id", "file_id"], { unique: true })
export class AttachmentEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: "integer" })
  order_id: number

  @Column({ type: "integer" })
  file_id: number

  @CreateDateColumn()
  created_at: Date
}
