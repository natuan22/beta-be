import { SetMetadata } from '@nestjs/common';

export enum Role {
  User, //K được xem trading tool
  Admin, //Được chỉnh sửa bản tin, trading tool
  PremiumUser, //Chỉ được xem trading tool (PREMIUM USER)
  AdminBlogs, //Add, edit blogs
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
