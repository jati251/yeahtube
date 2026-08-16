export interface CommentItem {
  id: number;
  content: string;
  createdAt: string;
  userId: number;
  username: string;
}

export interface CommentsProps {
  postId: number;
}
