import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppButtonProps {
  phoneNumber: string;
  message?: string;
  children?: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function WhatsAppButton({ 
  phoneNumber, 
  message = "Hi! I'm interested in this listing.", 
  children,
  variant = "default",
  size = "sm",
  className 
}: WhatsAppButtonProps) {
  const handleWhatsAppClick = () => {
    // Clean phone number (remove any non-digit characters except +)
    const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    // Open in new tab
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleWhatsAppClick}
      className={className}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      {children || "Chat on WhatsApp"}
    </Button>
  );
}