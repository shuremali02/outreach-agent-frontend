"use client";

import { useState } from "react";
import { useAddComment, useComments } from "@/hooks/use-problems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MentionField } from "@/components/common/mention-field";
import { useUsers } from "@/hooks/use-users";
import { extractMentions } from "@/lib/mentions";
import { commentTime } from "@/lib/format";
import { useStoredName } from "@/hooks/use-stored-name";
import { PROBLEM_FORM } from "@/lib/constants";

const AUTHOR_KEY = "elipse-author-name";

/** 💬 Team Discussion & Solutions — .comment-card list + a reply form. */
export function CommentThread({ problemId, count }: { problemId: number; count: number }) {
  const [open, setOpen] = useState(count > 0);
  const { data: comments = [] } = useComments(problemId, open);
  const add = useAddComment(problemId);
  const { data: users = [] } = useUsers();

  const [author, setAuthor] = useStoredName(AUTHOR_KEY, "Bilal");
  const [text, setText] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setAuthor(author);
    add.mutate(
      { author_name: author, comment_text: text, ...extractMentions(text, users) },
      { onSuccess: () => setText("") },
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer text-[0.82rem] font-semibold text-muted hover:text-accent"
      >
        💬 Team Discussion & Solutions ({count})
      </button>

      {open && (
        <div className="mt-2">
          {comments.map((c) => (
            <div key={c.id} className="comment-card">
              <span className="comment-author">👤 {c.author_name}</span>
              <span className="comment-time">{commentTime(c.created_at)}</span>
              <p className="comment-body">{c.comment_text}</p>
            </div>
          ))}

          <form onSubmit={submit} className="mt-2 grid grid-cols-[1.3fr_3fr] items-start gap-2">
            <Input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Your Name"
              aria-label="Your name"
              maxLength={120}
            />
            <div className="flex flex-col gap-2">
              <MentionField
                value={text}
                onChange={setText}
                rows={2}
                placeholder={PROBLEM_FORM.commentPlaceholder}
                aria-label="Comment"
                maxLength={5000}
              />
              <Button type="submit" variant="secondary" size="sm" loading={add.isPending} disabled={!text.trim()}>
                💬 Post Response
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
