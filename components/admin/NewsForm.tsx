import type { NewsPost } from "@prisma/client";

// Shared create/edit form for a news post. `action` is a server action.
export function NewsForm({
  action,
  post,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  post?: NewsPost;
  submitLabel: string;
}) {
  return (
    <form action={action} className="editor">
      {post && <input type="hidden" name="id" value={post.id} />}

      <div className="field">
        <label htmlFor="title">Title</label>
        <input className="input" id="title" name="title" defaultValue={post?.title ?? ""} required />
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="slug">Slug</label>
          <input className="input" id="slug" name="slug" defaultValue={post?.slug ?? ""} placeholder="auto from title" />
          <div className="field-hint">Public URL: /news/&lt;slug&gt;</div>
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select className="select" id="status" name="status" defaultValue={post?.status ?? "DRAFT"}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="excerpt">Excerpt</label>
        <input
          className="input"
          id="excerpt"
          name="excerpt"
          defaultValue={post?.excerpt ?? ""}
          placeholder="One-line summary shown in listings"
        />
      </div>

      <div className="field">
        <label htmlFor="heroImage">Hero image URL</label>
        <input className="input" id="heroImage" name="heroImage" defaultValue={post?.heroImage ?? ""} placeholder="https://…" />
      </div>

      <div className="field">
        <label htmlFor="bodyMd">Body</label>
        <textarea className="textarea" id="bodyMd" name="bodyMd" defaultValue={post?.bodyMd ?? ""} required />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
        <a href="/admin/news" className="btn-sec">
          Cancel
        </a>
      </div>
    </form>
  );
}
