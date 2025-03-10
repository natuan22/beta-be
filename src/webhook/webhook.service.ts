import { Injectable } from "@nestjs/common";

@Injectable()
export class WebhookService {
  constructor() {}

  async handleWebhook(data: any) {
    console.log("Processing Webhook Data:", data);
    // Add your business logic here
    return { status: "processed", receivedData: data };
  }
}