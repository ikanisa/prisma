/**
 * ChatKit Widget Renderer
 * 
 * Renders ChatKit widgets based on widget type
 */

'use client';

import React from 'react';
import type {
  Widget,
  ButtonWidget,
  TextWidget,
  ImageWidget,
  FileWidget,
  FormWidget,
  CardWidget,
  TableWidget,
  ChartWidget,
  ListWidget,
  AccordionWidget,
  CalendarWidget,
  MapWidget,
  VideoWidget,
  AudioWidget,
  CodeWidget,
} from '@prisma/lib/openai/chatkit';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export interface WidgetRendererProps {
  widget: Widget;
  onAction?: (action: { type: string; callback?: string; data?: Record<string, unknown> }) => void;
}

export function WidgetRenderer({ widget, onAction }: WidgetRendererProps) {
  switch (widget.type) {
    case 'button':
      return <ButtonWidgetRenderer widget={widget} onAction={onAction} />;
    case 'text':
      return <TextWidgetRenderer widget={widget} />;
    case 'image':
      return <ImageWidgetRenderer widget={widget} />;
    case 'file':
      return <FileWidgetRenderer widget={widget} />;
    case 'form':
      return <FormWidgetRenderer widget={widget} onAction={onAction} />;
    case 'card':
      return <CardWidgetRenderer widget={widget} onAction={onAction} />;
    case 'table':
      return <TableWidgetRenderer widget={widget} />;
    case 'chart':
      return <ChartWidgetRenderer widget={widget} />;
    case 'list':
      return <ListWidgetRenderer widget={widget} onAction={onAction} />;
    case 'accordion':
      return <AccordionWidgetRenderer widget={widget} onAction={onAction} />;
    case 'calendar':
      return <CalendarWidgetRenderer widget={widget} onAction={onAction} />;
    case 'map':
      return <MapWidgetRenderer widget={widget} />;
    case 'video':
      return <VideoWidgetRenderer widget={widget} />;
    case 'audio':
      return <AudioWidgetRenderer widget={widget} />;
    case 'code':
      return <CodeWidgetRenderer widget={widget} />;
    default:
      return (
        <div className="rounded-lg border border-muted bg-muted/50 p-4 text-sm text-muted-foreground">
          Unknown widget type: {(widget as any).type}
        </div>
      );
  }
}

function ButtonWidgetRenderer({
  widget,
  onAction,
}: {
  widget: ButtonWidget;
  onAction?: WidgetRendererProps['onAction'];
}) {
  const handleClick = () => {
    if (widget.actions && widget.actions.length > 0) {
      widget.actions.forEach((action) => {
        if (action.type === 'callback' && onAction) {
          onAction(action);
        } else if (action.type === 'open_url' && action.url) {
          window.open(action.url, '_blank', 'noopener,noreferrer');
        } else if (action.type === 'navigate' && action.url) {
          window.location.href = action.url;
        }
      });
    }
  };

  const variantMap = {
    primary: 'default',
    secondary: 'secondary',
    danger: 'destructive',
    outline: 'outline',
  } as const;

  return (
    <Button
      variant={variantMap[widget.variant || 'primary']}
      disabled={widget.disabled || widget.loading}
      onClick={handleClick}
      className="w-full sm:w-auto"
    >
      {widget.loading ? 'Loading...' : widget.label}
    </Button>
  );
}

function TextWidgetRenderer({ widget }: { widget: TextWidget }) {
  if (widget.format === 'markdown') {
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown>{widget.content}</ReactMarkdown>
      </div>
    );
  }

  if (widget.format === 'html') {
    return (
      <div
        className="text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: widget.content }}
      />
    );
  }

  return <p className="text-sm leading-relaxed whitespace-pre-wrap">{widget.content}</p>;
}

function ImageWidgetRenderer({ widget }: { widget: ImageWidget }) {
  return (
    <div className="rounded-lg overflow-hidden border">
      <img
        src={widget.url}
        alt={widget.alt || widget.title || 'Image'}
        width={widget.width}
        height={widget.height}
        className="w-full h-auto"
        loading="lazy"
      />
    </div>
  );
}

function FileWidgetRenderer({ widget }: { widget: FileWidget }) {
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <Download className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{widget.filename}</p>
            {widget.size && <p className="text-xs text-muted-foreground">{formatFileSize(widget.size)}</p>}
            {widget.mimeType && <p className="text-xs text-muted-foreground">{widget.mimeType}</p>}
          </div>
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a href={widget.url} download={widget.filename} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4 mr-2" />
              Download
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FormWidgetRenderer({
  widget,
  onAction,
}: {
  widget: FormWidget;
  onAction?: WidgetRendererProps['onAction'];
}) {
  const [formData, setFormData] = React.useState<Record<string, string | number | boolean>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    // Initialize form data with default values
    const initialData: Record<string, string | number | boolean> = {};
    widget.fields.forEach((field) => {
      if (field.defaultValue !== undefined) {
        initialData[field.name] = field.defaultValue;
      }
    });
    setFormData(initialData);
  }, [widget.fields]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (widget.actions && widget.actions.length > 0) {
        for (const action of widget.actions) {
          if (action.type === 'submit' || action.type === 'callback') {
            if (onAction) {
              onAction({
                ...action,
                data: { ...action.data, ...formData },
              });
            }
          }
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (name: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Card>
      {widget.title && (
        <CardHeader>
          <CardTitle>{widget.title}</CardTitle>
          {widget.description && <CardDescription>{widget.description}</CardDescription>}
        </CardHeader>
      )}
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {widget.fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {field.type === 'textarea' ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  required={field.required}
                  placeholder={field.placeholder}
                  value={formData[field.name] as string || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              ) : field.type === 'select' ? (
                <select
                  id={field.name}
                  name={field.name}
                  required={field.required}
                  value={formData[field.name] as string || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {field.placeholder && <option value="">{field.placeholder}</option>}
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'checkbox' ? (
                <input
                  type="checkbox"
                  id={field.name}
                  name={field.name}
                  checked={formData[field.name] as boolean || false}
                  onChange={(e) => handleChange(field.name, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
              ) : (
                <Input
                  id={field.name}
                  name={field.name}
                  type={field.type}
                  required={field.required}
                  placeholder={field.placeholder}
                  value={formData[field.name] as string || ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                />
              )}
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Submitting...' : widget.submitLabel || 'Submit'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function CardWidgetRenderer({
  widget,
  onAction,
}: {
  widget: CardWidget;
  onAction?: WidgetRendererProps['onAction'];
}) {
  return (
    <Card>
      {widget.header && <CardHeader><CardTitle>{widget.header}</CardTitle></CardHeader>}
      <CardContent className="space-y-4">
        {widget.content.map((childWidget, index) => (
          <WidgetRenderer key={childWidget.id || index} widget={childWidget} onAction={onAction} />
        ))}
      </CardContent>
      {widget.footer && <CardFooter className="text-sm text-muted-foreground">{widget.footer}</CardFooter>}
    </Card>
  );
}

function TableWidgetRenderer({ widget }: { widget: TableWidget }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-muted">
            <tr>
              {widget.headers.map((header, index) => (
                <th key={index} className="border-b px-4 py-3 text-left text-sm font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {widget.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b hover:bg-muted/50">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 text-sm">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChartWidgetRenderer({ widget }: { widget: ChartWidget }) {
  // For a full implementation, you would use a charting library like recharts
  // This is a placeholder implementation
  return (
    <Card>
      {widget.title && (
        <CardHeader>
          <CardTitle>{widget.title}</CardTitle>
          {widget.description && <CardDescription>{widget.description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <div className="h-64 flex items-center justify-center text-muted-foreground border rounded-lg">
          Chart visualization for {widget.chartType} chart
          <br />
          <span className="text-xs">Install a charting library (e.g., recharts) for full implementation</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ListWidgetRenderer({
  widget,
  onAction,
}: {
  widget: ListWidget;
  onAction?: WidgetRendererProps['onAction'];
}) {
  const handleItemClick = (item: ListWidget['items'][0]) => {
    if (widget.selectable && onAction) {
      onAction({
        type: 'callback',
        callback: 'list_item_selected',
        data: { item },
      });
    }
  };

  return (
    <Card>
      {widget.title && (
        <CardHeader>
          <CardTitle>{widget.title}</CardTitle>
          {widget.description && <CardDescription>{widget.description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <div className={`space-y-2 ${widget.layout === 'horizontal' ? 'flex flex-wrap gap-2' : ''}`}>
          {widget.items.map((item, index) => (
            <div
              key={item.id || index}
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                widget.selectable ? 'cursor-pointer hover:bg-muted' : ''
              }`}
              onClick={() => handleItemClick(item)}
            >
              {item.image && (
                <img src={item.image} alt={item.title} className="h-10 w-10 rounded object-cover" />
              )}
              {item.icon && !item.image && (
                <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10">
                  <span className="text-lg">{item.icon}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                )}
              </div>
              {item.badge && (
                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AccordionWidgetRenderer({
  widget,
  onAction,
}: {
  widget: AccordionWidget;
  onAction?: WidgetRendererProps['onAction'];
}) {
  const [openItems, setOpenItems] = React.useState<Set<string>>(
    new Set(widget.items.filter((item) => item.defaultOpen).map((item) => item.id || ''))
  );

  const toggleItem = (itemId: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (widget.allowMultiple) {
        if (next.has(itemId)) {
          next.delete(itemId);
        } else {
          next.add(itemId);
        }
      } else {
        next.clear();
        if (!next.has(itemId)) {
          next.add(itemId);
        }
      }
      return next;
    });
  };

  return (
    <Card>
      {widget.title && (
        <CardHeader>
          <CardTitle>{widget.title}</CardTitle>
          {widget.description && <CardDescription>{widget.description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-2">
          {widget.items.map((item, index) => {
            const itemId = item.id || `item-${index}`;
            const isOpen = openItems.has(itemId);
            return (
              <div key={itemId} className="border rounded-lg">
                <button
                  type="button"
                  onClick={() => toggleItem(itemId)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium">{item.title}</span>
                  <span className="text-muted-foreground">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t">
                    {item.content.map((childWidget, childIndex) => (
                      <WidgetRenderer
                        key={childWidget.id || childIndex}
                        widget={childWidget}
                        onAction={onAction}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function CalendarWidgetRenderer({
  widget,
  onAction,
}: {
  widget: CalendarWidget;
  onAction?: WidgetRendererProps['onAction'];
}) {
  // Placeholder implementation - in production, use a calendar library
  return (
    <Card>
      {widget.title && (
        <CardHeader>
          <CardTitle>{widget.title}</CardTitle>
          {widget.description && <CardDescription>{widget.description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <div className="h-64 flex items-center justify-center text-muted-foreground border rounded-lg">
          Calendar widget
          <br />
          <span className="text-xs">Install a calendar library (e.g., react-calendar) for full implementation</span>
        </div>
      </CardContent>
    </Card>
  );
}

function MapWidgetRenderer({ widget }: { widget: MapWidget }) {
  // Placeholder implementation - in production, use a map library like Google Maps or Mapbox
  return (
    <Card>
      {widget.title && (
        <CardHeader>
          <CardTitle>{widget.title}</CardTitle>
          {widget.description && <CardDescription>{widget.description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <div className="h-64 flex items-center justify-center text-muted-foreground border rounded-lg">
          Map widget (center: {widget.center.lat}, {widget.center.lng})
          <br />
          <span className="text-xs">Install a map library (e.g., react-map-gl) for full implementation</span>
        </div>
      </CardContent>
    </Card>
  );
}

function VideoWidgetRenderer({ widget }: { widget: VideoWidget }) {
  return (
    <Card>
      {widget.title && (
        <CardHeader>
          <CardTitle>{widget.title}</CardTitle>
          {widget.description && <CardDescription>{widget.description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <div className="rounded-lg overflow-hidden border">
          <video
            src={widget.url}
            poster={widget.thumbnail}
            controls={widget.controls !== false}
            autoPlay={widget.autoplay}
            loop={widget.loop}
            muted={widget.muted}
            width={widget.width}
            height={widget.height}
            className="w-full h-auto"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </CardContent>
    </Card>
  );
}

function AudioWidgetRenderer({ widget }: { widget: AudioWidget }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          {widget.thumbnail && (
            <img src={widget.thumbnail} alt={widget.title || 'Audio'} className="h-16 w-16 rounded object-cover" />
          )}
          <div className="flex-1 min-w-0">
            {widget.title && <p className="text-sm font-medium truncate">{widget.title}</p>}
            {widget.artist && <p className="text-xs text-muted-foreground truncate">{widget.artist}</p>}
            <audio
              src={widget.url}
              controls={widget.controls !== false}
              autoPlay={widget.autoplay}
              loop={widget.loop}
              className="w-full mt-2"
            >
              Your browser does not support the audio tag.
            </audio>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CodeWidgetRenderer({ widget }: { widget: CodeWidget }) {
  // Placeholder implementation - in production, use a code highlighting library like Prism or highlight.js
  return (
    <Card>
      {widget.title && (
        <CardHeader>
          <CardTitle>{widget.title}</CardTitle>
          {widget.description && <CardDescription>{widget.description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <div
          className={`rounded-lg border p-4 font-mono text-sm overflow-x-auto ${
            widget.theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'
          }`}
        >
          <pre>
            <code>{widget.code}</code>
          </pre>
        </div>
        {widget.language && (
          <p className="text-xs text-muted-foreground mt-2">Language: {widget.language}</p>
        )}
      </CardContent>
    </Card>
  );
}
