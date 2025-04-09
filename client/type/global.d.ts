interface Pageable<T> {
  content: T[],
  last: boolean,
  totalPages: number,
  totalElements: number,
  numberOfElements: number,
  first: boolean,
  size: number,
  number: number,
  empty: boolean
}

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string;
};

type Blog = {
  id?: string;
  title: string;
  thumbnail?: string;
  keywords?: string[];
  description?: string;
  content: string;
  isPublished: boolean;
  owner: string | User;
  interactions?: string;
  slug?: string;
  comments?: string;
  createdAt?: string;
  updatedAt?: string;
};
