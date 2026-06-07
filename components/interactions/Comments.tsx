"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Send } from "lucide-react";

interface CommentItem {
  id: number;
  content: string;
  createdAt: string;
  userId: number;
  username: string;
}

interface CommentsProps {
  postId: number;
}

export function Comments({ postId }: CommentsProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/posts/${postId}/comments`)
      .then((res) => res.json())
      .then((data) => {
        if (data.comments) {
          setComments(data.comments);
        }
      })
      .finally(() => setLoading(false));
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });
      const data = await res.json();
      if (data.success && data.comment) {
        setComments((prev) => [data.comment, ...prev]);
        setNewComment("");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

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
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-850 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-300 dark:focus:ring-zinc-300"
            disabled={submitting}
          />
        </div>
        <button
          type="submit"
          disabled={!newComment.trim() || submitting}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          {submitting ? "Posting..." : <><Send className="h-4 w-4" /> Post</>}
        </button>
      </form>

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              {comment.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-zinc-900 dark:text-zinc-50 text-sm">
                  @{comment.username}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
