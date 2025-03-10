import { Controller, Post, Get, Body, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { WebhookService } from "./webhook.service";
import { join } from "path";
import { Response } from "express";

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  async receiveWebhook(@Body() data: any) {
    console.log("Received Webhook Data:", data);
    return this.webhookService.handleWebhook(data);
  }

  @Get("/zalo_verifierMlhkUOpGT7ngqgD0wjiqI0pidaxWaqyODpS.html")
  async serveVerificationFile(@Res({ passthrough: true }) res: Response) {
    const filePath = join(__dirname, "public", "zalo_verifierMlhkUOpGT7ngqgD0wjiqI0pidaxWaqyODpS.html");
    res.sendFile(filePath);
  }
}