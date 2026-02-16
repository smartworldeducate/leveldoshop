import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";

export default function RichTextEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [
       StarterKit.configure({
      horizontalRule: false, 
    }),
      TextStyle,           
      Color.configure({ types: ["textStyle"] }), // ✅ color
      TextAlign.configure({ types: ["heading", "paragraph"] }), // ✅ alignment
    ],
    content: value || "",
    immediatelyRender: false, // ✅ Next.js SSR safe
    autofocus: true,          // ✅ allows typing/pasting immediately
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  return (
    <div className="editor-wrapper">
        <div className="editor-toolbar">
  <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
  <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}>I</button>
  <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</button>
  <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
  {/* <input
    type="color"
    onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
  /> */}
  <button type="button" onClick={() => editor.chain().focus().setTextAlign("left").run()}>Left</button>
  <button type="button" onClick={() => editor.chain().focus().setTextAlign("center").run()}>Center</button>
  <button type="button" onClick={() => editor.chain().focus().setTextAlign("right").run()}>Right</button>
  <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
  <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</button>
</div>

      <EditorContent
        editor={editor}
        className="editor-content"
        style={{ minHeight: "200px", userSelect: "text" }} // allows paste
      />
    </div>
  );
}
