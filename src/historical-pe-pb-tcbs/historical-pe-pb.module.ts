import { Module } from "@nestjs/common";
import { HistoricalPEPBController } from "./historical-pe-pb.controller";
import { HistoricalPEPBService } from "./historical-pe-pb.service";
import { MssqlService } from "../mssql/mssql.service";

@Module({
    controllers: [HistoricalPEPBController],
    providers: [HistoricalPEPBService, MssqlService],
})
export class HistoricalPEPBModule {}