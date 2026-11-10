// =========================
// frontend/src/pages/Home.jsx
// =========================

import { useEffect, useState } from "react";
import Sidebar from "../components/sidebar/Sidebar";
import EmptyChat from "../components/chat/EmptyChat";
import ChatWindow from "../components/chat/ChatWindow";
import AIChatWindow from "../components/chat/AIChatWindow";
import GroupChatWindow from "../components/chat/GroupChatWindow";
import socket from "../services/socket";
import ProfileUploader from "../components/profile/ProfileUploader";
import StoryUploader from "../components/story/StoryUploader";
import StoriesList from "../components/story/StoriesList";

const Home = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Listen for online users from Socket.IO
  useEffect(() => {
    const handleOnlineUsers = (users) => {
      console.log("Online Users:", users);
      setOnlineUsers(users);
    };

    socket.on("onlineUsers", handleOnlineUsers);

    // Cleanup
    return () => {
      socket.off("onlineUsers", handleOnlineUsers);
    };
  }, []);

  return (
    <div className="h-screen bg-[#0f0a14] p-3">
      {/* Profile Upload Section (Temporary Testing) */}
      <ProfileUploader />

      <div className="flex h-full overflow-hidden rounded-3xl border border-[#2d1525] shadow-[0_0_60px_rgba(230,62,109,0.15)]">
        {/* Sidebar */}
        <div className={`${selectedUser ? "hidden md:flex" : "flex"} w-full md:w-[30%] lg:w-[28%] flex-col h-full`}>
          <StoryUploader />
          <StoriesList />

          <Sidebar
            selectedUser={selectedUser}
            setSelectedUser={setSelectedUser}
            onlineUsers={onlineUsers}
          />
        </div>

        {/* Chat Area */}
        <div className={`${selectedUser ? "flex" : "hidden md:flex"} flex-1 h-full`}>
          {selectedUser ? (
            selectedUser.isAI ? (
              <AIChatWindow onBack={() => setSelectedUser(null)} />
            ) : selectedUser.isGroup ? (
              <GroupChatWindow
                group={selectedUser}
                onBack={() => setSelectedUser(null)}
              />
            ) : (
              <ChatWindow
                selectedUser={selectedUser}
                onlineUsers={onlineUsers}
                onBack={() => setSelectedUser(null)}
              />
            )
          ) : (
            <EmptyChat />
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;