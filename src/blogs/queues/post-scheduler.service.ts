import { InjectQueue } from "@nestjs/bull";
import { Injectable } from "@nestjs/common";
import * as moment from 'moment';
import { Queue } from "twilio/lib/twiml/VoiceResponse";
import { QueueEnum } from "../../enums/queue.enum";

@Injectable()
export class PostSchedulerService {
  constructor(
    @InjectQueue(QueueEnum.PostScheduler) private readonly postSchedulerQueue: Queue,
  ) {}

  async schedulePost(postId: number, scheduledAt: Date) {
    const delay = moment(scheduledAt).valueOf() - moment().valueOf();
    if (delay <= 0) { return }

    // Kiểm tra xem job cũ có tồn tại không
    const job = await this.postSchedulerQueue.getJob(postId);
    if (job) { await job.remove() }

    // Thêm job mới với scheduledAt đã cập nhật
    await this.postSchedulerQueue.add('schedule-post', { postId, scheduledAt }, { delay, jobId: postId, attempts: 3 });
  }
}
