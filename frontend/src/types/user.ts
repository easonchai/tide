export interface CreateUserDTO {
  address: string;
}

export interface UserResponseDTO {
  id: string;
  address: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
