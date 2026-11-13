import { BookOpen, Compass, Heart, Map, MapPin, Mountain, Route, Users } from "lucide-react";

export const DISCOVER_NAV = [
  { href: "/explore", label: "Explore Vietnam", icon: Compass },
  { href: "/destinations", label: "Destinations", icon: MapPin },
  { href: "/experiences", label: "Experiences", icon: Mountain },
  { href: "/guide", label: "Travel Guide", icon: BookOpen },
  { href: "/map", label: "Maps", icon: Map },
] as const;

export const PLAN_NAV = [
  { href: "/wishlist", label: "My Wishlist", short: "Wishlist", icon: Heart },
  { href: "/trip", label: "My Trip", short: "Trip", icon: Route },
  { href: "/group", label: "Group Planner", short: "Group", icon: Users },
] as const;
