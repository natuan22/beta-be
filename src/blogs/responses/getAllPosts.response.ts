import { ApiProperty } from "@nestjs/swagger";
import { CategoryResponse } from "./category.response";
import { TagResponse } from "./tag.response";

export class GetAllPostResponse {
    @ApiProperty({ type: Number, example: 1 })
    id: number;
  
    @ApiProperty({ type: String, example: "Post Title" })
    title: string;
  
    @ApiProperty({ type: String, example: "Post Description" })
    description: string;
  
    @ApiProperty({ type: String, example: "Post Content" })
    content: string;
  
    @ApiProperty({ type: String, example: "thumbnail.png", nullable: true })
    thumbnail: string | null;
  
    @ApiProperty({ type: Number, example: 1 })  // Now it's a number
    published: number;
  
    @ApiProperty({ type: Date })
    created_at: Date;

    @ApiProperty({ type: Date })
    updated_at: Date;
    
    @ApiProperty({ type: () => CategoryResponse, nullable: true, example: { id: 2, name: "Category Name", description: 'Vi du', published: 1, parent_id: null }})
    category: CategoryResponse | null;

    @ApiProperty({ type: [TagResponse], example: [{ id: 1, name: "Tag1", description: 'Vi du', published: 1 }, { id: 2, name: "Tag2", description: 'Vi du', published: 1 }] })
    tags: TagResponse[];

    constructor(data: Partial<GetAllPostResponse>) {
        this.id = data?.id ?? 0;
        this.title = data?.title ?? "";
        this.description = data?.description ?? "";
        this.content = data?.content ?? "";
        this.thumbnail = data?.thumbnail ?? null;
        this.published = data?.published ?? 0;
        this.created_at = data?.created_at ?? new Date();
        this.updated_at = data?.updated_at ?? new Date();
        this.category = data?.category ? new CategoryResponse(data.category) : null;
        this.tags = data?.tags?.map((tag) => new TagResponse(tag)) ?? [];
    }
    
    static mapToList(data?: Partial<GetAllPostResponse[]>): GetAllPostResponse[] {
        return data ? data.map((item) => new GetAllPostResponse(item)) : [];
    }
}