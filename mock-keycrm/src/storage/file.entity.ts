import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm"

@Entity({ name: "files" })
export class FileEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: "text" })
  file_name: string

  @Column({ type: "text" })
  url: string

  @Column({ type: "integer" })
  size: number

  @Column({ type: "text" })
  extension: string

  @Column({ type: "text" })
  original_file_name: string

  @Column({ type: "text" })
  mime_type: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
