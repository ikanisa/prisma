/**
 * ChatKit Icon Mapping
 * 
 * Maps OpenAI ChatKit icon names to lucide-react icons
 */

import {
  Bot,
  BarChart3,
  Atom,
  Layers,
  Zap,
  BookOpen,
  Book,
  Clock,
  Bug,
  Calendar,
  TrendingUp,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Compass,
  PartyPopper,
  Box,
  Monitor,
  FileText,
  Circle,
  MoreHorizontal,
  MoreVertical,
  CircleDot,
  ExternalLink,
  Globe,
  Key,
  FlaskConical,
  Images,
  Info,
  LifeBuoy,
  Lightbulb,
  Mail,
  MapPin,
  Map,
  Smartphone,
  User,
  Notebook,
  Edit,
  File,
  Phone,
  Play,
  Plus,
  UserCircle,
  CreditCard,
  RotateCw,
  Star,
  Search,
  Sparkles,
  Code,
  Image as ImageIcon,
  Type,
  Briefcase,
  Sliders,
  // Wreath, // Not available in lucide-react
  PenTool,
  LucideIcon,
  // Note: Wreath is not available in lucide-react, using Circle as fallback
} from 'lucide-react';

export type ChatKitIconName =
  | "agent" | "analytics" | "atom" | "batch" | "bolt" | "book-open" | "book-closed"
  | "book-clock" | "bug" | "calendar" | "chart" | "check" | "check-circle"
  | "check-circle-filled" | "chevron-left" | "chevron-right" | "circle-question"
  | "compass" | "confetti" | "cube" | "desktop" | "document" | "dot"
  | "dots-horizontal" | "dots-vertical" | "empty-circle" | "external-link"
  | "globe" | "keys" | "lab" | "images" | "info" | "lifesaver" | "lightbulb"
  | "mail" | "map-pin" | "maps" | "mobile" | "name" | "notebook"
  | "notebook-pencil" | "page-blank" | "phone" | "play" | "plus" | "profile"
  | "profile-card" | "reload" | "star" | "star-filled" | "search" | "sparkle"
  | "sparkle-double" | "square-code" | "square-image" | "square-text"
  | "suitcase" | "settings-slider" | "user" | "wreath" | "write" | "write-alt"
  | "write-alt2";

const iconMap: Record<ChatKitIconName, LucideIcon> = {
  "agent": Bot,
  "analytics": BarChart3,
  "atom": Atom,
  "batch": Layers,
  "bolt": Zap,
  "book-open": BookOpen,
  "book-closed": Book,
  "book-clock": Clock,
  "bug": Bug,
  "calendar": Calendar,
  "chart": TrendingUp,
  "check": Check,
  "check-circle": CheckCircle2,
  "check-circle-filled": CheckCircle2,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "circle-question": HelpCircle,
  "compass": Compass,
  "confetti": PartyPopper,
  "cube": Box,
  "desktop": Monitor,
  "document": FileText,
  "dot": CircleDot,
  "dots-horizontal": MoreHorizontal,
  "dots-vertical": MoreVertical,
  "empty-circle": Circle,
  "external-link": ExternalLink,
  "globe": Globe,
  "keys": Key,
  "lab": FlaskConical,
  "images": Images,
  "info": Info,
  "lifesaver": LifeBuoy,
  "lightbulb": Lightbulb,
  "mail": Mail,
  "map-pin": MapPin,
  "maps": Map,
  "mobile": Smartphone,
  "name": User,
  "notebook": Notebook,
  "notebook-pencil": Edit,
  "page-blank": File,
  "phone": Phone,
  "play": Play,
  "plus": Plus,
  "profile": UserCircle,
  "profile-card": CreditCard,
  "reload": RotateCw,
  "star": Star,
  "star-filled": Star,
  "search": Search,
  "sparkle": Sparkles,
  "sparkle-double": Sparkles,
  "square-code": Code,
  "square-image": ImageIcon,
  "square-text": Type,
  "suitcase": Briefcase,
  "settings-slider": Sliders,
  "user": User,
  "wreath": Circle, // Wreath not available in lucide-react, using Circle as fallback
  "write": PenTool,
  "write-alt": Edit,
  "write-alt2": PenTool,
};

/**
 * Get lucide-react icon component from ChatKit icon name
 */
export function getChatKitIcon(name: ChatKitIconName): LucideIcon {
  return iconMap[name] || HelpCircle;
}

/**
 * Render a ChatKit icon component
 */
export function ChatKitIcon({ 
  name, 
  size = 20, 
  className 
}: { 
  name: ChatKitIconName; 
  size?: number; 
  className?: string;
}) {
  const IconComponent = getChatKitIcon(name);
  return <IconComponent size={size as number} className={className} />;
}

