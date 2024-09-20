import { Module } from "@nestjs/common";
import { TCBSController } from "./tcbs.controller";
import { TCBSService } from "./tcbs.service";
import { MssqlService } from "../mssql/mssql.service";

@Module({
    controllers: [TCBSController],
    providers: [TCBSService, MssqlService],
})
export class TCBSModule {}