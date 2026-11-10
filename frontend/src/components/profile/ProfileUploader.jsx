import { useState } from "react";
import api from "../../services/api";

const ProfileUploader = () => {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    // 1. Image selected hai ya nahi
    if (!image) {
      alert("Please select an image");
      return;
    }

    // 2. Token localStorage se lo
    const token = localStorage.getItem("token");

    // 3. Token nahi mila to dubara login karo
    if (!token) {
      alert("Please login again");
      return;
    }

    // 4. FormData banao for file upload to Cloudinary
    const formData = new FormData();
    formData.append("file", image);

    try {
      setLoading(true);

      // 5. Upload image to Cloudinary via POST /upload
      const uploadRes = await api.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const profilePicUrl = uploadRes.data?.url;
      if (!profilePicUrl) {
        throw new Error("Failed to get image URL from upload response");
      }

      // 6. Update user profile picture via PUT /users/profile
      const userRes = await api.put("/users/profile", {
        profilePic: profilePicUrl,
      });

      // 7. Existing user data lo
      const userData = localStorage.getItem("user");
      let existingUser = {};

      if (userData && userData !== "undefined") {
        try {
          existingUser = JSON.parse(userData);
        } catch {
          existingUser = {};
        }
      }

      // 8. Updated user save karo
      const updatedUser = {
        ...existingUser,
        profilePic: profilePicUrl,
        ...(userRes.data || {}),
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));

      alert("Profile picture updated successfully!");
      window.location.reload();
    } catch (error) {
      console.error(
        "Upload error:",
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message ||
          error.message ||
          "Upload failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files[0])}
      />

      <button
        type="button"
        onClick={handleUpload}
        disabled={loading}
        className="rounded-lg bg-[#00a884] px-6 py-3 font-semibold text-white disabled:opacity-50"
      >
        {loading ? "Uploading..." : "Upload Profile Picture"}
      </button>
    </div>
  );
};

export default ProfileUploader;