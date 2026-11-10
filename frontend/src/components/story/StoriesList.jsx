import { useEffect, useState } from "react";
import api from "../../services/api";
import StoryViewer from "./StoryViewer";

const StoriesList = () => {
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const res = await api.get("/stories");
        setStories(res.data);
      } catch (error) {
        console.error("Error fetching stories:", error);
      }
    };

    fetchStories();
  }, []);

  const handleStorySeen = (storyId, userId) => {
    setStories((prev) =>
      prev.map((s) =>
        s._id === storyId
          ? { ...s, seenBy: [...(s.seenBy || []), userId] }
          : s
      )
    );
  };

  const currentUserId = (() => {
    try {
      const u = localStorage.getItem("user");
      return u && u !== "undefined" ? JSON.parse(u)?._id : null;
    } catch {
      return null;
    }
  })();

  if (stories.length === 0) {
    return null;
  }

  return (
    <>
      <div className="border-b border-[#2a3942] bg-[#111b21]">
        <div className="px-4 py-2 text-sm font-semibold text-[#8696a0]">
          Recent Stories
        </div>

        {stories.map((story) => {
          const isSeen = currentUserId && story.seenBy?.includes(currentUserId);

          return (
            <div
              key={story._id}
              onClick={() => setSelectedStory(story)}
              className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-[#202c33]"
            >
              <img
                src={
                  story.userId?.profilePic ||
                  story.userId?.image ||
                  "https://i.pravatar.cc/150?img=12"
                }
                alt={story.userId?.name}
                className={`h-12 w-12 rounded-full border-2 ${
                  isSeen ? "border-[#8696a0]" : "border-[#00a884]"
                } object-cover`}
              />

              <div>
                <p className="font-medium text-white">
                  {story.userId?.name || "Unknown User"}
                </p>
                <p className="text-xs text-[#8696a0]">
                  {isSeen ? "Viewed" : "View Story"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {selectedStory && (
        <StoryViewer
          story={selectedStory}
          stories={stories}
          onClose={() => setSelectedStory(null)}
          onStorySeen={handleStorySeen}
        />
      )}
    </>
  );
};

export default StoriesList;
