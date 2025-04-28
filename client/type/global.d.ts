interface Pageable<T> {
  content: T[];
  last: boolean;
  totalPages: number;
  totalElements: number;
  numberOfElements: number;
  first: boolean;
  size: number;
  number: number;
  empty: boolean;
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

type UpdatedBlogInfo = Pick<
  Blog,
  | "title"
  | "thumbnail"
  | "keywords"
  | "description"
  | "isPublished"
  | "content"
  | "slug"
>;

type Props<T> = {
  params: Promise<T>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

type CommentObj = {
  id: string;
  content: string;
  parentComment: boolean;
  edited: boolean;
  createdAt: string;
  updatedAt: string;

  owner: User;
  replies: Pageable<CommentObj>;
  likeCount: number;
  dislikeCount: number;
  currentUserReaction: ReactionType | null;
};

type CreatedCommentInfo = {
  content: string;
  parentComment?: boolean;
  edited?: boolean;
  userId: string;
  blogId: string;
  repliedId?: string;
};

type ReactionType = "LIKE" | "DISLIKE";
