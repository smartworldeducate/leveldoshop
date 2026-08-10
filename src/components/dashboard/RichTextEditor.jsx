import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
// TipTap 3 ships these as named exports; the default import silently resolved
// to undefined and the extension never loaded.
import { Color, TextStyle } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
} from "lucide-react";

function ToolButton({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
        active ? "bg-[#4267B2] text-white" : "text-slate-500 hover:bg-white hover:text-[#4267B2]"
      }`}
    >
      {children}
    </button>
  );
}

/** TipTap editor, styled with the dashboard's own surfaces (no admin CSS). */
export default function RichTextEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ horizontalRule: false }),
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    immediatelyRender: false, // Next.js SSR safe
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose-sm min-h-[220px] max-w-none px-4 py-3 text-sm leading-relaxed text-slate-700 focus:outline-none",
      },
    },
  });

  if (!editor) return null;

  const chain = () => editor.chain().focus();

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 bg-[#F6F8FC] px-2 py-1.5">
        <ToolButton title="Bold" active={editor.isActive("bold")} onClick={() => chain().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolButton>
        <ToolButton title="Italic" active={editor.isActive("italic")} onClick={() => chain().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolButton>

        <span className="mx-1 h-5 w-px bg-slate-200" />

        <ToolButton
          title="Heading 1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => chain().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          title="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => chain().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolButton>

        <span className="mx-1 h-5 w-px bg-slate-200" />

        <ToolButton title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => chain().setTextAlign("left").run()}>
          <AlignLeft className="h-4 w-4" />
        </ToolButton>
        <ToolButton title="Align centre" active={editor.isActive({ textAlign: "center" })} onClick={() => chain().setTextAlign("center").run()}>
          <AlignCenter className="h-4 w-4" />
        </ToolButton>
        <ToolButton title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => chain().setTextAlign("right").run()}>
          <AlignRight className="h-4 w-4" />
        </ToolButton>

        <span className="mx-1 h-5 w-px bg-slate-200" />

        <ToolButton title="Bullet list" active={editor.isActive("bulletList")} onClick={() => chain().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolButton>
        <ToolButton title="Numbered list" active={editor.isActive("orderedList")} onClick={() => chain().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
