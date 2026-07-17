import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateJobSchema } from "@omnio/contracts";
import { Prisma } from "@omnio/db";
import { OMNIO_JOB_NAME } from "@omnio/jobs";
import type { z } from "zod";
import { PrismaService } from "../infra/prisma.service";
import { JobQueue } from "./job-queue";
import type { JobWithRefs } from "./job-serializer";

type CreateJobInput = z.infer<typeof CreateJobSchema>;

const WITH_REFS = { inputs: true, outputs: true } as const;

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobQueue: JobQueue,
  ) {}

  async create(ownerId: string, input: CreateJobInput): Promise<JobWithRefs> {
    // Inputs must be the caller's own scratch files; reject any that aren't.
    if (input.inputFileIds.length > 0) {
      const owned = await this.prisma.fileObject.count({
        where: { id: { in: input.inputFileIds }, ownerId },
      });
      if (owned !== new Set(input.inputFileIds).size) {
        throw new NotFoundException({
          code: "input_not_found",
          message: "One or more input files were not found.",
        });
      }
    }

    const job = await this.prisma.job.create({
      data: {
        moduleId: input.moduleId,
        toolId: input.toolId,
        ownerId,
        options: input.options as Prisma.InputJsonValue,
        inputs: { connect: input.inputFileIds.map((id) => ({ id })) },
      },
      include: WITH_REFS,
    });

    await this.jobQueue.queue.add(
      OMNIO_JOB_NAME,
      { jobId: job.id },
      { removeOnComplete: 1000, removeOnFail: 5000 },
    );
    return job;
  }

  list(ownerId: string, limit: number): Promise<JobWithRefs[]> {
    return this.prisma.job.findMany({
      where: { ownerId },
      include: WITH_REFS,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async get(ownerId: string, id: string): Promise<JobWithRefs> {
    const job = await this.prisma.job.findFirst({
      where: { id, ownerId },
      include: WITH_REFS,
    });
    if (!job) throw new NotFoundException({ code: "not_found", message: "Job not found." });
    return job;
  }
}
