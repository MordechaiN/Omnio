import { Controller, Get, Param, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthedUser } from "../auth/types";
import { RateLimit } from "../security/rate-limit.decorator";
import { attachmentDisposition } from "./content-disposition";
import { toFileDto } from "./file-serializer";
import { FilesService } from "./files.service";
import { UploadService } from "./upload.service";

/**
 * Binary transfer routes. These stream and therefore sit outside the ts-rest
 * JSON contract, but the global SessionGuard still authenticates them and
 * downloads are always served as attachments (docs/architecture/06-security.md §3).
 */
@Controller("api/v1/files")
export class FilesContentController {
  constructor(
    private readonly uploads: UploadService,
    private readonly files: FilesService,
  ) {}

  @Post()
  @RateLimit("mutation")
  async upload(
    @Req() req: Request,
    @CurrentUser() user: AuthedUser,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.uploads.handle(req, user.id);
    res.status(201).json(toFileDto(file));
  }

  @Get(":id/content")
  async download(
    @Param("id") id: string,
    @CurrentUser() user: AuthedUser,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.files.get(user.id, id);
    const stream = await this.files.streamContent(file);
    res.setHeader("Content-Type", file.mime);
    res.setHeader("Content-Length", file.size.toString());
    res.setHeader("Content-Disposition", attachmentDisposition(file.originalName));
    res.setHeader("X-Content-Type-Options", "nosniff");
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  }
}
