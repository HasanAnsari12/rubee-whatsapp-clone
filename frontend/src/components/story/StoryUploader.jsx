import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import api from "../../services/api";

const StoryUploader = () => {
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] =
    useState(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("media", selectedFile);
      formData.append("caption", caption);

      await api.post("/stories", formData, {
        headers: {
          "Content-Type":
            "multipart/form-data",
        },
      });

      // Reset
      setSelectedFile(null);
      setCaption("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      alert("Story uploaded successfully! 📸");
    } catch (error) {
      console.error(
        "Story upload error:",
        error
      );
      alert("Failed to upload story.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b border-[#2a3942] bg-[#202c33] p-4">
      <div className="mb-2 flex items-center gap-2">
        <Plus size={18} />
        <span className="font-medium">
          My Story
        </span>
      </div>

      {/* File Select */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={(e) =>
          setSelectedFile(
            e.target.files[0] || null
          )
        }
        className="mb-2 w-full text-sm text-white"
      />

      {/* Caption */}
      <input
        type="text"
        value={caption}
        onChange={(e) =>
          setCaption(e.target.value)
        }
        placeholder="Add a caption..."
        className="mb-2 w-full rounded bg-[#2a3942] px-3 py-2 text-white outline-none"
      />

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={
          !selectedFile || loading
        }
        className="w-full rounded bg-[#00a884] px-4 py-2 text-white disabled:opacity-50"
      >
        {loading
          ? "Uploading..."
          : "Upload Story"}
      </button>
    </div>
  );
};

export default StoryUploader;