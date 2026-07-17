import { Module } from "@nestjs/common";
import { FilesContentController } from "./files-content.controller";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { UploadService } from "./upload.service";

@Module({
  controllers: [FilesController, FilesContentController],
  providers: [FilesService, UploadService],
})
export class FilesModule {}
