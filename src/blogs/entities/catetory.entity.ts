import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { BaseModel } from "../../models/base.entity";
import { PostEntity } from "./post.entity";

@Entity({ database: 'BLOGS', name: 'category' })
export class CategoryEntity extends BaseModel {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;

    @Column({ type: 'nvarchar', length: '255' })
    name: string;

    @Column({ type: 'nvarchar', length: '255', nullable: true })
    description: string | null;

    /**
    * Có hiển thị nhóm nội dung này hay không: 0 - không, 1 - có
    */
    @Column({ type: 'tinyint', default: 0 })
    published: number;

    @Column({ type: 'int', nullable: true })
    parent_id: number | null;

    /**
     * Danh mục cha (nếu có) của danh mục hiện tại. Nếu là danh mục chính thì `parent_category` là `null`.
     */
    @ManyToOne(() => CategoryEntity, (category) => category.sub_categories)
    @JoinColumn({ name: 'parent_id' })
    parent_category: CategoryEntity | null;

    /**
     * Các danh mục con của danh mục hiện tại.
     */
    @OneToMany(() => CategoryEntity, (category) => category.parent_category, { cascade: ['remove'] })
    sub_categories: CategoryEntity[];

    /**
     * Các bài viết thuộc danh mục này (áp dụng cho các danh mục con).
     */
    @OneToMany(() => PostEntity, (post) => post.category)
    posts: PostEntity[];
}