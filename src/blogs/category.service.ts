import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DB_SERVER } from "../constants";
import { CatchException, ExceptionResponse } from "../exceptions/common.exception";
import { CreateCategoryDto } from "./dto/createCategory.dto";
import { UpdateCategoryDto } from "./dto/updateCategory.dto";
import { CategoryEntity } from "./entities/catetory.entity";
import { CategoryResponse } from "./responses/category.response";
import { GetAllCategoriesResponse } from "./responses/getAllCategories.response";

@Injectable()
export class CategoryService {
    constructor(
        @InjectRepository(CategoryEntity, DB_SERVER)
        private readonly categoryRepo: Repository<CategoryEntity>,
    ) {}

    async createCategory(data: CreateCategoryDto): Promise<CategoryResponse> {
        const category = await this.categoryRepo.findOne({ where: { name: data.name }});
        if (category) {
            throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Tên danh mục này đã được tạo');
        }

        if (data.parent_id !== null) {
            const parentCategory = await this.categoryRepo.findOne({ where: { id: data.parent_id } });
            if (!parentCategory) {
                throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Danh mục cha không tồn tại');
            }
    
            if (parentCategory.parent_id !== null) {
                throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Danh mục cha phải là danh mục chính');
            }
        }

        const newCategory: CategoryEntity = await this.categoryRepo.save({ 
            name: data.name,
            description: data.description,
            published: data.published,
            parent_id: data.parent_id,
        });

        return new CategoryResponse(newCategory);
    }

    async updateCategory(data: UpdateCategoryDto): Promise<CategoryResponse> {
        const category = await this.categoryRepo.findOne({ where: { id: data.id } });
        if (!category) {
            throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Danh mục không tồn tại');
        }
    
        if (category.parent_id === null) {
            if (data.parent_id !== null) {
                throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Danh mục cha không thể sửa thành danh mục con');
            }
    
            await this.categoryRepo.update({ id: category.id }, {
                name: data.name,
                description: data.description,
                published: data.published
            });
        } else {
            if (data.parent_id === null) {
                throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Danh mục con không thể sửa thành danh mục cha');
            }
    
            const parentCategory = await this.categoryRepo.findOne({ where: { id: data.parent_id } });
            if (!parentCategory || parentCategory.parent_id !== null) {
                throw new ExceptionResponse(HttpStatus.BAD_REQUEST, 'Danh mục cha không tồn tại / không phải danh mục cha');
            }
    
            await this.categoryRepo.update({ id: category.id }, {
                name: data.name,
                description: data.description,
                published: data.published,
                parent_id: data.parent_id,
            });
        }
    
        const updatedCategory = await this.categoryRepo.findOne({ where: { id: category.id } });
        return new CategoryResponse(updatedCategory);
    }

    async findAllCate() {
        try {
            const categories = await this.categoryRepo.find({ relations: ['sub_categories'], order: { created_at: 'DESC' } });

            const mapCategories = (category: CategoryEntity): GetAllCategoriesResponse => {
                return new GetAllCategoriesResponse({
                  id: category.id,
                  name: category.name,
                  description: category.description,
                  published: category.published,
                  parent_id: category.parent_id,
                  created_at: category.created_at,
                  updated_at: category.updated_at,
                  children: category.sub_categories?.length ? category.sub_categories.map(mapCategories) : null,
                });
            };
            const rootCategories = categories.filter(category => category.parent_id === null).map(mapCategories);

            return rootCategories;
        } catch (e) {
            throw new CatchException(e);
        }
    }
}