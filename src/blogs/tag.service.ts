import { Injectable } from "@nestjs/common";
import { TagEntity } from "./entities/tag.entity";
import { DB_SERVER } from "../constants";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CatchException } from "../exceptions/common.exception";
import { GetAllTagResponse } from "./responses/getAllTag.response";

@Injectable()
export class TagService {
    constructor(
        @InjectRepository(TagEntity, DB_SERVER)
        private readonly tagRepo: Repository<TagEntity>,
    ) {}

    async findAllTag() {
        try {
            const tags = await this.tagRepo.find();
            
            return GetAllTagResponse.mapToList(tags);
        } catch (e) {
            throw new CatchException(e);
        }
    }
}