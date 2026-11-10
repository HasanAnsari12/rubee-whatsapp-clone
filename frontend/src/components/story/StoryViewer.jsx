import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../../services/api";

const StoryViewer = ({ story, stories = [], onClose, onStorySeen }) => {
  // Find initial index
  const initialIndex = stories.findIndex((s) => s._id === story?._id);
  const [currentIndex, setCurrentIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const videoRef = useRef(null);
  const currentStory = stories[currentIndex] || story;

  const handleNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  // Mark current story as seen
  useEffect(() => {
    if (!currentStory?._id) return;

    const markStorySeen = async () => {
      try {
        const userData = localStorage.getItem("user");
        const currentUserId =
          userData && userData !== "undefined"
            ? JSON.parse(userData)?._id
            : null;

        if (
          currentUserId &&
          (!currentStory.seenBy || !currentStory.seenBy.includes(currentUserId))
        ) {
          await api.put(`/stories/${currentStory._id}/seen`);
          if (onStorySeen) {
            onStorySeen(currentStory._id, currentUserId);
          }
        }
      } catch (error) {
        console.error("Mark story seen error:", error);
      }
    };

    markStorySeen();
  }, [currentStory, onStorySeen]);

  // Timer / Progress bar for images
  useEffect(() => {
    if (!currentStory) return;
    if (currentStory.mediaType?.startsWith("video/")) {
      // Videos manage progress via timeUpdate
      return;
    }

    if (isPaused) return;

    const intervalTime = 50; // update every 50ms
    const totalDuration = 5000; // 5 seconds per image
    const step = (intervalTime / totalDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [currentStory, isPaused, handleNext]);

  // Handle Video progress
  const handleVideoTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      setProgress((current / total) * 100);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  if (!currentStory) return null;

  const isVideo = currentStory.mediaType?.startsWith("video/");

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 p-4 select-none"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Top Section: Progress Bars & User Header */}
      <div className="w-full max-w-md">
        {/* Progress Bars */}
        <div className="flex w-full gap-1.5 pt-2">
          {stories.map((s, idx) => (
            <div
              key={s._id || idx}
              className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"
            >
              <div
                className="h-full bg-white transition-all duration-75 ease-linear"
                style={{
                  width:
                    idx < currentIndex
                      ? "100%"
                      : idx === currentIndex
                      ? `${progress}%`
                      : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* User Info Header */}
        <div className="flex items-center justify-between py-3 text-white">
          <div className="flex items-center gap-3">
            <img
              src={
                currentStory.userId?.profilePic ||
                currentStory.userId?.image ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  currentStory.userId?.name || "User"
                )}&background=00a884&color=fff`
              }
              alt={currentStory.userId?.name || "User"}
              className="h-10 w-10 rounded-full border border-white/30 object-cover"
            />
            <div>
              <p className="font-semibold text-sm leading-tight text-white">
                {currentStory.userId?.name || "Unknown User"}
              </p>
              <p className="text-xs text-white/70">
                {currentStory.createdAt
                  ? new Date(currentStory.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Recently"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Media Display Area */}
      <div className="relative flex max-h-[75vh] w-full max-w-md flex-1 items-center justify-center">
        {/* Navigation Chevrons */}
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white/80 transition hover:bg-black/80 hover:text-white"
            aria-label="Previous"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        {currentIndex < stories.length - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white/80 transition hover:bg-black/80 hover:text-white"
            aria-label="Next"
          >
            <ChevronRight size={28} />
          </button>
        )}

        {/* Media (Image or Video) */}
        {isVideo ? (
          <video
            ref={videoRef}
            src={currentStory.mediaUrl}
            autoPlay
            playsInline
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={handleNext}
            className="max-h-[72vh] max-w-full rounded-2xl object-contain shadow-2xl"
          />
        ) : (
          <img
            src={currentStory.mediaUrl}
            alt={currentStory.caption || "Story"}
            className="max-h-[72vh] max-w-full rounded-2xl object-contain shadow-2xl"
          />
        )}
      </div>

      {/* Bottom Caption Area */}
      <div className="w-full max-w-md pb-4 text-center">
        {currentStory.caption ? (
          <p className="inline-block rounded-xl bg-black/60 px-4 py-2 text-sm text-white backdrop-blur-sm">
            {currentStory.caption}
          </p>
        ) : (
          <div className="h-6" />
        )}
      </div>
    </div>
  );
};

export default StoryViewer;
