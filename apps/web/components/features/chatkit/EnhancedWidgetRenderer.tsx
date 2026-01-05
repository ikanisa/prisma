/**
 * Enhanced ChatKit Widget Renderer
 * 
 * Complete implementation of all ChatKit widgets with animations and responsive design
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  WidgetComponent,
  Button,
  Text,
  Title,
  Caption,
  Markdown,
  Badge,
  Box,
  Row,
  Col,
  Form,
  Divider,
  Icon,
  Image,
  Input,
  Textarea,
  Select,
  DatePicker,
  Checkbox,
  RadioGroup,
  Label,
  Spacer,
  ListView,
  ListViewItem,
  Card,
  Chart,
  Transition,
} from '@prisma/lib/openai/chatkit/widgets-complete';
import { Button as UIButton } from '@/components/ui/button';
import { Input as UIInput } from '@/components/ui/input';
import { Textarea as UITextarea } from '@/components/ui/textarea';
import { Select as UISelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox as UICheckbox } from '@/components/ui/checkbox';
import { RadioGroup as UIRadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label as UILabel } from '@/components/ui/label';
import { Card as UICard, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge as UIBadge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { ChatKitIcon } from '@/lib/chatkit-icons';
import { StreamingText } from '@/components/ui/animated';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface EnhancedWidgetRendererProps {
  widget: WidgetComponent;
  onAction?: (action: { type: string; payload?: Record<string, unknown> }) => void;
  className?: string;
}

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export function EnhancedWidgetRenderer({ widget, onAction, className }: EnhancedWidgetRendererProps) {
  const renderWidget = (w: WidgetComponent): React.ReactNode => {
    switch (w.type) {
      case 'Button':
        return <ButtonWidget widget={w} onAction={onAction} />;
      case 'Text':
        return <TextWidget widget={w} />;
      case 'Title':
        return <TitleWidget widget={w} />;
      case 'Caption':
        return <CaptionWidget widget={w} />;
      case 'Markdown':
        return <MarkdownWidget widget={w} />;
      case 'Badge':
        return <BadgeWidget widget={w} />;
      case 'Box':
        return <BoxWidget widget={w} onAction={onAction} />;
      case 'Row':
        return <RowWidget widget={w} onAction={onAction} />;
      case 'Col':
        return <ColWidget widget={w} onAction={onAction} />;
      case 'Form':
        return <FormWidget widget={w} onAction={onAction} />;
      case 'Divider':
        return <DividerWidget widget={w} />;
      case 'Icon':
        return <IconWidget widget={w} />;
      case 'Image':
        return <ImageWidget widget={w} />;
      case 'Input':
        return <InputWidget widget={w} />;
      case 'Textarea':
        return <TextareaWidget widget={w} />;
      case 'Select':
        return <SelectWidget widget={w} onAction={onAction} />;
      case 'DatePicker':
        return <DatePickerWidget widget={w} onAction={onAction} />;
      case 'Checkbox':
        return <CheckboxWidget widget={w} onAction={onAction} />;
      case 'RadioGroup':
        return <RadioGroupWidget widget={w} onAction={onAction} />;
      case 'Label':
        return <LabelWidget widget={w} />;
      case 'Spacer':
        return <SpacerWidget widget={w} />;
      case 'ListView':
        return <ListViewWidget widget={w} onAction={onAction} />;
      case 'ListViewItem':
        return <ListViewItemWidget widget={w} onAction={onAction} />;
      case 'Card':
        return <CardWidget widget={w} onAction={onAction} />;
      case 'Chart':
        return <ChartWidget widget={w} />;
      case 'Transition':
        return <TransitionWidget widget={w} onAction={onAction} />;
      default:
        return (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Unknown widget type: {(widget as any).type}
          </div>
        );
    }
  };

  return (
    <motion.div
      {...fadeIn}
      transition={{ duration: 0.2 }}
      className={cn('w-full', className)}
    >
      {renderWidget(widget)}
    </motion.div>
  );
}

// ============================================================================
// INDIVIDUAL WIDGET COMPONENTS
// ============================================================================

function ButtonWidget({ widget, onAction }: { widget: Button; onAction?: EnhancedWidgetRendererProps['onAction'] }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (widget.disabled || loading) return;

    if (widget.onClickAction) {
      setLoading(true);
      try {
        if (onAction) {
          await onAction({
            type: widget.onClickAction.type,
            payload: widget.onClickAction.payload,
          });
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const sizeMap = {
    '3xs': 'h-[22px] px-2 text-xs',
    '2xs': 'h-[24px] px-2.5 text-xs',
    'xs': 'h-[26px] px-3 text-sm',
    'sm': 'h-[28px] px-3.5 text-sm',
    'md': 'h-[32px] px-4 text-sm',
    'lg': 'h-[36px] px-5 text-base',
    'xl': 'h-[40px] px-6 text-base',
    '2xl': 'h-[44px] px-7 text-lg',
    '3xl': 'h-[48px] px-8 text-lg',
  };

  const variantMap = {
    solid: widget.color === 'primary' ? 'bg-primary text-primary-foreground hover:bg-primary/90' :
           widget.color === 'secondary' ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' :
           widget.color === 'danger' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' :
           'bg-primary text-primary-foreground hover:bg-primary/90',
    soft: 'bg-primary/10 text-primary hover:bg-primary/20',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
  };

  return (
    <motion.div
      whileHover={{ scale: widget.disabled ? 1 : 1.02 }}
      whileTap={{ scale: widget.disabled ? 1 : 0.98 }}
    >
      <UIButton
        type={widget.submit ? 'submit' : 'button'}
        onClick={handleClick}
        disabled={widget.disabled || loading}
        className={cn(
          sizeMap[widget.size || 'lg'],
          variantMap[widget.variant || 'solid'],
          widget.pill && 'rounded-full',
          widget.uniform && 'aspect-square',
          widget.block && 'w-full',
          'transition-all duration-200'
        )}
      >
        {widget.iconStart && (
          <ChatKitIcon name={widget.iconStart} size={widget.iconSize === 'sm' ? 16 : widget.iconSize === 'lg' ? 24 : 20} className="mr-2" />
        )}
        {widget.label}
        {widget.iconEnd && (
          <ChatKitIcon name={widget.iconEnd} size={widget.iconSize === 'sm' ? 16 : widget.iconSize === 'lg' ? 24 : 20} className="ml-2" />
        )}
        {loading && <span className="ml-2 animate-spin">⟳</span>}
      </UIButton>
    </motion.div>
  );
}

function TextWidget({ widget }: { widget: Text }) {
  const sizeMap = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  const weightMap = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  if (widget.streaming) {
    return (
      <motion.p
        className={cn(
          sizeMap[widget.size || 'md'],
          weightMap[widget.weight || 'normal'],
          widget.italic && 'italic',
          widget.lineThrough && 'line-through',
          widget.truncate && 'truncate',
          widget.textAlign === 'center' && 'text-center',
          widget.textAlign === 'end' && 'text-right',
          'transition-all duration-200'
        )}
        style={{
          color: typeof widget.color === 'string' ? widget.color : undefined,
          width: widget.width,
          minHeight: widget.minLines ? `${widget.minLines * 1.5}em` : undefined,
          maxHeight: widget.maxLines ? `${widget.maxLines * 1.5}em` : undefined,
        }}
      >
        <StreamingText text={widget.value} streaming={widget.streaming} />
      </motion.p>
    );
  }

  return (
    <motion.p
      {...fadeIn}
      className={cn(
        sizeMap[widget.size || 'md'],
        weightMap[widget.weight || 'normal'],
        widget.italic && 'italic',
        widget.lineThrough && 'line-through',
        widget.truncate && 'truncate',
        widget.textAlign === 'center' && 'text-center',
        widget.textAlign === 'end' && 'text-right',
        'transition-all duration-200'
      )}
      style={{
        color: typeof widget.color === 'string' ? widget.color : undefined,
        width: widget.width,
        minHeight: widget.minLines ? `${widget.minLines * 1.5}em` : undefined,
        maxHeight: widget.maxLines ? `${widget.maxLines * 1.5}em` : undefined,
      }}
    >
      {widget.value}
    </motion.p>
  );
}

function TitleWidget({ widget }: { widget: Title }) {
  const sizeMap = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
    '2xl': 'text-4xl',
    '3xl': 'text-5xl',
    '4xl': 'text-6xl',
    '5xl': 'text-7xl',
  };

  return (
    <motion.h2
      {...fadeIn}
      className={cn(
        sizeMap[widget.size || 'md'],
        `font-${widget.weight || 'medium'}`,
        widget.textAlign === 'center' && 'text-center',
        widget.textAlign === 'end' && 'text-right',
        widget.truncate && 'truncate',
        'font-semibold'
      )}
    >
      {widget.value}
    </motion.h2>
  );
}

function CaptionWidget({ widget }: { widget: Caption }) {
  return (
    <motion.p
      {...fadeIn}
      className={cn(
        widget.size === 'sm' ? 'text-xs' : widget.size === 'lg' ? 'text-sm' : 'text-xs',
        `font-${widget.weight || 'normal'}`,
        'text-muted-foreground',
        widget.textAlign === 'center' && 'text-center',
        widget.textAlign === 'end' && 'text-right'
      )}
    >
      {widget.value}
    </motion.p>
  );
}

function MarkdownWidget({ widget }: { widget: Markdown }) {
  return (
    <motion.div
      {...(widget.streaming ? { animate: { opacity: [0.5, 1, 0.5] }, transition: { repeat: Infinity, duration: 1.5 } } : {})}
      className="prose prose-sm max-w-none dark:prose-invert"
    >
      <ReactMarkdown>{widget.value}</ReactMarkdown>
    </motion.div>
  );
}

function BadgeWidget({ widget }: { widget: Badge }) {
  const colorMap = {
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    discovery: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <UIBadge
      variant={widget.variant === 'outline' ? 'outline' : 'default'}
      className={cn(
        colorMap[widget.color || 'secondary'],
        widget.pill && 'rounded-full',
        widget.size === 'sm' && 'text-xs px-2 py-0.5',
        widget.size === 'lg' && 'text-sm px-3 py-1'
      )}
    >
      {widget.label}
    </UIBadge>
  );
}

function BoxWidget({ widget, onAction }: { widget: Box; onAction?: EnhancedWidgetRendererProps['onAction'] }) {
  return (
    <motion.div
      {...fadeIn}
      className={cn(
        'flex',
        widget.direction === 'row' ? 'flex-row' : 'flex-col',
        widget.align === 'center' && 'items-center',
        widget.align === 'end' && 'items-end',
        widget.align === 'start' && 'items-start',
        widget.justify === 'center' && 'justify-center',
        widget.justify === 'between' && 'justify-between',
        widget.justify === 'around' && 'justify-around',
        widget.justify === 'evenly' && 'justify-evenly',
        widget.wrap === 'wrap' && 'flex-wrap',
        widget.wrap === 'wrap-reverse' && 'flex-wrap-reverse',
        'gap-2',
        'transition-all duration-200'
      )}
      style={{
        gap: typeof widget.gap === 'number' ? `${widget.gap * 4}px` : widget.gap,
        padding: typeof widget.padding === 'number' ? `${widget.padding * 4}px` : widget.padding,
        margin: typeof widget.margin === 'number' ? `${widget.margin * 4}px` : widget.margin,
        width: widget.width,
        height: widget.height,
        minWidth: widget.minWidth,
        minHeight: widget.minHeight,
        maxWidth: widget.maxWidth,
        maxHeight: widget.maxHeight,
        borderRadius: widget.radius === 'full' ? '9999px' : widget.radius === 'md' ? '0.375rem' : undefined,
        background: typeof widget.background === 'string' ? widget.background : undefined,
      }}
    >
      {widget.children?.map((child, index) => (
        <EnhancedWidgetRenderer key={child.id || index} widget={child} onAction={onAction} />
      ))}
    </motion.div>
  );
}

function RowWidget({ widget, onAction }: { widget: Row; onAction?: EnhancedWidgetRendererProps['onAction'] }) {
  return <BoxWidget widget={{ ...widget, direction: 'row' } as Box} onAction={onAction} />;
}

function ColWidget({ widget, onAction }: { widget: Col; onAction?: EnhancedWidgetRendererProps['onAction'] }) {
  return <BoxWidget widget={{ ...widget, direction: 'col' } as Box} onAction={onAction} />;
}

function FormWidget({ widget, onAction }: { widget: Form; onAction?: EnhancedWidgetRendererProps['onAction'] }) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (widget.onSubmitAction && onAction) {
      await onAction({
        type: widget.onSubmitAction.type,
        payload: { ...widget.onSubmitAction.payload, ...formData },
      });
    }
  };

  return (
    <motion.form
      {...fadeIn}
      onSubmit={handleSubmit}
      className={cn(
        'flex',
        widget.direction === 'row' ? 'flex-row' : 'flex-col',
        'gap-4'
      )}
    >
      {widget.children?.map((child, index) => {
        // Handle form inputs
        if (child.type === 'Input' || child.type === 'Textarea' || child.type === 'Select') {
          return (
            <EnhancedWidgetRenderer
              key={child.id || index}
              widget={child}
              onAction={(action) => {
                if (action.payload && 'name' in child && child.name) {
                  setFormData((prev) => ({ ...prev, [child.name]: action.payload?.[child.name] }));
                }
                if (onAction) onAction(action);
              }}
            />
          );
        }
        return <EnhancedWidgetRenderer key={child.id || index} widget={child} onAction={onAction} />;
      })}
    </motion.form>
  );
}

function DividerWidget({ widget }: { widget: Divider }) {
  return (
    <motion.div
      {...fadeIn}
      className={cn(
        'border-t',
        widget.flush && '-mx-4',
        'my-4'
      )}
      style={{
        borderColor: typeof widget.color === 'string' ? widget.color : undefined,
        borderWidth: typeof widget.size === 'number' ? `${widget.size}px` : widget.size || '1px',
        marginTop: typeof widget.spacing === 'number' ? `${widget.spacing * 4}px` : widget.spacing,
        marginBottom: typeof widget.spacing === 'number' ? `${widget.spacing * 4}px` : widget.spacing,
      }}
    />
  );
}

function IconWidget({ widget }: { widget: Icon }) {
  const sizeMap = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
    '2xl': 40,
    '3xl': 48,
  };

  return (
    <motion.div
      {...scaleIn}
      className={cn(
        'inline-flex items-center justify-center',
        typeof widget.color === 'string' && `text-${widget.color}`
      )}
    >
      <ChatKitIcon 
        name={widget.name} 
        size={sizeMap[widget.size || 'md']}
        className={cn(
          typeof widget.color === 'string' && `text-${widget.color}`
        )}
      />
    </motion.div>
  );
}

function ImageWidget({ widget }: { widget: Image }) {
  return (
    <motion.img
      {...scaleIn}
      src={widget.src}
      alt={widget.alt || ''}
      className={cn(
        widget.fit === 'cover' && 'object-cover',
        widget.fit === 'contain' && 'object-contain',
        widget.fit === 'fill' && 'object-fill',
        widget.fit === 'scale-down' && 'object-scale-down',
        widget.frame && 'border border-border rounded-lg p-2',
        widget.flush && 'rounded-none',
        'transition-all duration-200'
      )}
      style={{
        width: widget.width,
        height: widget.height,
        borderRadius: widget.radius === 'full' ? '9999px' : widget.radius === 'md' ? '0.375rem' : undefined,
        objectPosition: widget.position,
      }}
    />
  );
}

function InputWidget({ widget }: { widget: Input }) {
  return (
    <motion.div {...fadeIn}>
      <UIInput
        type={widget.inputType || 'text'}
        name={widget.name}
        defaultValue={widget.defaultValue}
        placeholder={widget.placeholder}
        required={widget.required}
        disabled={widget.disabled}
        pattern={widget.pattern}
        autoFocus={widget.autoFocus}
        className={cn(
          widget.variant === 'soft' && 'bg-muted',
          widget.size === 'sm' && 'h-[28px]',
          widget.size === 'md' && 'h-[32px]',
          widget.size === 'lg' && 'h-[36px]',
          widget.pill && 'rounded-full'
        )}
      />
    </motion.div>
  );
}

function TextareaWidget({ widget }: { widget: Textarea }) {
  return (
    <motion.div {...fadeIn}>
      <UITextarea
        name={widget.name}
        defaultValue={widget.defaultValue}
        placeholder={widget.placeholder}
        required={widget.required}
        disabled={widget.disabled}
        rows={widget.rows || 3}
        autoFocus={widget.autoFocus}
        className={cn(
          widget.variant === 'soft' && 'bg-muted',
          widget.autoResize && 'resize-none'
        )}
      />
    </motion.div>
  );
}

function SelectWidget({ widget, onAction }: { widget: Select; onAction?: EnhancedWidgetRendererProps['onAction'] }) {
  return (
    <motion.div {...fadeIn}>
      <UISelect
        defaultValue={widget.defaultValue}
        disabled={widget.disabled}
        onValueChange={(value) => {
          if (widget.onChangeAction && onAction) {
            onAction({
              type: widget.onChangeAction.type,
              payload: { ...widget.onChangeAction.payload, [widget.name]: value },
            });
          }
        }}
      >
        <SelectTrigger className={cn(widget.block && 'w-full', widget.pill && 'rounded-full')}>
          <SelectValue placeholder={widget.placeholder} />
        </SelectTrigger>
        <SelectContent>
          {widget.options.map((option) => (
            <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
              {option.description && <span className="text-xs text-muted-foreground ml-2">{option.description}</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </UISelect>
    </motion.div>
  );
}

function DatePickerWidget({ widget, onAction }: { widget: DatePicker; onAction?: EnhancedWidgetRendererProps['onAction'] }) {
  return (
    <motion.div {...fadeIn}>
      <UIInput
        type="date"
        name={widget.name}
        defaultValue={widget.defaultValue}
        min={widget.min}
        max={widget.max}
        placeholder={widget.placeholder}
        disabled={widget.disabled}
        onChange={(e) => {
          if (widget.onChangeAction && onAction) {
            onAction({
              type: widget.onChangeAction.type,
              payload: { ...widget.onChangeAction.payload, [widget.name]: e.target.value },
            });
          }
        }}
        className={cn(widget.block && 'w-full', widget.pill && 'rounded-full')}
      />
    </motion.div>
  );
}

function CheckboxWidget({ widget, onAction }: { widget: Checkbox; onAction?: EnhancedWidgetRendererProps['onAction'] }) {
  return (
    <motion.div {...fadeIn} className="flex items-center space-x-2">
      <UICheckbox
        id={widget.name}
        name={widget.name}
        defaultChecked={widget.defaultChecked}
        disabled={widget.disabled}
        required={widget.required}
        onCheckedChange={(checked) => {
          if (widget.onChangeAction && onAction) {
            onAction({
              type: widget.onChangeAction.type,
              payload: { ...widget.onChangeAction.payload, [widget.name]: checked },
            });
          }
        }}
      />
      {widget.label && <UILabel htmlFor={widget.name}>{widget.label}</UILabel>}
    </motion.div>
  );
}

function RadioGroupWidget({ widget, onAction }: { widget: RadioGroup; onAction?: EnhancedWidgetRendererProps['onAction'] }) {
  return (
    <motion.div {...fadeIn}>
      <UIRadioGroup
        defaultValue={widget.defaultValue}
        disabled={widget.disabled}
        onValueChange={(value) => {
          if (widget.onChangeAction && onAction) {
            onAction({
              type: widget.onChangeAction.type,
              payload: { ...widget.onChangeAction.payload, [widget.name]: value },
            });
          }
        }}
        className={cn(widget.direction === 'col' ? 'flex-col' : 'flex-row', 'gap-4')}
      >
        {widget.options?.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem value={option.value} id={option.value} disabled={option.disabled} />
            <UILabel htmlFor={option.value}>{option.label}</UILabel>
          </div>
        ))}
      </UIRadioGroup>
    </motion.div>
  );
}

function LabelWidget({ widget }: { widget: Label }) {
  return (
    <UILabel
      htmlFor={widget.fieldName}
      className={cn(
        widget.size === 'xs' && 'text-xs',
        widget.size === 'sm' && 'text-sm',
        widget.size === 'md' && 'text-base',
        widget.size === 'lg' && 'text-lg',
        widget.size === 'xl' && 'text-xl',
        `font-${widget.weight || 'medium'}`,
        widget.textAlign === 'center' && 'text-center',
        widget.textAlign === 'end' && 'text-right'
      )}
    >
      {widget.value}
    </UILabel>
  );
}

function SpacerWidget({ widget }: { widget: Spacer }) {
  return (
    <div
      style={{
        minWidth: typeof widget.minSize === 'number' ? `${widget.minSize}px` : widget.minSize || 'auto',
        minHeight: typeof widget.minSize === 'number' ? `${widget.minSize}px` : widget.minSize || 'auto',
      }}
    />
  );
}

function ListViewWidget({ widget, onAction }: { widget: ListView; onAction?: EnhancedWidgetRendererProps['onAction'] }) {
  const items = widget.limit === 'auto' || !widget.limit
    ? widget.children
    : widget.children.slice(0, widget.limit);

  return (
    <motion.div {...fadeIn} className="space-y-2">
      {widget.status && (
        <div className="flex items-center gap-2 mb-4">
          {widget.status.icon && <span>{widget.status.icon}</span>}
          <span className="text-sm text-muted-foreground">{widget.status.text}</span>
        </div>
      )}
      {items.map((item, index) => (
        <EnhancedWidgetRenderer key={item.id || index} widget={item} onAction={onAction} />
      ))}
    </motion.div>
  );
}

function ListViewItemWidget({ widget, onAction }: { widget: ListViewItem; onAction?: EnhancedWidgetRendererProps['onAction'] }) {
  return (
    <motion.div
      {...fadeIn}
      onClick={() => {
        if (widget.onClickAction && onAction) {
          onAction({
            type: widget.onClickAction.type,
            payload: widget.onClickAction.payload,
          });
        }
      }}
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg border hover:bg-accent cursor-pointer transition-all duration-200',
        widget.align === 'center' && 'items-center',
        widget.align === 'end' && 'items-end',
        widget.align === 'start' && 'items-start'
      )}
      style={{
        gap: typeof widget.gap === 'number' ? `${widget.gap * 4}px` : widget.gap,
      }}
    >
      {widget.children.map((child, index) => (
        <EnhancedWidgetRenderer key={child.id || index} widget={child} onAction={onAction} />
      ))}
    </motion.div>
  );
}

function CardWidget({ widget, onAction }: { widget: Card; onAction?: EnhancedWidgetRendererProps['onAction'] }) {
  return (
    <motion.div {...scaleIn}>
      <UICard
        className={cn(
          widget.size === 'sm' && 'p-2',
          widget.size === 'md' && 'p-4',
          widget.size === 'lg' && 'p-6',
          widget.size === 'full' && 'w-full',
          widget.collapsed && 'opacity-50',
          widget.theme === 'dark' && 'bg-gray-900 text-gray-100'
        )}
      >
        {widget.status && (
          <div className="flex items-center gap-2 mb-4">
            {widget.status.icon && <span>{widget.status.icon}</span>}
            <span className="text-sm text-muted-foreground">{widget.status.text}</span>
          </div>
        )}
        <CardContent className={cn(widget.size === 'sm' && 'p-2', widget.size === 'md' && 'p-4', widget.size === 'lg' && 'p-6')}>
          {widget.children.map((child, index) => (
            <EnhancedWidgetRenderer key={child.id || index} widget={child} onAction={onAction} />
          ))}
        </CardContent>
        {(widget.confirm || widget.cancel) && (
          <CardFooter className="flex justify-end gap-2">
            {widget.cancel && (
              <UIButton variant="outline" onClick={() => {
                if (widget.cancel?.action && onAction) {
                  onAction({
                    type: widget.cancel.action.type,
                    payload: widget.cancel.action.payload,
                  });
                }
              }}>
                {widget.cancel.label}
              </UIButton>
            )}
            {widget.confirm && (
              <UIButton onClick={() => {
                if (widget.confirm?.action && onAction) {
                  onAction({
                    type: widget.confirm.action.type,
                    payload: widget.confirm.action.payload,
                  });
                }
              }}>
                {widget.confirm.label}
              </UIButton>
            )}
          </CardFooter>
        )}
      </UICard>
    </motion.div>
  );
}

function ChartWidget({ widget }: { widget: Chart }) {
  const [Recharts, setRecharts] = useState<any>(null);

  useEffect(() => {
    import('recharts').then((mod) => {
      setRecharts(mod);
    });
  }, []);

  if (!Recharts) {
    return (
      <motion.div
        {...scaleIn}
        className="h-64 flex items-center justify-center border rounded-lg"
      >
        <div className="text-center text-muted-foreground">
          <p>Loading chart...</p>
        </div>
      </motion.div>
    );
  }

  const {
    BarChart,
    Bar,
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
  } = Recharts;

  const xAxisKey = typeof widget.xAxis === 'string' ? widget.xAxis : widget.xAxis.dataKey;

  const renderChart = () => {
    const hasBar = widget.series.some(s => s.type === 'bar');
    const hasLine = widget.series.some(s => s.type === 'line');
    const hasArea = widget.series.some(s => s.type === 'area');

    if (hasBar) {
      return (
        <BarChart data={widget.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey={xAxisKey}
            hide={typeof widget.xAxis === 'object' && widget.xAxis.hide}
          />
          {widget.showYAxis && <YAxis />}
          {widget.showTooltip && <Tooltip />}
          {widget.showLegend && <Legend />}
          {widget.series.map((series, index) => {
            if (series.type === 'bar') {
              return (
                <Bar
                  key={series.dataKey}
                  dataKey={series.dataKey}
                  name={series.label || series.dataKey}
                  fill={typeof series.color === 'string' ? series.color : undefined}
                  stackId={series.stack}
                />
              );
            }
            return null;
          })}
        </BarChart>
      );
    }

    if (hasArea) {
      return (
        <AreaChart data={widget.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey={xAxisKey}
            hide={typeof widget.xAxis === 'object' && widget.xAxis.hide}
          />
          {widget.showYAxis && <YAxis />}
          {widget.showTooltip && <Tooltip />}
          {widget.showLegend && <Legend />}
          {widget.series.map((series) => {
            if (series.type === 'area') {
              return (
                <Area
                  key={series.dataKey}
                  type={series.curveType || 'natural'}
                  dataKey={series.dataKey}
                  name={series.label || series.dataKey}
                  fill={typeof series.color === 'string' ? series.color : undefined}
                  stackId={series.stack}
                />
              );
            }
            return null;
          })}
        </AreaChart>
      );
    }

    if (hasLine) {
      return (
        <LineChart data={widget.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey={xAxisKey}
            hide={typeof widget.xAxis === 'object' && widget.xAxis.hide}
          />
          {widget.showYAxis && <YAxis />}
          {widget.showTooltip && <Tooltip />}
          {widget.showLegend && <Legend />}
          {widget.series.map((series) => {
            if (series.type === 'line') {
              return (
                <Line
                  key={series.dataKey}
                  type={series.curveType || 'natural'}
                  dataKey={series.dataKey}
                  name={series.label || series.dataKey}
                  stroke={typeof series.color === 'string' ? series.color : undefined}
                />
              );
            }
            return null;
          })}
        </LineChart>
      );
    }

    return null;
  };

  return (
    <motion.div
      {...scaleIn}
      className="w-full"
      style={{
        height: widget.height || 240,
        width: widget.width,
        minHeight: widget.minHeight,
        minWidth: widget.minWidth,
        maxHeight: widget.maxHeight,
        maxWidth: widget.maxWidth,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </motion.div>
  );
}

function TransitionWidget({ widget, onAction }: { widget: Transition; onAction?: EnhancedWidgetRendererProps['onAction'] }) {
  return (
    <AnimatePresence mode="wait">
      {widget.children && (
        <motion.div
          key={widget.children.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <EnhancedWidgetRenderer widget={widget.children} onAction={onAction} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

