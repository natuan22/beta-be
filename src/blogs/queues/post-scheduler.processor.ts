import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Job } from "bull";
import * as moment from 'moment';
import { Repository } from "typeorm";
import { DB_SERVER } from "../../constants";
import { QueueEnum } from "../../enums/queue.enum";
import { PostEntity } from "../entities/post.entity";

@Processor(QueueEnum.PostScheduler)
export class PostSchedulerProcessor {
  private readonly logger = new Logger(PostSchedulerProcessor.name);
  constructor(
    @InjectRepository(PostEntity, DB_SERVER) 
    private readonly postRepo: Repository<PostEntity>
  ) {}

  @Process('schedule-post')
  async handlePublishPost(job: Job) {
    const { postId, scheduledAt } = job.data;

    this.logger.log(`Processing post with ID: ${postId}`);

    // Check if the scheduled time is less than or equal to the current time
    if (moment(scheduledAt).isBefore(moment())) {
      this.logger.log(`Publishing post ID ${postId}...`);

      // Fetch the post from the database
      const post = await this.postRepo.findOne({ where: { id: postId } });

      if (post) {
        post.published = 1;
        post.scheduledAt = null;
        post.created_at = new Date()

        await this.postRepo.save(post);
        this.logger.log(`Post ID ${postId} published successfully.`);
      } else {
        this.logger.warn(`Post ID ${postId} not found.`);
      }
    } else {
      this.logger.warn(`Post ID ${postId} is not ready for publishing.`);
    }
  }
}
