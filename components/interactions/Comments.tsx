"use client";

import React, { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { useCommentsQuery, useAddCommentMutation } from "@/services/queries";
import { CommentsProps } from "@/types";
import { getTimeAgo } from "@/utils";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export function Comments({ postId }: CommentsProps) {
  const requireAuth = useRequireAuth();
  const [newComment, setNewComment] = useState("");

  const { data: comments = [], isLoading: loading } = useCommentsQuery(postId);
  const addCommentMutation = useAddCommentMutation(postId);

  const handleSubmit = requireAuth((e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || addCommentMutation.isPending) return;
    addCommentMutation.mutate(newComment, {
      onSuccess: () => setNewComment(""),
    });
  });

  if (loading) {
    return <div className="animate-pulse h-24 bg-zinc-100 dark:bg-zinc-900 rounded-lg mt-8" />;
  }

  return (
    <div className="mt-8">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        <MessageSquare className="h-5 w-5" />
        {comments.length} Comments
      </h2>

      <form onSubmit={handleSubmit} className="mb-6 flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:bg-zinc-950"
          />
        </div>
        <button
          type="submit"
          disabled={!newComment.trim() || addCommentMutation.isPending}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3 text-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {comment.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {comment.username}
                </span>
                <span className="text-xs text-zinc-500">
                  {getTimeAgo(comment.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                {comment.content}
              </p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-center text-sm text-zinc-500 py-4">No comments yet. Be the first to comment!</p>
        )}
      </div>
    </div>
  );
}
