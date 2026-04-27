import { randomUUID } from "crypto"
import { extname, join } from "path"
import {
  BadRequestException,
  Controller,
  HttpCode,
  Logger,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common"
import { FileInterceptor } from "@nestjs/platform-express"
import { diskStorage } from "multer"
import type { Request } from "express"
import { StorageService } from "./storage.service"

@Controller("v1/storage")
export class StorageController {
  private readonly logger = new Logger(StorageController.name)

  constructor(private readonly storage: StorageService) {}

  @Post("upload")
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: join(process.cwd(), "uploads"),
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`)
        },
      }),
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new BadRequestException("file is required")
    this.logger.log(
      `POST /v1/storage/upload received file="${file.originalname}" mime=${file.mimetype} size=${file.size}`,
    )
    const baseUrl = `${req.protocol}://${req.get("host")}`
    return this.storage.register(file, baseUrl)
  }
}
