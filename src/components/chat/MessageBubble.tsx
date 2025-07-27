import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Reply, 
  Copy, 
  Forward, 
  Trash, 
  Download,
  ExternalLink,
  Play,
  Pause,
  Volume2,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  phone_number: string;
  sender: string;
  message_text: string;
  message_type?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  model_used?: string;
  confidence_score?: number;
  created_at: string;
  status?: string;
  reply_to?: string;
  reactions?: Array<{
    emoji: string;
    user: string;
    timestamp: string;
  }>;
}

interface MessageBubbleProps {
  message: Message;
  isSelected?: boolean;
  onSelect?: () => void;
  onReply?: () => void;
  onReaction?: (emoji: string) => void;
  showAvatar?: boolean;
  previousMessage?: Message;
}

export function MessageBubble({ 
  message, 
  isSelected, 
  onSelect, 
  onReply, 
  onReaction,
  showAvatar = true,
  previousMessage 
}: MessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const isAgent = message.sender === 'agent';
  const isUser = message.sender === 'user';
  
  // Check if we should show avatar (first message in group or different sender)
  const shouldShowAvatar = showAvatar && (
    !previousMessage || 
    previousMessage.sender !== message.sender ||
    new Date(message.created_at).getTime() - new Date(previousMessage.created_at).getTime() > 300000 // 5 minutes
  );

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.message_text);
  };

  const handleForward = () => {
    // TODO: Implement message forwarding functionality
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('conversation_messages')
        .update({ status: 'deleted' })
        .eq('id', message.id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleDownload = () => {
    if (message.file_url) {
      window.open(message.file_url, '_blank');
    }
  };

  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  const renderMessageContent = () => {
    switch (message.message_type) {
      case 'image':
        return (
          <div className="space-y-2">
            {message.file_url && (
              <div className="relative rounded-lg overflow-hidden max-w-xs">
                <img 
                  src={message.file_url} 
                  alt={message.file_name || 'Image'}
                  className="w-full h-auto"
                  loading="lazy"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}
            {message.message_text && (
              <p className="text-sm">{message.message_text}</p>
            )}
          </div>
        );

      case 'file':
        return (
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 max-w-xs">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {message.file_name || 'Unknown file'}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(message.file_size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        );

      case 'audio':
        return (
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 max-w-xs">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <div className="flex-1">
              <div className="h-2 bg-muted rounded-full">
                <div className="h-2 bg-primary rounded-full w-1/3" />
              </div>
            </div>
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          </div>
        );

      case 'video':
        return (
          <div className="space-y-2">
            {message.file_url && (
              <div className="relative rounded-lg overflow-hidden max-w-xs">
                <video 
                  src={message.file_url}
                  className="w-full h-auto"
                  controls
                  preload="metadata"
                />
              </div>
            )}
            {message.message_text && (
              <p className="text-sm">{message.message_text}</p>
            )}
          </div>
        );

      default:
        return <p className="text-sm whitespace-pre-wrap">{message.message_text}</p>;
    }
  };

  const renderStatusIndicator = () => {
    if (!isUser) return null;
    
    switch (message.status) {
      case 'sending':
        return <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />;
      case 'sent':
        return <span className="text-xs text-muted-foreground">✓</span>;
      case 'delivered':
        return <span className="text-xs text-muted-foreground">✓✓</span>;
      case 'read':
        return <span className="text-xs text-blue-500">✓✓</span>;
      default:
        return null;
    }
  };

  return (
    <div className={cn(
      'flex gap-3 group',
      isAgent ? 'justify-start' : 'justify-end',
      isSelected && 'bg-muted/30 -mx-2 px-2 py-1 rounded'
    )}>
      {/* Avatar for agent messages */}
      {isAgent && shouldShowAvatar && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs">AI</AvatarFallback>
        </Avatar>
      )}
      {isAgent && !shouldShowAvatar && (
        <div className="w-8 flex-shrink-0" />
      )}

      <div className={cn(
        'max-w-[85%] space-y-1',
        isAgent ? 'items-start' : 'items-end flex flex-col'
      )}>
        {/* Reply indicator */}
        {message.reply_to && (
          <div className="text-xs text-muted-foreground px-3 py-1 bg-muted/50 rounded border-l-2 border-primary">
            <Reply className="inline h-3 w-3 mr-1" />
            Replying to previous message
          </div>
        )}

        {/* Message bubble */}
        <div 
          className={cn(
            'relative rounded-2xl px-4 py-2 shadow-sm cursor-pointer',
            isAgent 
              ? 'bg-muted text-foreground rounded-tl-md' 
              : 'bg-primary text-primary-foreground rounded-tr-md',
            message.status === 'sending' && 'opacity-70'
          )}
          onClick={onSelect}
          onDoubleClick={() => setShowReactions(!showReactions)}
        >
          {renderMessageContent()}

          {/* Message metadata */}
          <div className={cn(
            'flex items-center gap-2 mt-1',
            isAgent ? 'justify-start' : 'justify-end'
          )}>
            <span className="text-xs opacity-70">
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: false })}
            </span>
            
            {isAgent && message.model_used && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                {message.model_used}
              </Badge>
            )}
            
            {isAgent && message.confidence_score && (
              <span className="text-xs opacity-70">
                {Math.round(message.confidence_score * 100)}%
              </span>
            )}

            {renderStatusIndicator()}
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {message.reactions.map((reaction, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                >
                  {reaction.emoji}
                </Button>
              ))}
            </div>
          )}

          {/* Message actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute -top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                  isAgent ? "-right-8" : "-left-8"
                )}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {onReply && (
                <DropdownMenuItem onClick={onReply}>
                  <Reply className="h-4 w-4 mr-2" />
                  Reply
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleForward}>
                <Forward className="h-4 w-4 mr-2" />
                Forward
              </DropdownMenuItem>
              {message.file_url && (
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Quick reactions */}
        {showReactions && onReaction && (
          <div className="flex gap-1 bg-background border rounded-full p-1 shadow-lg animate-scale-in">
            {quickReactions.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  onReaction(emoji);
                  setShowReactions(false);
                }}
              >
                {emoji}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Avatar for user messages */}
      {isUser && shouldShowAvatar && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs">U</AvatarFallback>
        </Avatar>
      )}
      {isUser && !shouldShowAvatar && (
        <div className="w-8 flex-shrink-0" />
      )}
    </div>
  );
}