"use client";
import React from "react";
import { FloatingNav } from "./ui/floating-navbar";
import { IconHome, IconMessage, IconUser } from "@tabler/icons-react";

export default function FloatingNavbarDemo() {
  const navItems = [
    { name: "Home", link: "/", icon: <IconHome className="h-4 w-4" /> },
    { name: "About", link: "/about", icon: <IconUser className="h-4 w-4" /> },
    { name: "Contact", link: "/contact", icon: <IconMessage className="h-4 w-4" /> },
  ];
  return <FloatingNav navItems={navItems} />;
}