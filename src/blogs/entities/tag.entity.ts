import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { BaseModel } from "../../models/base.entity";
import { PostEntity } from "./post.entity";

@Entity({ database: 'BLOGS', name: 'tag' })
export class TagEntity extends BaseModel {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;

    @Column({ type: 'nvarchar', length: '255' })
    name: string;

    @Column({ type: 'nvarchar', length: '255', nullable: true })
    description: string | null;

    /**
    * Có hiển thị nội dung này hay không: 0 - không, 1 - có
    */
    @Column({ type: 'tinyint', default: 0 })
    published: number;

    @ManyToMany(() => PostEntity, (post) => post.tags)
    posts: PostEntity[];
}