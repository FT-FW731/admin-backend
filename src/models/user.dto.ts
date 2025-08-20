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
