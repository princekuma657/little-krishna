"use client";
import React from "react";
import { HeroParallax } from "./ui/hero-parallax";
import wap7Dusk from "../assets/showcase/wap7-dusk.jpg";
import wap4Platform from "../assets/showcase/wap4-platform.jpg";
import wdg4Sabarmati from "../assets/showcase/wdg4-sabarmati.jpg";
import icfFront from "../assets/showcase/icf-memu-front.jpg";
import freightCountryside from "../assets/showcase/freight-countryside.jpg";
import expressCorridor from "../assets/showcase/express-green-corridor.jpg";
import wap7Station from "../assets/showcase/wap7-station.jpg";
import homePhoto1 from "../assets/home/home-photo-1.jpg";
import homePhoto8 from "../assets/home/home-photo-8.jpeg";
import homePhoto9 from "../assets/home/home-photo-9.jpeg";
import homePhoto10 from "../assets/home/home-photo-10.jpeg";
import homePhoto11 from "../assets/home/home-photo-11.jpeg";
import homePhoto12 from "../assets/home/home-photo-12.jpeg";
import homePhoto2 from "../assets/home/home-photo-2.jpg";
import homePhoto3 from "../assets/home/home-photo-3.jpg";

const products = [
  { title: "Kolkata-Delhi Grand Chord", link: "/content/kolkata-delhi-grand-chord", thumbnail: wap7Dusk },
  { title: "Shatabdi Express", link: "/content/shatabdi-express", thumbnail: wap4Platform },
  { title: "WDM-3 Diesel", link: "/content/wdm3-diesel-locomotive", thumbnail: wdg4Sabarmati },
  { title: "Nilgiri Mountain", link: "/content/nilgiri-mountain-rack-set", thumbnail: icfFront },
  { title: "Mumbai Suburban", link: "/content/mumbai-suburban-project", thumbnail: freightCountryside },
  { title: "Deccan Queen", link: "/content/deccan-queen-heritage-set", thumbnail: expressCorridor },
  { title: "WAP-7 Electric", link: "/content/wap7-heritage-livery", thumbnail: wap7Station },
  { title: "Station Assets", link: "/content/station-asset-bundle", thumbnail: homePhoto1 },
  { title: "Western Ghats", link: "/content/western-ghats-dev-build", thumbnail: homePhoto8 },
  { title: "Railway Gallery", link: "/gallery", thumbnail: homePhoto9 },
  { title: "Route Maps", link: "/routes", thumbnail: homePhoto10 },
  { title: "Locomotives", link: "/trains", thumbnail: homePhoto11 },
  { title: "Community", link: "/community", thumbnail: homePhoto12 },
  { title: "Supporter Zone", link: "/supporter", thumbnail: homePhoto2 },
  { title: "Releases", link: "/releases", thumbnail: homePhoto3 },
];

export default function LKHeroParallax() {
  return <HeroParallax products={products} />;
}