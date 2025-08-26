export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  company?: string;
  mobile: string;
}

export interface UpdateUserDTO {
  name?: string;
  email?: string;
  password?: string;
  company?: string;
  mobile?: string;
}

export interface UserResponseDTO {
  id: number;
  name: string;
  email: string;
  password?: string;
  company?: string | null;
  mobile: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUserResponseDTO {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  permissions?: string[];
}
