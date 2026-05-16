"use client";

import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

type Props = {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  maxLength?: number;
  onChange?: (html: string) => void;
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
        active
          ? "bg-[#D4450A] text-white"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      } disabled:opacity-30`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  name,
  defaultValue = "",
  placeholder = "Write a description...",
  maxLength = 2000,
  onChange,
}: Props) {
  const [html, setHtml] = useState(defaultValue);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bulletList: {},
        orderedList: {},
        bold: {},
        italic: {},
        strike: {},
        blockquote: {},
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      CharacterCount.configure({ limit: maxLength }),
    ],
    content: defaultValue,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "tiptap tiptap-content min-h-[180px] max-w-none px-4 py-3 text-sm text-zinc-700 focus:outline-none",
      },
    },
    onCreate: ({ editor }) => {
      setHtml(editor.getHTML());
    },
    onUpdate: ({ editor }) => {
      const newHtml = editor.getHTML();
      setHtml(newHtml);
      onChange?.(newHtml);
    },
  });

  useEffect(() => {
    if (editor && defaultValue && editor.getHTML() !== defaultValue) {
      editor.commands.setContent(defaultValue, { emitUpdate: false });
    }
  }, [defaultValue, editor]);

  const charCount = editor?.storage.characterCount?.characters() ?? 0;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 transition-colors focus-within:border-[#D4450A] focus-within:bg-white">
      <input type="hidden" name={name} value={html} />

      <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 bg-white px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive("bold")}
            title="Bold"
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive("italic")}
            title="Italic"
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            active={editor?.isActive("underline")}
            title="Underline"
          >
            <span style={{ textDecoration: "underline" }}>U</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            active={editor?.isActive("strike")}
            title="Strikethrough"
          >
            <span style={{ textDecoration: "line-through" }}>S</span>
          </ToolbarButton>
        </div>

        <div className="mx-1.5 h-4 w-px bg-zinc-200" />

        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor?.isActive("heading", { level: 2 })}
            title="Heading"
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor?.isActive("heading", { level: 3 })}
            title="Subheading"
          >
            H3
          </ToolbarButton>
        </div>

        <div className="mx-1.5 h-4 w-px bg-zinc-200" />

        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={editor?.isActive("bulletList")}
            title="Bullet list"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="9" y1="6" x2="20" y2="6" />
              <line x1="9" y1="12" x2="20" y2="12" />
              <line x1="9" y1="18" x2="20" y2="18" />
              <circle cx="4" cy="6" r="1" fill="currentColor" />
              <circle cx="4" cy="12" r="1" fill="currentColor" />
              <circle cx="4" cy="18" r="1" fill="currentColor" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            active={editor?.isActive("orderedList")}
            title="Numbered list"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="10" y1="6" x2="21" y2="6" />
              <line x1="10" y1="12" x2="21" y2="12" />
              <line x1="10" y1="18" x2="21" y2="18" />
              <path d="M4 6h1v4" />
              <path d="M4 10h2" />
              <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
            </svg>
          </ToolbarButton>
        </div>

        <div className="mx-1.5 h-4 w-px bg-zinc-200" />

        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor?.chain().focus().setTextAlign("left").run()}
            active={editor?.isActive({ textAlign: "left" })}
            title="Align left"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="15" y2="12" />
              <line x1="3" y1="18" x2="18" y2="18" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor?.chain().focus().setTextAlign("center").run()}
            active={editor?.isActive({ textAlign: "center" })}
            title="Align center"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="6" y1="12" x2="18" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </ToolbarButton>
        </div>

        <div className="mx-1.5 h-4 w-px bg-zinc-200" />

        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          active={editor?.isActive("blockquote")}
          title="Blockquote"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
          </svg>
        </ToolbarButton>

        <div className="mx-1.5 h-4 w-px bg-zinc-200" />
        <ToolbarButton
          onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
          title="Clear formatting"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />

      <div className="flex items-center justify-between border-t border-zinc-100 px-3 py-1.5">
        <p className="text-[10px] text-zinc-400">
          Tip: Use headings and bullet points to make your description easier to read
        </p>
        <p
          className={`text-[10px] font-medium ${
            charCount > maxLength * 0.9 ? "text-amber-500" : "text-zinc-400"
          }`}
        >
          {charCount}/{maxLength}
        </p>
      </div>
    </div>
  );
}
