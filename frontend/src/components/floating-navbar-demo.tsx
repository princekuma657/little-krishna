"use client";
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FloatingNav } from "./ui/floating-navbar";
import { IconHome, IconMessage, IconUser } from "@tabler/icons-react";

export default function FloatingNavbarDemo() {
  const { user, status, signOut } = useAuth();
  const navigate = useNavigate();
  const isAdmin = Boolean(user?.roles?.some((r: string) => ['super_admin', 'content_manager', 'support_manager', 'analytics_viewer'].includes(r)));

  const navItems = [
    { name: "Home", link: "/", icon: <IconHome className="h-4 w-4" /> },
    { name: "Routes", link: "/routes", icon: <IconUser className="h-4 w-4" /> },
    { name: "Gallery", link: "/gallery", icon: <IconMessage className="h-4 w-4" /> },
    { name: "Community", link: "/community", icon: <IconMessage className="h-4 w-4" /> },
  ];

  const doSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      <FloatingNav navItems={navItems} />
      {/* Auth actions overlay */}
      <div className="fixed top-4 right-4 z-[5001] flex items-center gap-2">
        {status === 'loading' ? null : user ? (
          <>
            {isAdmin && (
              <Link to="/admin" className="rounded-full bg-neutral-900/80 px-4 py-2 text-sm font-medium text-white backdrop-blur-md hover:bg-neutral-800">
                Admin
              </Link>
            )}
            <Link to="/profile" className="rounded-full bg-neutral-900/80 px-4 py-2 text-sm font-medium text-white backdrop-blur-md hover:bg-neutral-800">
              @{user.username}
            </Link>
            <button
              className="rounded-full bg-[#282c20] px-4 py-2 text-sm font-medium text-[#d2ff00] backdrop-blur-md hover:bg-[#1a1d15]"
              onClick={() => void doSignOut()}
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="rounded-full bg-neutral-900/80 px-4 py-2 text-sm font-medium text-white backdrop-blur-md hover:bg-neutral-800">
              Sign In
            </Link>
            <Link to="/register" className="rounded-full bg-[#282c20] px-4 py-2 text-sm font-medium text-[#d2ff00] backdrop-blur-md hover:bg-[#1a1d15]">
              Join
            </Link>
          </>
        )}
      </div>
    </>
  );
}