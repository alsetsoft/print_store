import { extname } from "path"
import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { FileEntity } from "./file.entity"

@Injectable()
export class StorageService {
  constructor(@InjectRepository(FileEntity) private readonly repo: Repository<FileEntity>) {}

  async register(file: Express.Multer.File, baseUrl: string) {
    const storedName = file.filename
    const ext = extname(storedName).replace(/^\./, "").toLowerCase()
    const url = `${baseUrl}/uploads/${storedName}`

    const entity = this.repo.create({
      file_name: storedName,
      url,
      size: file.size,
      extension: ext,
      original_file_name: file.originalname,
      mime_type: file.mimetype,
    })
    const saved = await this.repo.save(entity)
    const ts = (saved.updated_at ?? new Date()).toISOString()

    return {
      id: saved.id,
      file_name: saved.file_name,
      url: saved.url,
      size: saved.size,
      extension: saved.extension,
      original_file_name: saved.original_file_name,
      mime_type: saved.mime_type,
      created_at: (saved.created_at ?? new Date()).toISOString(),
      updated_at: ts,
    }
  }

  async findById(id: number): Promise<FileEntity | null> {
    return this.repo.findOne({ where: { id } })
  }
}
