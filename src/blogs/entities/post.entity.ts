import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { BaseModel } from "../../models/base.entity";
import { TagEntity } from "./tag.entity";
import { CategoryEntity } from "./catetory.entity";

@Entity({ database: 'BLOGS', name: 'post' })
export class PostEntity extends BaseModel {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;

    @Column({ type: 'nvarchar', length: '255' })
    title: string;

    @Column({ type: 'nvarchar', length: '255' })
    description: string;

    @Column({ type: 'nvarchar' })
    content: string;

    @Column({ type: 'nvarchar', length: '255', nullable: true })
    thumbnail: string | null;

    /**
    * Có hiển thị nội dung này hay không: 0 - không, 1 - có
    */
    @Column({ type: 'tinyint', default: 0 })
    published: number;

    @ManyToOne(() => CategoryEntity, (category) => category.posts)
    @JoinColumn({ name: 'category_id' })
    category: CategoryEntity;

    @ManyToMany(() => TagEntity, (tag) => tag.posts)
    @JoinTable({
        name: 'post_tags', // Tên bảng phụ để lưu trữ mối quan hệ
        joinColumn: {
            name: 'post_id',
            referencedColumnName: 'id',
        },
        inverseJoinColumn: {
            name: 'tag_id',
            referencedColumnName: 'id',
        },
    })
    tags: TagEntity[];
}