"use client";

import React, { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { useCommentsQuery, useAddCommentMutation } from "@/services/queries";
import { CommentsProps } from "@/types";
import { getTimeAgo } from "@/utils";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { motion, AnimatePresence } from "framer-motion";

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
        <motion.button
          type="submit"
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.05 }}
          disabled={!newComment.trim() || addCommentMutation.isPending}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
        >
          <Send className="h-4 w-4" />
        </motion.button>
      </form>

      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {comments.map((comment, index) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 28,
                delay: index < 10 ? index * 0.03 : 0,
              }}
              className="flex gap-3 text-sm"
            >
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
            </motion.div>
          ))}
        </AnimatePresence>
        {comments.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-center text-sm text-zinc-500 py-4"
          >
            No comments yet. Be the first to comment!
          </motion.p>
        )}
      </div>
    </div>
  );
}
